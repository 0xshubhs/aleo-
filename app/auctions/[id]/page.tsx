"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { useEffect, useState, useCallback, useRef } from "react"
import { PlaceBidForm } from "./place-bid-form"
import { LatestBids } from "./latest-bids"
import { cn } from "@/lib/utils"
import { networkName } from "@/lib/chain-config"
import { SILENTBID_PROGRAM_ID, SILENTBID_FEE, type AuctionStatus } from "@/lib/auction-contracts"
import { fieldToString, getWalletErrorMessage } from "@/lib/aleo"
import {
  fetchAuctionInfo,
  fetchBidCount,
  fetchHighestBid,
  fetchHighestBidder,
  getAuctionStatus,
  formatCredits,
  type AuctionInfo,
} from "@/lib/silentbid"

async function getLatestHeight() {
  const mod = await import("@/lib/aleo-client")
  return mod.getLatestHeight()
}

function statusLabel(s: string) {
  switch (s) {
    case "active": return "Live"
    case "reveal": return "Reveal Phase"
    case "settled": return "Settled"
    default: return "Ended"
  }
}

function blocksToTime(blocks: number): string {
  if (blocks <= 0) return "0s"
  const seconds = blocks * 5
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

export default function AuctionDetailPage() {
  const params = useParams()
  const auctionId = decodeURIComponent(params.id as string)
  const { address, executeTransaction, requestRecords } = useWallet()

  const [auction, setAuction] = useState<AuctionInfo | null>(null)
  const [bidCount, setBidCount] = useState(0)
  const [highestBid, setHighestBid] = useState(0)
  const [highestBidder, setHighestBidder] = useState<string | null>(null)
  const [currentBlock, setCurrentBlock] = useState(0)
  const [status, setStatus] = useState<string>("active")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [bidsRefreshKey, setBidsRefreshKey] = useState(0)
  const fetchedRef = useRef(false)
  const handleBidSuccess = useCallback(() => setBidsRefreshKey((k) => k + 1), [])

  // Reveal state
  const [revealLoading, setRevealLoading] = useState(false)
  const [revealResult, setRevealResult] = useState<string | null>(null)
  const [bidRecords, setBidRecords] = useState<any[]>([])
  const [fetchingRecords, setFetchingRecords] = useState(false)

  // Settle state
  const [settleLoading, setSettleLoading] = useState(false)
  const [settleResult, setSettleResult] = useState<string | null>(null)

  const fetchAuction = useCallback(async () => {
    try {
      const [info, count, highest, bidder, height] = await Promise.all([
        fetchAuctionInfo(auctionId), fetchBidCount(auctionId),
        fetchHighestBid(auctionId), fetchHighestBidder(auctionId), getLatestHeight(),
      ])
      if (!info) { setFetchError("Auction not found on " + networkName); return }
      setAuction(info); setBidCount(count); setHighestBid(highest)
      setHighestBidder(bidder); setCurrentBlock(height)
      setStatus(getAuctionStatus(info, height))
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load auction")
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => { fetchAuction() }, [fetchAuction])
  useEffect(() => {
    const i = setInterval(fetchAuction, 15000)
    return () => clearInterval(i)
  }, [fetchAuction])

  // Refresh on bid success
  useEffect(() => { if (bidsRefreshKey > 0) fetchAuction() }, [bidsRefreshKey, fetchAuction])

  const handleFetchRecords = async () => {
    if (!address || !requestRecords) return
    setFetchingRecords(true)
    try {
      const records = await requestRecords(SILENTBID_PROGRAM_ID)
      const list = Array.isArray(records) ? records : records ? [records] : []
      setBidRecords(list.filter((r: any) => {
        const data = typeof r === "string" ? r : JSON.stringify(r)
        return data.includes("is_revealed")
      }))
    } catch { /* */ } finally { setFetchingRecords(false) }
  }

  const handleRevealBid = async (record: any) => {
    if (!address || !executeTransaction) return
    setRevealLoading(true); setRevealResult(null)
    try {
      const recordStr = typeof record === "string" ? record : JSON.stringify(record)
      const result = await executeTransaction({
        program: SILENTBID_PROGRAM_ID, function: "reveal_bid",
        inputs: [recordStr], fee: SILENTBID_FEE,
      })
      setRevealResult(`Bid revealed! TX: ${result?.transactionId || "pending"}`)
      setTimeout(fetchAuction, 5000)
    } catch (e) { setRevealResult(`Error: ${getWalletErrorMessage(e)}`) } finally { setRevealLoading(false) }
  }

  const handleSettle = async () => {
    if (!address || !executeTransaction) return
    setSettleLoading(true); setSettleResult(null)
    try {
      const result = await executeTransaction({
        program: SILENTBID_PROGRAM_ID, function: "settle_auction",
        inputs: [auctionId], fee: SILENTBID_FEE,
      })
      setSettleResult(`Settled! TX: ${result?.transactionId || "pending"}`)
      setTimeout(fetchAuction, 5000)
    } catch (e) { setSettleResult(`Error: ${getWalletErrorMessage(e)}`) } finally { setSettleLoading(false) }
  }

  let itemName = "..."
  if (auction) { try { itemName = fieldToString(auction.item_name) || "UNNAMED" } catch { itemName = "AUCTION" } }

  const isEnded = status === "reveal" || status === "settled"
  const isActive = status === "active"

  if (loading) {
    return (
      <div className="px-6 md:px-12 py-20 text-center">
        <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading auction from {networkName}...</p>
      </div>
    )
  }

  if (fetchError || !auction) {
    return (
      <div className="px-6 md:px-12 py-20 text-center">
        <p className="font-mono text-sm text-destructive">{fetchError || "Auction not found"}</p>
        <Link href="/auctions" className="mt-4 inline-block font-mono text-xs uppercase tracking-widest text-accent hover:underline">&larr; All auctions</Link>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-12 py-12 md:py-20 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/auctions" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors">
        &larr; All auctions
      </Link>

      {/* Title + badge */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight">{itemName.toUpperCase()}</h1>
            <span className={cn(
              "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border",
              isActive && "border-accent/60 text-accent",
              status === "reveal" && "border-purple-500/60 text-purple-400",
              status === "settled" && "border-muted-foreground/40 text-muted-foreground",
            )}>
              {statusLabel(status)}
            </span>
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
            {auction.creator.slice(0, 16)}...{auction.creator.slice(-6)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
            Sealed bid auction · {networkName}
          </p>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-sm">
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">Min Bid</span>
          <span className="text-foreground">{formatCredits(auction.min_bid)} credits</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">Sealed Bids</span>
          <span className="text-foreground">{bidCount}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
            {isActive ? "Ends in" : "End Block"}
          </span>
          <span className={cn("text-foreground", isActive && "text-accent")}>
            {isActive && currentBlock > 0
              ? `~${blocksToTime(auction.end_block - currentBlock)}`
              : `#${auction.end_block}`}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">Highest Bid</span>
          <span className={cn("text-foreground", isActive && "text-purple-400")}>
            {isActive ? "hidden until reveal" : highestBid > 0 ? `${formatCredits(highestBid)} credits` : "—"}
          </span>
        </div>
      </div>

      {/* Encrypted info box */}
      <div className="mt-6 border border-purple-500/30 bg-purple-500/5 p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-purple-400">Encrypted (ZK Sealed Bid)</span>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          All bids are private ZK records on Aleo. Only a BHP256 commitment is stored on-chain. Bid amounts and bidder identities are invisible until reveal.
        </p>
      </div>

      {/* Place bid form (only when active) */}
      {isActive && (
        <div className="mt-10">
          <h2 className="font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight">Place sealed bid</h2>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Your bid is a private ZK record. Submit your amount — it stays invisible until you reveal.
          </p>
          <PlaceBidForm
            auctionId={auctionId}
            minBid={auction.min_bid}
            onBidSuccess={handleBidSuccess}
          />
        </div>
      )}

      {/* Reveal section (only when ended / reveal phase) */}
      {status === "reveal" && (
        <div className="mt-10 border border-border/40 p-6 md:p-8">
          <h2 className="font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight">Reveal Your Bid</h2>
          <p className="mt-2 font-mono text-xs text-muted-foreground mb-4">
            Deadline passed. Reveal your sealed bid to compete. Highest revealed bid wins.
          </p>

          {revealResult && (
            <div className={cn(
              "border px-4 py-3 font-mono text-sm mb-4",
              revealResult.startsWith("Error") ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-accent/50 bg-accent/10 text-accent"
            )}>{revealResult}</div>
          )}

          <button onClick={handleFetchRecords} disabled={fetchingRecords || !address}
            className="border border-foreground/20 px-4 py-2 font-mono text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-all disabled:opacity-50 mb-4">
            {fetchingRecords ? "Loading..." : "Load my bid records"}
          </button>

          {bidRecords.length > 0 && (
            <div className="space-y-3 mt-2">
              {bidRecords.map((record, i) => (
                <div key={i} className="border border-border/40 p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-foreground">Bid Record #{i + 1}</p>
                    <p className="font-mono text-[10px] text-muted-foreground truncate mt-1">
                      {(typeof record === "string" ? record : JSON.stringify(record)).slice(0, 80)}...
                    </p>
                  </div>
                  <button onClick={() => handleRevealBid(record)} disabled={revealLoading}
                    className="border border-purple-500/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-purple-400 hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50 whitespace-nowrap">
                    {revealLoading ? "..." : "Reveal"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settle */}
      {status === "reveal" && highestBid > 0 && (
        <div className="mt-6 border border-border/40 p-6">
          <h2 className="font-[var(--font-bebas)] text-2xl tracking-tight mb-3">Settle Auction</h2>
          {highestBidder && (
            <p className="font-mono text-xs text-muted-foreground mb-3">
              Winner: <span className="text-accent">{highestBidder.slice(0, 12)}...{highestBidder.slice(-6)}</span>
              {highestBidder === address && <span className="text-accent ml-1">(You)</span>}
            </p>
          )}
          {settleResult && <div className="border border-accent/50 bg-accent/10 px-4 py-3 font-mono text-sm text-accent mb-3">{settleResult}</div>}
          <button onClick={handleSettle} disabled={settleLoading || !address}
            className="border border-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50">
            {settleLoading ? "Settling..." : "Settle Auction"}
          </button>
        </div>
      )}

      {/* Settled results */}
      {status === "settled" && highestBid > 0 && (
        <div className="mt-10 border border-accent/50 bg-accent/10 p-6">
          <h2 className="font-[var(--font-bebas)] text-2xl tracking-tight mb-3">Auction Settled</h2>
          <div className="space-y-2 font-mono text-sm">
            <p>Winning bid: <span className="text-accent font-bold">{formatCredits(highestBid)} credits</span></p>
            {highestBidder && <p>Winner: <span className="text-foreground">{highestBidder.slice(0, 12)}...{highestBidder.slice(-6)}</span></p>}
          </div>
        </div>
      )}

      {/* Latest bids */}
      <div className="mt-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Bids</span>
        <h2 className="mt-2 font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight mb-4">Latest Bids</h2>
        <LatestBids
          bidCount={bidCount}
          highestBid={highestBid}
          highestBidder={highestBidder}
          isEnded={isEnded}
          currentBlock={currentBlock}
          endBlock={auction.end_block}
        />
      </div>
    </div>
  )
}
