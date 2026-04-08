"use client"

import { blockExplorerUrl } from "@/lib/chain-config"

function shortAddress(addr: string): string {
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

export function LatestBids({
  bidCount,
  highestBid,
  highestBidder,
  isEnded,
  currentBlock,
  endBlock,
}: {
  bidCount: number
  highestBid: number
  highestBidder: string | null
  isEnded: boolean
  currentBlock: number
  endBlock: number
}) {
  if (bidCount === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        No bids yet. Be the first to place a bid.
      </p>
    )
  }

  // On Aleo, all bids are sealed ZK records — we can only show count + encrypted status
  // After reveal, we can show the highest bidder
  const rows = Array.from({ length: Math.min(bidCount, 10) }, (_, i) => ({
    id: i,
    isWinner: isEnded && highestBidder && i === 0,
  }))

  return (
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
            <tr key={row.id} className="border-b border-border/30 hover:bg-muted/20">
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
                    <span className="text-accent break-all">{shortAddress(highestBidder)}</span>
                  )
                ) : (
                  <span className="text-purple-400 text-[10px]">encrypted</span>
                )}
              </td>
              <td className="py-2 px-3 text-foreground">
                {row.isWinner && highestBid > 0 ? (
                  `${highestBid} microcredits`
                ) : (
                  <span className="text-purple-400 text-[10px]">encrypted</span>
                )}
              </td>
              <td className="py-2 px-3 text-foreground">
                <span className="text-purple-400 text-[10px]">encrypted</span>
              </td>
              <td className="py-2 px-3 text-muted-foreground">
                {row.isWinner ? (
                  <span className="text-accent text-[10px] uppercase">winner</span>
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
        {bidCount} sealed bid{bidCount !== 1 ? "s" : ""} · All bids are private ZK records
      </p>
    </div>
  )
}
