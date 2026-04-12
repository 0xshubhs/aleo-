"use client"

import { useEffect, useState, useCallback } from "react"
import { blockExplorerUrl } from "@/lib/chain-config"
import { formatCredits } from "@/lib/silentbid"
import { cn } from "@/lib/utils"

function shortAddress(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-4)}`
}

interface RevealedBid {
  bidder: string
  amount: number
  tx_id: string
}

export function LatestBids({
  auctionId,
  bidCount,
  highestBid,
  highestBidder,
  isEnded,
  currentBlock,
  endBlock,
}: {
  auctionId: string
  bidCount: number
  highestBid: number
  highestBidder: string | null
  isEnded: boolean
  currentBlock: number
  endBlock: number
}) {
  const [revealedBids, setRevealedBids] = useState<RevealedBid[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)

  const fetchRevealedBids = useCallback(async () => {
    if (!isEnded || !auctionId) return
    setScanning(true)
    try {
      const res = await fetch(
        `/api/auctions/revealed?auction_id=${encodeURIComponent(auctionId)}`
      )
      if (res.ok) {
        const data = (await res.json()) as { bids: RevealedBid[] }
        setRevealedBids(data.bids ?? [])
      }
    } catch {
      // ignore
    } finally {
      setScanning(false)
      setScanned(true)
    }
  }, [isEnded, auctionId])

  // Fetch revealed bids when auction has ended
  useEffect(() => {
    if (isEnded) fetchRevealedBids()
  }, [isEnded, fetchRevealedBids])

  // Auto-refresh every 30s during reveal phase
  useEffect(() => {
    if (!isEnded) return
    const interval = setInterval(fetchRevealedBids, 30_000)
    return () => clearInterval(interval)
  }, [isEnded, fetchRevealedBids])

  if (bidCount === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        No bids yet. Be the first to place a bid.
      </p>
    )
  }

  // After reveal, show actual revealed bid data
  if (isEnded && revealedBids.length > 0) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs border border-border/40">
            <thead>
              <tr className="border-b border-border/40 text-[10px] uppercase tracking-widest text-muted-foreground text-left">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Bidder</th>
                <th className="py-2 px-3">Bid Amount</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {revealedBids.map((bid, i) => {
                const isWinner =
                  highestBidder && bid.bidder === highestBidder
                return (
                  <tr
                    key={bid.bidder}
                    className={cn(
                      "border-b border-border/30",
                      isWinner
                        ? "bg-accent/5 hover:bg-accent/10"
                        : "hover:bg-muted/20"
                    )}
                  >
                    <td className="py-2 px-3 text-muted-foreground/50">
                      {i + 1}
                    </td>
                    <td className="py-2 px-3">
                      {blockExplorerUrl ? (
                        <a
                          href={`${blockExplorerUrl}/address/${bid.bidder}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "hover:underline break-all",
                            isWinner ? "text-accent" : "text-foreground"
                          )}
                        >
                          {shortAddress(bid.bidder)}
                        </a>
                      ) : (
                        <span
                          className={cn(
                            "break-all",
                            isWinner ? "text-accent" : "text-foreground"
                          )}
                        >
                          {shortAddress(bid.bidder)}
                        </span>
                      )}
                      {isWinner && (
                        <span className="ml-2 text-[10px] text-accent uppercase">
                          winner
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "font-semibold",
                          isWinner ? "text-accent" : "text-foreground"
                        )}
                      >
                        {formatCredits(bid.amount)} tUSDC
                      </span>
                      <span className="ml-1 text-[10px] text-muted-foreground/50">
                        ({bid.amount.toLocaleString()} micro)
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-widest px-2 py-0.5 border",
                          isWinner
                            ? "border-accent/60 text-accent"
                            : "border-purple-500/40 text-purple-400"
                        )}
                      >
                        revealed
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-muted-foreground">
          <span>
            {revealedBids.length} revealed / {bidCount} total sealed bids
          </span>
          {bidCount > revealedBids.length && (
            <span className="text-destructive/70">
              {bidCount - revealedBids.length} bid
              {bidCount - revealedBids.length !== 1 ? "s" : ""} not revealed
              (escrow forfeit)
            </span>
          )}
        </div>

        {scanning && (
          <p className="font-mono text-[10px] text-muted-foreground/50 animate-pulse">
            Scanning for new reveals...
          </p>
        )}

        <button
          onClick={fetchRevealedBids}
          disabled={scanning}
          className="border border-border/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-accent hover:text-accent transition-all disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Refresh reveals"}
        </button>
      </div>
    )
  }

  // During active phase or while loading reveals, show sealed bids
  const rows = Array.from({ length: Math.min(bidCount, 10) }, (_, i) => ({
    id: i,
    isWinner: isEnded && highestBidder && i === 0,
  }))

  return (
    <div>
      {isEnded && !scanned && (
        <div className="mb-4 border border-purple-500/30 bg-purple-500/5 px-4 py-3 font-mono text-[10px] text-purple-400">
          {scanning
            ? "Scanning blocks for revealed bids..."
            : "Loading revealed bid data..."}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs border border-border/40">
          <thead>
            <tr className="border-b border-border/40 text-[10px] uppercase tracking-widest text-muted-foreground text-left">
              <th className="py-2 px-3">Bidder</th>
              <th className="py-2 px-3">Amount</th>
              <th className="py-2 px-3">Max price</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/30 hover:bg-muted/20"
              >
                <td className="py-2 px-3">
                  {row.isWinner && highestBidder ? (
                    blockExplorerUrl ? (
                      <a
                        href={`${blockExplorerUrl}/address/${highestBidder}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline break-all"
                      >
                        {shortAddress(highestBidder)}
                      </a>
                    ) : (
                      <span className="text-accent break-all">
                        {shortAddress(highestBidder)}
                      </span>
                    )
                  ) : (
                    <span className="text-purple-400 text-[10px]">
                      encrypted
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-foreground">
                  {row.isWinner && highestBid > 0 ? (
                    `${formatCredits(highestBid)} tUSDC`
                  ) : (
                    <span className="text-purple-400 text-[10px]">
                      encrypted
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-foreground">
                  <span className="text-purple-400 text-[10px]">
                    encrypted
                  </span>
                </td>
                <td className="py-2 px-3 text-muted-foreground">
                  {row.isWinner ? (
                    <span className="text-accent text-[10px] uppercase">
                      winner
                    </span>
                  ) : isEnded ? (
                    <span className="text-[10px]">pending reveal</span>
                  ) : (
                    <span className="text-[10px]">sealed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
          {bidCount} sealed bid{bidCount !== 1 ? "s" : ""} · All bids are
          private ZK records
        </p>
      </div>
    </div>
  )
}
