/**
 * Auction Registry API
 *
 * GET  /api/auctions          → returns all known auction IDs + on-chain data
 * POST /api/auctions          → register a new auction ID  { id: "123field" }
 *
 * Discovery strategy:
 *   1. Maintain a server-side JSON file of known auction IDs
 *   2. On GET, also scan recent blocks for new create_auction transitions
 *   3. On POST (after create_auction tx confirms), persist the new ID
 *   4. For each known ID, fetch on-chain mapping data and return enriched list
 */

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const REGISTRY_PATH = path.join(process.cwd(), "data", "auction-registry.json")
const SCAN_STATE_PATH = path.join(process.cwd(), "data", "scan-state.json")

const PROGRAM_ID = process.env.NEXT_PUBLIC_SILENTBID_PROGRAM_ID || "silentbid_v2.aleo"
const API_BASE = (process.env.ALEO_API_BASE || "https://api.explorer.provable.com/v1/testnet")
  .replace(/\/+$/, "")

// Deploy block for silentbid_v2.aleo — skip everything before this
const DEPLOY_BLOCK = 15697543

interface ScanState {
  lastScannedBlock: number
}

// ─── Helpers ────────────────────────────────────────────────────────

async function ensureDataDir() {
  const dir = path.dirname(REGISTRY_PATH)
  await fs.mkdir(dir, { recursive: true })
}

async function readRegistry(): Promise<string[]> {
  try {
    const raw = await fs.readFile(REGISTRY_PATH, "utf-8")
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function writeRegistry(ids: string[]) {
  await ensureDataDir()
  const unique = [...new Set(ids)]
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(unique, null, 2))
}

async function readScanState(): Promise<ScanState> {
  try {
    const raw = await fs.readFile(SCAN_STATE_PATH, "utf-8")
    return JSON.parse(raw) as ScanState
  } catch {
    return { lastScannedBlock: DEPLOY_BLOCK }
  }
}

async function writeScanState(state: ScanState) {
  await ensureDataDir()
  await fs.writeFile(SCAN_STATE_PATH, JSON.stringify(state))
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function getLatestHeight(): Promise<number> {
  const res = await fetchJson<number>(`${API_BASE}/block/height/latest`)
  return res ?? 0
}

async function getMappingValue(mapping: string, key: string): Promise<string | null> {
  const url = `${API_BASE}/program/${PROGRAM_ID}/mapping/${mapping}/${encodeURIComponent(key)}`
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" })
  if (!res.ok) return null
  const text = await res.text()
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed)
  } catch {
    return text.trim() || null
  }
}

// ─── Block Scanner ──────────────────────────────────────────────────

interface AleoBlock {
  header?: { metadata?: { height?: number } }
  transactions?: Array<{
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
  }>
}

function extractAuctionIds(blocks: AleoBlock[]): string[] {
  const ids: string[] = []
  for (const block of blocks) {
    for (const tw of block.transactions ?? []) {
      const tx = tw.transaction ?? tw
      if (!tx) continue
      const txObj = tx as { execution?: { transitions?: Array<{ program?: string; function?: string; outputs?: Array<{ type?: string; value?: string }> }> } }
      const transitions = txObj.execution?.transitions ?? []
      for (const t of transitions) {
        if (t.program === PROGRAM_ID && t.function === "create_auction") {
          // auction_id is the first argument in the future output
          const future = t.outputs?.find((o) => o.type === "future")
          if (future?.value) {
            const m = future.value.match(/arguments:\s*\[\s*(\d+field)/)
            if (m) ids.push(m[1])
          }
        }
      }
    }
  }
  return ids
}

/**
 * Scan new blocks since last scan. Processes in chunks to stay within
 * API rate limits (5 req/s). Returns newly discovered auction IDs.
 */
async function scanNewBlocks(maxChunks = 20): Promise<string[]> {
  const state = await readScanState()
  const latest = await getLatestHeight()
  if (latest <= state.lastScannedBlock) return []

  const CHUNK = 50
  const discovered: string[] = []
  let cursor = state.lastScannedBlock + 1

  for (let i = 0; i < maxChunks && cursor <= latest; i++) {
    const end = Math.min(cursor + CHUNK - 1, latest)
    const blocks = await fetchJson<AleoBlock[]>(
      `${API_BASE}/blocks?start=${cursor}&end=${end}`,
    )
    if (blocks) {
      discovered.push(...extractAuctionIds(blocks))
    }
    cursor = end + 1
    // Small delay to respect rate limits
    if (i < maxChunks - 1 && cursor <= latest) {
      await new Promise((r) => setTimeout(r, 220))
    }
  }

  await writeScanState({ lastScannedBlock: Math.min(cursor - 1, latest) })
  return discovered
}

// ─── Parse auction info ─────────────────────────────────────────────

interface AuctionData {
  auction_id: string
  creator: string
  item_name: string
  min_bid: number
  max_bid: number
  end_block: number
  grace_block: number
  is_settled: boolean
  bid_count: number
  highest_bid: number
}

function parseAuctionInfo(raw: string): Omit<AuctionData, "auction_id" | "bid_count" | "highest_bid"> | null {
  if (!raw || raw === "null") return null
  const cleaned = raw.replace(/^"?\{?\s*/, "").replace(/\s*\}?"?$/, "")
  const fields: Record<string, string> = {}
  const regex = /(\w+)\s*:\s*([^,}]+)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(cleaned)) !== null) {
    fields[m[1].trim()] = m[2].trim()
  }
  const numField = (key: string) =>
    parseInt((fields[key] || "0").replace(/u(8|32|64|128)$/, ""), 10)
  return {
    creator: fields.creator || "",
    item_name: fields.item_name || "0field",
    min_bid: numField("min_bid"),
    max_bid: numField("max_bid"),
    end_block: numField("end_block"),
    grace_block: numField("grace_block"),
    is_settled: fields.is_settled === "true",
  }
}

async function enrichAuction(id: string): Promise<AuctionData | null> {
  const raw = await getMappingValue("auctions", id)
  if (!raw) return null
  const info = parseAuctionInfo(raw)
  if (!info) return null

  const [bidRaw, highRaw] = await Promise.all([
    getMappingValue("bid_counts", id),
    getMappingValue("highest_bids", id),
  ])

  return {
    auction_id: id,
    ...info,
    bid_count: bidRaw ? parseInt(bidRaw.replace(/u64$/, ""), 10) || 0 : 0,
    highest_bid: highRaw ? parseInt(highRaw.replace(/u64$/, ""), 10) || 0 : 0,
  }
}

// ─── Route Handlers ─────────────────────────────────────────────────

export async function GET() {
  try {
    let knownIds = await readRegistry()

    // Scan for new auctions in background (up to 20 chunks = 1000 blocks)
    const newIds = await scanNewBlocks(20)
    if (newIds.length > 0) {
      knownIds = [...new Set([...knownIds, ...newIds])]
      await writeRegistry(knownIds)
    }

    // Fetch on-chain data for all known IDs (parallel, batched)
    const height = await getLatestHeight()
    const results: AuctionData[] = []

    // Batch in groups of 5 to respect rate limits
    for (let i = 0; i < knownIds.length; i += 5) {
      const batch = knownIds.slice(i, i + 5)
      const enriched = await Promise.all(batch.map(enrichAuction))
      for (const a of enriched) {
        if (a) results.push(a)
      }
    }

    return NextResponse.json({ auctions: results, height, totalOnChain: knownIds.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch auctions" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: string }
    const id = body.id?.trim()
    if (!id || !/^\d+field$/.test(id)) {
      return NextResponse.json({ error: "Invalid auction ID format" }, { status: 400 })
    }

    // Verify the auction exists on-chain
    const raw = await getMappingValue("auctions", id)
    if (!raw || raw === "null") {
      return NextResponse.json({ error: "Auction not found on-chain" }, { status: 404 })
    }

    const existing = await readRegistry()
    if (!existing.includes(id)) {
      existing.push(id)
      await writeRegistry(existing)
    }

    return NextResponse.json({ success: true, id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to register auction" },
      { status: 500 },
    )
  }
}
