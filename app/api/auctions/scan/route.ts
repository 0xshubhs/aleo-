/**
 * POST /api/auctions/scan
 *
 * Triggers a deep block scan to discover auction IDs from on-chain transactions.
 * Scans up to 5000 blocks per request. Call repeatedly until caught up.
 */

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const REGISTRY_PATH = path.join(process.cwd(), "data", "auction-registry.json")
const SCAN_STATE_PATH = path.join(process.cwd(), "data", "scan-state.json")

const PROGRAM_ID = process.env.NEXT_PUBLIC_SILENTBID_PROGRAM_ID || "silentbid_v2.aleo"
const API_BASE = (process.env.ALEO_API_BASE || "https://api.explorer.provable.com/v1/testnet")
  .replace(/\/+$/, "")
const DEPLOY_BLOCK = 15697543

async function ensureDataDir() {
  await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true })
}

async function readRegistry(): Promise<string[]> {
  try {
    return JSON.parse(await fs.readFile(REGISTRY_PATH, "utf-8")) as string[]
  } catch {
    return []
  }
}

async function readScanState(): Promise<{ lastScannedBlock: number }> {
  try {
    return JSON.parse(await fs.readFile(SCAN_STATE_PATH, "utf-8")) as { lastScannedBlock: number }
  } catch {
    return { lastScannedBlock: DEPLOY_BLOCK }
  }
}

export async function POST() {
  await ensureDataDir()

  const state = await readScanState()
  const latestRes = await fetch(`${API_BASE}/block/height/latest`, { cache: "no-store" })
  const latest = parseInt(await latestRes.text(), 10)

  if (state.lastScannedBlock >= latest) {
    return NextResponse.json({
      status: "caught_up",
      lastScanned: state.lastScannedBlock,
      latest,
      auctionIds: await readRegistry(),
    })
  }

  const CHUNK = 50
  const MAX_CHUNKS = 100 // 5000 blocks per request
  const discovered: string[] = []
  let cursor = state.lastScannedBlock + 1
  let chunksProcessed = 0

  for (let i = 0; i < MAX_CHUNKS && cursor <= latest; i++) {
    const end = Math.min(cursor + CHUNK - 1, latest)
    try {
      const res = await fetch(`${API_BASE}/blocks?start=${cursor}&end=${end}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      if (res.ok) {
        const blocks = (await res.json()) as Array<{
          transactions?: Array<{
            transaction?: {
              execution?: {
                transitions?: Array<{
                  program?: string
                  function?: string
                  outputs?: Array<{ type?: string; value?: string }>
                }>
              }
            }
          }>
        }>
        for (const block of blocks) {
          for (const tw of block.transactions ?? []) {
            const tx = tw.transaction ?? tw
            const transitions = (tx as { execution?: { transitions?: Array<{ program?: string; function?: string; outputs?: Array<{ type?: string; value?: string }> }> } }).execution?.transitions ?? []
            for (const t of transitions) {
              if (t.program === PROGRAM_ID && t.function === "create_auction") {
                const future = t.outputs?.find((o) => o.type === "future")
                if (future?.value) {
                  const m = future.value.match(/arguments:\s*\[\s*(\d+field)/)
                  if (m) discovered.push(m[1])
                }
              }
            }
          }
        }
      }
    } catch {
      // skip failed chunk
    }
    cursor = end + 1
    chunksProcessed++
    // Rate limiting
    if (i < MAX_CHUNKS - 1 && cursor <= latest) {
      await new Promise((r) => setTimeout(r, 210))
    }
  }

  // Persist discoveries
  const existing = await readRegistry()
  const merged = [...new Set([...existing, ...discovered])]
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(merged, null, 2))
  await fs.writeFile(SCAN_STATE_PATH, JSON.stringify({ lastScannedBlock: cursor - 1 }))

  return NextResponse.json({
    status: cursor > latest ? "caught_up" : "scanning",
    lastScanned: cursor - 1,
    latest,
    blocksScanned: chunksProcessed * CHUNK,
    newAuctionsFound: discovered.length,
    totalAuctions: merged.length,
    auctionIds: merged,
  })
}
