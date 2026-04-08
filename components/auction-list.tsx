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
} from "@/lib/silentbid"

const CACHE_TTL = 30_000

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
  const seconds = blocks * 5 // Aleo ~5s per block
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

async function getLatestHeight() {
  const mod = await import("@/lib/aleo-client")
  return mod.getLatestHeight()
}

export function AuctionList({ filter }: { filter?: AuctionStatus }) {
  const [auctions, setAuctions] = useState<AuctionWithMeta[]>([])
  const [currentBlock, setCurrentBlock] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<number>(0)
  const fetchingRef = useRef(false)

  const fetchAuctions = useCallback(async (isBackground: boolean) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      if (!isBackground) setLoading(true)

      const [height, count] = await Promise.all([getLatestHeight(), fetchAuctionCount()])
      setCurrentBlock(height)

      // Load tracked auction IDs from localStorage
      const storedIds: string[] = JSON.parse(localStorage.getItem("silentbid_auction_ids") || "[]")
      const results: AuctionWithMeta[] = []

      for (const id of storedIds) {
        try {
          const [info, bidCount, highestBid] = await Promise.all([
            fetchAuctionInfo(id), fetchBidCount(id), fetchHighestBid(id),
          ])
          if (info) {
            const s = getAuctionStatus(info, height)
            results.push({
              ...info,
              bid_count: bidCount,
              highest_bid: highestBid,
              status: s === "reveal" ? "ended" as AuctionStatus : s === "settled" ? "ended" as AuctionStatus : s as AuctionStatus,
            })
          }
        } catch { /* skip */ }
      }

      setAuctions(results)
      setError(null)
      lastFetchRef.current = Date.now()
    } catch (err: unknown) {
      if (auctions.length === 0) {
        setError(err instanceof Error ? err.message : "Failed to fetch auctions")
      }
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAuctions(false) }, [fetchAuctions])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastFetchRef.current >= CACHE_TTL) fetchAuctions(true)
    }, CACHE_TTL)
    return () => clearInterval(interval)
  }, [fetchAuctions])

  const filtered = filter
    ? auctions.filter((a) => a.status === filter)
    : [...auctions].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  if (loading) {
    return (
      <div className="border border-border/40 p-12 text-center">
        <p className="font-mono text-sm text-muted-foreground animate-pulse">
          Loading auctions from {networkName}...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-destructive/50 bg-destructive/10 p-6">
        <p className="font-mono text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="border border-border/40 p-12 md:p-16 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          {filter
            ? `No ${statusLabel(filter).toLowerCase()} auctions right now.`
            : `No auctions found on ${networkName}. Create one or add by ID.`}
        </p>
        {filter && (
          <Link href="/auctions" className="mt-4 inline-block font-mono text-xs uppercase tracking-widest text-accent hover:underline">
            View all
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      <span className="mb-4 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {filtered.length} auction{filtered.length !== 1 ? "s" : ""} on {networkName}
      </span>
      <ul className="grid gap-4 md:gap-6">
        {filtered.map((auction) => {
          let name = "AUCTION"
          try { name = fieldToString(auction.item_name) || "UNNAMED" } catch {}
          return (
          <li key={auction.auction_id}>
            <Link
              href={`/auctions/${encodeURIComponent(auction.auction_id)}`}
              className={cn(
                "block border border-border/40 p-6 md:p-8 transition-all duration-200",
                "hover:border-accent/60 hover:bg-accent/5",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-[var(--font-bebas)] text-2xl md:text-4xl tracking-tight">{name.toUpperCase()}</span>
                    <span className={cn(
                      "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border",
                      auction.status === "active" && "border-accent/60 text-accent",
                      auction.status !== "active" && "border-muted-foreground/40 text-muted-foreground",
                    )}>
                      {statusLabel(auction.status)}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
                    {auction.creator.slice(0, 16)}...{auction.creator.slice(-6)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
                    Sealed bid auction · {networkName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-6 md:gap-10 font-mono text-xs text-muted-foreground">
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">Min Bid</span>
                    <span className="text-foreground">{formatCredits(auction.min_bid)} credits</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">Sealed Bids</span>
                    <span className="text-foreground">{auction.bid_count}</span>
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
                          : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">Highest</span>
                    <span className="text-foreground">
                      {auction.highest_bid > 0 ? `${formatCredits(auction.highest_bid)} cr` : "hidden"}
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
