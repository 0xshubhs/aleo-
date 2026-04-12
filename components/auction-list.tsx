"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { networkName } from "@/lib/chain-config"
import type { AuctionStatus, AuctionWithMeta } from "@/lib/auction-contracts"
import { fieldToString } from "@/lib/aleo"
import {
  fetchAuctionCount,
  fetchAuctionInfo,
  fetchBidCount,
  fetchHighestBid,
  getAuctionStatus,
  formatCredits,
  discoverAllAuctionIds,
} from "@/lib/silentbid"

const CACHE_KEY = "silentbid_auctions_cache"
const IDS_KEY = "silentbid_auction_ids"
const BACKGROUND_INTERVAL = 20_000 // 20s background refresh

interface CachedData {
  auctions: AuctionWithMeta[]
  currentBlock: number
  timestamp: number
}

function loadCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as CachedData
    // Cache valid for 5 minutes max
    if (Date.now() - data.timestamp > 300_000) return null
    return data
  } catch {
    return null
  }
}

function saveCache(auctions: AuctionWithMeta[], currentBlock: number) {
  try {
    const data: CachedData = { auctions, currentBlock, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // storage full, ignore
  }
}

function statusLabel(s: AuctionStatus) {
  switch (s) {
    case "active": return "Live"
    case "upcoming": return "Upcoming"
    case "ended": return "Ended"
  }
}

const STATUS_ORDER: Record<AuctionStatus, number> = { active: 0, upcoming: 1, ended: 2 }

function blocksToTime(blocks: number): string {
  if (blocks <= 0) return "0s"
  const seconds = blocks * 5
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

async function getLatestHeight() {
  const mod = await import("@/lib/aleo-client")
  return mod.getLatestHeight()
}

function normalizeAuctionId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+field$/.test(trimmed)) return trimmed
  if (/^\d+$/.test(trimmed)) return `${trimmed}field`
  return null
}

async function fetchAllAuctionData(
  isBackground: boolean,
  existingAuctions: AuctionWithMeta[]
): Promise<{ auctions: AuctionWithMeta[]; currentBlock: number }> {
  const height = await getLatestHeight()

  // Strategy 1: On-chain discovery via auction_ids mapping
  let auctionIds = await discoverAllAuctionIds()

  // Strategy 2: Merge with localStorage
  const storedIds: string[] = JSON.parse(localStorage.getItem(IDS_KEY) || "[]")
  const allIds = [...new Set([...auctionIds, ...storedIds])]

  // Strategy 3: Server registry fallback
  try {
    const registryRes = await fetch("/api/auctions", { cache: "no-store" })
    if (registryRes.ok) {
      const data = (await registryRes.json()) as {
        auctions: Array<{ auction_id: string }>
      }
      const registryIds = (data.auctions ?? []).map((a) => a.auction_id)
      for (const id of registryIds) {
        if (!allIds.includes(id)) allIds.push(id)
      }
    }
  } catch {
    /* registry unavailable */
  }

  // Fetch on-chain data, batched
  const results: AuctionWithMeta[] = []
  for (let i = 0; i < allIds.length; i += 5) {
    const batch = allIds.slice(i, i + 5)
    const enriched = await Promise.all(
      batch.map(async (id) => {
        try {
          const [info, bidCount, highestBid] = await Promise.all([
            fetchAuctionInfo(id),
            fetchBidCount(id),
            fetchHighestBid(id),
          ])
          if (!info) return null
          const s = getAuctionStatus(info, height)
          const listStatus: AuctionStatus = s === "active" ? "active" : "ended"
          return {
            ...info,
            bid_count: bidCount,
            highest_bid: highestBid,
            status: listStatus,
          } as AuctionWithMeta
        } catch {
          return null
        }
      })
    )
    for (const a of enriched) {
      if (a) results.push(a)
    }
  }

  // Sync IDs back to localStorage
  const foundIds = results.map((r) => r.auction_id)
  localStorage.setItem(IDS_KEY, JSON.stringify([...new Set(foundIds)]))

  return { auctions: results, currentBlock: height }
}

export function AuctionList({ filter }: { filter?: AuctionStatus }) {
  const [auctions, setAuctions] = useState<AuctionWithMeta[]>([])
  const [currentBlock, setCurrentBlock] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addIdInput, setAddIdInput] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)
  const fetchingRef = useRef(false)
  const mountedRef = useRef(true)

  // Load cached data immediately on mount
  useEffect(() => {
    const cached = loadCache()
    if (cached && cached.auctions.length > 0) {
      setAuctions(cached.auctions)
      setCurrentBlock(cached.currentBlock)
      setLoading(false)
    }
  }, [])

  const fetchAuctions = useCallback(
    async (isBackground: boolean) => {
      if (fetchingRef.current) return
      fetchingRef.current = true

      try {
        if (!isBackground && auctions.length === 0) setLoading(true)
        if (isBackground) setIsBackgroundRefreshing(true)

        const result = await fetchAllAuctionData(isBackground, auctions)

        if (!mountedRef.current) return

        setAuctions(result.auctions)
        setCurrentBlock(result.currentBlock)
        saveCache(result.auctions, result.currentBlock)
        setError(null)
      } catch (err: unknown) {
        if (!mountedRef.current) return
        if (auctions.length === 0) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch auctions"
          )
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          setIsBackgroundRefreshing(false)
        }
        fetchingRef.current = false
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Initial foreground fetch
  useEffect(() => {
    fetchAuctions(false)
    return () => {
      mountedRef.current = false
    }
  }, [fetchAuctions])

  // Background refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAuctions(true)
    }, BACKGROUND_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchAuctions])

  const handleAddById = useCallback(async () => {
    setAddError(null)
    const id = normalizeAuctionId(addIdInput)
    if (!id) {
      setAddError("Paste an auction id -- a field value like 123...field.")
      return
    }
    setAdding(true)
    try {
      const info = await fetchAuctionInfo(id)
      if (!info) {
        setAddError("No auction found on-chain for that id.")
        return
      }
      const stored: string[] = JSON.parse(
        localStorage.getItem(IDS_KEY) || "[]"
      )
      if (!stored.includes(id)) {
        stored.push(id)
        localStorage.setItem(IDS_KEY, JSON.stringify(stored))
      }
      fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {})
      setAddIdInput("")
      await fetchAuctions(false)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to load auction.")
    } finally {
      setAdding(false)
    }
  }, [addIdInput, fetchAuctions])

  const filtered = filter
    ? auctions.filter((a) => a.status === filter)
    : [...auctions].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      )

  const addByIdPanel = (
    <div className="mb-6 border border-border/40 p-4 md:p-5">
      <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Add auction by ID
      </span>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
        Auctions are auto-discovered from on-chain. You can also manually add
        one by ID.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={addIdInput}
          onChange={(e) => setAddIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddById()
          }}
          placeholder="123...field"
          className={cn(
            "flex-1 min-w-[260px] border border-border bg-input/50 px-3 py-2 font-mono text-xs",
            "placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent"
          )}
        />
        <button
          type="button"
          onClick={handleAddById}
          disabled={adding}
          className={cn(
            "border border-accent px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-accent",
            "hover:bg-accent hover:text-accent-foreground transition-all duration-200 disabled:opacity-40"
          )}
        >
          {adding ? "Loading..." : "Add"}
        </button>
      </div>
      {addError && (
        <p className="mt-2 font-mono text-[10px] text-destructive break-all">
          {addError}
        </p>
      )}
    </div>
  )

  if (loading && auctions.length === 0) {
    return (
      <>
        {addByIdPanel}
        <div className="border border-border/40 p-12 text-center">
          <p className="font-mono text-sm text-muted-foreground animate-pulse">
            Loading auctions from {networkName}...
          </p>
        </div>
      </>
    )
  }

  if (error && auctions.length === 0) {
    return (
      <>
        {addByIdPanel}
        <div className="border border-destructive/50 bg-destructive/10 p-6">
          <p className="font-mono text-sm text-destructive">{error}</p>
        </div>
      </>
    )
  }

  if (filtered.length === 0) {
    return (
      <>
        {addByIdPanel}
        <div className="border border-border/40 p-12 md:p-16 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            {filter
              ? `No ${statusLabel(filter).toLowerCase()} auctions right now.`
              : `No auctions found on ${networkName}. Create one or add by ID above.`}
          </p>
          {filter && (
            <Link
              href="/auctions"
              className="mt-4 inline-block font-mono text-xs uppercase tracking-widest text-accent hover:underline"
            >
              View all
            </Link>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {addByIdPanel}
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {filtered.length} auction{filtered.length !== 1 ? "s" : ""} on{" "}
          {networkName}
        </span>
        {isBackgroundRefreshing && (
          <span className="font-mono text-[10px] text-muted-foreground/50 animate-pulse">
            Refreshing...
          </span>
        )}
      </div>
      <ul className="grid gap-4 md:gap-6">
        {filtered.map((auction) => {
          let name = "AUCTION"
          try {
            name = fieldToString(auction.item_name) || "UNNAMED"
          } catch {}
          return (
            <li key={auction.auction_id}>
              <Link
                href={`/auctions/${encodeURIComponent(auction.auction_id)}`}
                className={cn(
                  "block border border-border/40 p-6 md:p-8 transition-all duration-200",
                  "hover:border-accent/60 hover:bg-accent/5"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-[var(--font-bebas)] text-2xl md:text-4xl tracking-tight">
                        {name.toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border",
                          auction.status === "active" &&
                            "border-accent/60 text-accent",
                          auction.status !== "active" &&
                            "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        {statusLabel(auction.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
                      {auction.creator.slice(0, 16)}...
                      {auction.creator.slice(-6)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
                      Sealed bid auction · {networkName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-6 md:gap-10 font-mono text-xs text-muted-foreground">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        Min Bid
                      </span>
                      <span className="text-foreground">
                        {formatCredits(auction.min_bid)} tUSDC
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        Sealed Bids
                      </span>
                      <span className="text-foreground">
                        {auction.bid_count}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        {auction.status === "ended" ? "Ended" : "Ends in"}
                      </span>
                      <span className="text-foreground">
                        {auction.status === "ended"
                          ? "Closed"
                          : currentBlock
                            ? `~${blocksToTime(auction.end_block - currentBlock)}`
                            : "--"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        Highest
                      </span>
                      <span className="text-foreground">
                        {auction.highest_bid > 0
                          ? `${formatCredits(auction.highest_bid)} tUSDC`
                          : "hidden"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
