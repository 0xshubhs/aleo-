/**
 * GET /api/auctions/revealed?auction_id=123field
 *
 * Scans on-chain transactions for reveal_bid transitions belonging to a
 * specific auction. Returns all revealed bids with amounts and bidder
 * addresses. Results are cached server-side per auction.
 *
 * The reveal_bid future has these public inputs:
 *   r0: auction_id (field)
 *   r1: commitment (field)
 *   r2: amount (u64)
 *   r3: bid_key (field)
 *   r4: bidder (address)
 */

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const API_BASE = (
  process.env.ALEO_API_BASE || "https://api.explorer.provable.com/v1/testnet"
).replace(/\/+$/, "")
const PROGRAM_ID =
  process.env.NEXT_PUBLIC_SILENTBID_PROGRAM_ID || "silentbid_v2.aleo"

const CACHE_DIR = path.join(process.cwd(), "data", "revealed-cache")

export interface RevealedBid {
  bidder: string
  amount: number
  tx_id: string
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true })
}

function cacheFile(auctionId: string): string {
  const safe = auctionId.replace(/[^a-zA-Z0-9_]/g, "_")
  return path.join(CACHE_DIR, `${safe}.json`)
}

interface CacheData {
  bids: RevealedBid[]
  lastScannedBlock: number
  updatedAt: number
}

async function readCache(auctionId: string): Promise<CacheData> {
  try {
    const raw = await fs.readFile(cacheFile(auctionId), "utf-8")
    return JSON.parse(raw) as CacheData
  } catch {
    return { bids: [], lastScannedBlock: 0, updatedAt: 0 }
  }
}

async function writeCache(auctionId: string, data: CacheData) {
  await ensureCacheDir()
  await fs.writeFile(cacheFile(auctionId), JSON.stringify(data))
}

async function getLatestHeight(): Promise<number> {
  const res = await fetch(`${API_BASE}/block/height/latest`, {
    cache: "no-store",
  })
  return parseInt(await res.text(), 10) || 0
}

async function getMappingValue(
  mapping: string,
  key: string
): Promise<string | null> {
  const url = `${API_BASE}/program/${PROGRAM_ID}/mapping/${mapping}/${encodeURIComponent(key)}`
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) return null
  const text = await res.text()
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed)
  } catch {
    return text.trim() || null
  }
}

function parseAuctionEndBlock(raw: string): number {
  const m = raw.match(/end_block\s*:\s*(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

interface BlockTx {
  transaction?: {
    id?: string
    execution?: {
      transitions?: Array<{
        program?: string
        function?: string
        outputs?: Array<{ type?: string; value?: string }>
      }>
    }
  }
}

function extractRevealedBids(
  blocks: Array<{ transactions?: BlockTx[] }>,
  auctionId: string
): RevealedBid[] {
  const bids: RevealedBid[] = []
  for (const block of blocks) {
    for (const tw of block.transactions ?? []) {
      const tx = tw.transaction ?? tw
      const txObj = tx as {
        id?: string
        execution?: {
          transitions?: Array<{
            program?: string
            function?: string
            outputs?: Array<{ type?: string; value?: string }>
          }>
        }
      }
      const transitions = txObj.execution?.transitions ?? []
      for (const t of transitions) {
        if (t.program === PROGRAM_ID && t.function === "reveal_bid") {
          const future = t.outputs?.find((o) => o.type === "future")
          if (!future?.value) continue
          // Parse future arguments: [auction_id, commitment, amount, bid_key, bidder]
          const argsMatch = future.value.match(
            /arguments:\s*\[([^\]]+)\]/
          )
          if (!argsMatch) continue
          const args = argsMatch[1].split(",").map((s) => s.trim())
          if (args.length < 5) continue
          const revealAuctionId = args[0]
          if (revealAuctionId !== auctionId) continue
          const amount = parseInt(
            args[2].replace(/u64$/, ""),
            10
          )
          const bidder = args[4]
          bids.push({
            bidder,
            amount,
            tx_id: txObj.id || "",
          })
        }
      }
    }
  }
  return bids
}

export async function GET(req: NextRequest) {
  const auctionId = req.nextUrl.searchParams.get("auction_id")
  if (!auctionId) {
    return NextResponse.json(
      { error: "auction_id query param required" },
      { status: 400 }
    )
  }

  const cache = await readCache(auctionId)

  // If cache is fresh (< 30s old), return it immediately
  if (cache.updatedAt && Date.now() - cache.updatedAt < 30_000) {
    return NextResponse.json({
      bids: cache.bids,
      cached: true,
    })
  }

  try {
    // Get auction info to know the end_block (reveals start after end_block)
    const auctionRaw = await getMappingValue("auctions", auctionId)
    if (!auctionRaw) {
      return NextResponse.json({ bids: [], error: "Auction not found" })
    }

    const endBlock = parseAuctionEndBlock(auctionRaw)
    const latest = await getLatestHeight()

    // Start scanning from end_block (reveals can only happen after)
    const startFrom = Math.max(
      cache.lastScannedBlock + 1,
      endBlock > 0 ? endBlock : 0
    )

    if (startFrom > latest) {
      return NextResponse.json({ bids: cache.bids, cached: true })
    }

    const CHUNK = 50
    const MAX_CHUNKS = 40 // 2000 blocks max per request
    const newBids: RevealedBid[] = []
    let cursor = startFrom

    for (let i = 0; i < MAX_CHUNKS && cursor <= latest; i++) {
      const end = Math.min(cursor + CHUNK - 1, latest)
      try {
        const res = await fetch(
          `${API_BASE}/blocks?start=${cursor}&end=${end}`,
          { headers: { Accept: "application/json" }, cache: "no-store" }
        )
        if (res.ok) {
          const blocks = await res.json()
          newBids.push(...extractRevealedBids(blocks, auctionId))
        }
      } catch {
        // skip failed chunk
      }
      cursor = end + 1
      if (i < MAX_CHUNKS - 1 && cursor <= latest) {
        await new Promise((r) => setTimeout(r, 220))
      }
    }

    // Merge with existing cache, deduplicate by bidder
    const allBids = [...cache.bids]
    for (const bid of newBids) {
      if (!allBids.some((b) => b.bidder === bid.bidder)) {
        allBids.push(bid)
      }
    }

    // Sort by amount descending
    allBids.sort((a, b) => b.amount - a.amount)

    const newCache: CacheData = {
      bids: allBids,
      lastScannedBlock: Math.min(cursor - 1, latest),
      updatedAt: Date.now(),
    }
    await writeCache(auctionId, newCache)

    return NextResponse.json({
      bids: allBids,
      cached: false,
      scannedTo: newCache.lastScannedBlock,
    })
  } catch (err) {
    // On error, return cached data if available
    if (cache.bids.length > 0) {
      return NextResponse.json({ bids: cache.bids, cached: true })
    }
    return NextResponse.json(
      { bids: [], error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    )
  }
}
