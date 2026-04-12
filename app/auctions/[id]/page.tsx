"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { useEffect, useState, useCallback } from "react"
import { PlaceBidForm } from "./place-bid-form"
import { LatestBids } from "./latest-bids"
import { cn } from "@/lib/utils"
import { networkName } from "@/lib/chain-config"
import { SILENTBID_PROGRAM_ID, SILENTBID_FEE } from "@/lib/auction-contracts"
import { fieldToString, getWalletErrorMessage } from "@/lib/aleo"
import {
  fetchAuctionInfo,
  fetchBidCount,
  fetchHighestBid,
  fetchHighestBidder,
  fetchUsdcBalance,
  getAuctionStatus,
  formatCredits,
  type AuctionInfo,
  type AuctionPhase,
} from "@/lib/silentbid"
import { MintUsdcButton } from "@/components/mint-usdc-button"

async function getLatestHeight() {
  const mod = await import("@/lib/aleo-client")
  return mod.getLatestHeight()
}

function statusLabel(s: AuctionPhase) {
  switch (s) {
    case "active": return "Live"
    case "reveal": return "Reveal Phase"
    case "grace_expired": return "Awaiting Settle"
    case "settled": return "Settled"
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

type BidRecordLike = string | Record<string, unknown>

export default function AuctionDetailPage() {
  const params = useParams()
  const auctionId = decodeURIComponent(params.id as string)
  const { address, executeTransaction, requestRecords } = useWallet()

  const [auction, setAuction] = useState<AuctionInfo | null>(null)
  const [bidCount, setBidCount] = useState(0)
  const [highestBid, setHighestBid] = useState(0)
  const [highestBidder, setHighestBidder] = useState<string | null>(null)
  const [currentBlock, setCurrentBlock] = useState(0)
  const [status, setStatus] = useState<AuctionPhase>("active")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [bidsRefreshKey, setBidsRefreshKey] = useState(0)
  const handleBidSuccess = useCallback(() => setBidsRefreshKey((k) => k + 1), [])

  // Wallet USDC balance
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)

  // Reveal state
  const [revealLoading, setRevealLoading] = useState(false)
  const [revealResult, setRevealResult] = useState<string | null>(null)
  const [bidRecords, setBidRecords] = useState<BidRecordLike[]>([])
  const [fetchingRecords, setFetchingRecords] = useState(false)

  // Settle / claim state
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)

  const fetchAuction = useCallback(async () => {
    try {
      const [info, count, highest, bidder, height] = await Promise.all([
        fetchAuctionInfo(auctionId),
        fetchBidCount(auctionId),
        fetchHighestBid(auctionId),
        fetchHighestBidder(auctionId),
        getLatestHeight(),
      ])
      if (!info) {
        setFetchError("Auction not found on " + networkName)
        return
      }
      setAuction(info)
      setBidCount(count)
      setHighestBid(highest)
      setHighestBidder(bidder)
      setCurrentBlock(height)
      setStatus(getAuctionStatus(info, height))
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load auction")
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    fetchAuction()
  }, [fetchAuction])

  useEffect(() => {
    const i = setInterval(fetchAuction, 15000)
    return () => clearInterval(i)
  }, [fetchAuction])

  useEffect(() => {
    if (bidsRefreshKey > 0) fetchAuction()
  }, [bidsRefreshKey, fetchAuction])

  useEffect(() => {
    if (!address) {
      setUsdcBalance(null)
      return
    }
    fetchUsdcBalance(address).then(setUsdcBalance).catch(() => setUsdcBalance(null))
  }, [address, actionResult])

  const handleFetchRecords = async () => {
    if (!address || !requestRecords) return
    setFetchingRecords(true)
    try {
      const records = await requestRecords(SILENTBID_PROGRAM_ID)
      const list = Array.isArray(records) ? records : records ? [records] : []
      setBidRecords(
        list.filter((r: unknown) => {
          const data = typeof r === "string" ? r : JSON.stringify(r)
          return data.includes("is_revealed") && data.includes(auctionId)
        }) as BidRecordLike[],
      )
    } catch {
      /* ignore */
    } finally {
      setFetchingRecords(false)
    }
  }

  const handleRevealBid = async (record: BidRecordLike) => {
    if (!address || !executeTransaction) return
    setRevealLoading(true)
    setRevealResult(null)
    try {
      const recordStr = typeof record === "string" ? record : JSON.stringify(record)
      const result = await executeTransaction({
        program: SILENTBID_PROGRAM_ID,
        function: "reveal_bid",
        inputs: [recordStr],
        fee: SILENTBID_FEE,
      })
      setRevealResult(`Bid revealed! TX: ${result?.transactionId?.slice(0, 16) || "pending"}`)
      setTimeout(fetchAuction, 5000)
    } catch (e) {
      setRevealResult(`Error: ${getWalletErrorMessage(e)}`)
    } finally {
      setRevealLoading(false)
    }
  }

  async function runAction(key: string, fn: string, inputs: string[], followUp?: string) {
    if (!address || !executeTransaction || !auction) return
    setActionLoading(key)
    setActionResult(null)
    try {
      const result = await executeTransaction({
        program: SILENTBID_PROGRAM_ID,
        function: fn,
        inputs,
        fee: SILENTBID_FEE,
      })
      setActionResult(
        `${followUp || "Done"}! TX: ${result?.transactionId?.slice(0, 16) || "pending"}`,
      )
      setTimeout(fetchAuction, 5000)
    } catch (e) {
      setActionResult(`Error: ${getWalletErrorMessage(e)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSettle = () =>
    runAction("settle", "settle_auction", [auctionId], "Settled")
  const handleClaimCreator = () =>
    runAction(
      "creator",
      "claim_creator_payment",
      [auctionId, `${highestBid}u64`],
      "Creator paid",
    )
  const handleClaimWinnerOverpay = () => {
    if (!auction) return
    const overpay = auction.max_bid - highestBid
    return runAction(
      "winner",
      "claim_winner_overpay",
      [auctionId, `${overpay}u64`],
      `Refunded ${formatCredits(overpay)} tUSDC`,
    )
  }
  const handleClaimLoserRefund = () => {
    if (!auction) return
    return runAction(
      "loser",
      "claim_loser_refund",
      [auctionId, `${auction.max_bid}u64`],
      `Refunded ${formatCredits(auction.max_bid)} tUSDC`,
    )
  }

  let itemName = "…"
  if (auction) {
    try {
      itemName = fieldToString(auction.item_name) || "UNNAMED"
    } catch {
      itemName = "AUCTION"
    }
  }

  const isCreator = !!address && !!auction && address === auction.creator
  const isWinner = !!address && !!highestBidder && address === highestBidder
  const isActive = status === "active"

  if (loading) {
    return (
      <div className="px-6 md:px-12 py-20 text-center">
        <p className="font-mono text-sm text-muted-foreground animate-pulse">
          Loading auction from {networkName}…
        </p>
      </div>
    )
  }

  if (fetchError || !auction) {
    return (
      <div className="px-6 md:px-12 py-20 text-center">
        <p className="font-mono text-sm text-destructive">
          {fetchError || "Auction not found"}
        </p>
        <Link
          href="/auctions"
          className="mt-4 inline-block font-mono text-xs uppercase tracking-widest text-accent hover:underline"
        >
          &larr; All auctions
        </Link>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-12 py-12 md:py-20 max-w-5xl">
      <Link
        href="/auctions"
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors"
      >
        &larr; All auctions
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-[var(--font-bebas)] text-4xl md:text-6xl tracking-tight">
              {itemName.toUpperCase()}
            </h1>
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border",
                status === "active" && "border-accent/60 text-accent",
                status === "reveal" && "border-purple-500/60 text-purple-400",
                (status === "grace_expired" || status === "settled") &&
                  "border-muted-foreground/40 text-muted-foreground",
              )}
            >
              {statusLabel(status)}
            </span>
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
            {auction.creator.slice(0, 16)}…{auction.creator.slice(-6)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
            Sealed-bid auction · {networkName} · {SILENTBID_PROGRAM_ID}
          </p>
        </div>
        <MintUsdcButton className="min-w-[260px]" />
      </div>

      <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-6 font-mono text-sm">
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Min bid
          </span>
          <span className="text-foreground">{formatCredits(auction.min_bid)} tUSDC</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Max bid (escrow)
          </span>
          <span className="text-foreground">{formatCredits(auction.max_bid)} tUSDC</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Sealed bids
          </span>
          <span className="text-foreground">{bidCount}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
            {status === "active" ? "Bids close" : "End block"}
          </span>
          <span className={cn("text-foreground", status === "active" && "text-accent")}>
            {status === "active" && currentBlock > 0
              ? `~${blocksToTime(auction.end_block - currentBlock)}`
              : `#${auction.end_block}`}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Highest bid
          </span>
          <span className={cn("text-foreground", status === "active" && "text-purple-400")}>
            {status === "active"
              ? "hidden"
              : highestBid > 0
                ? `${formatCredits(highestBid)} tUSDC`
                : "—"}
          </span>
        </div>
      </div>

      {usdcBalance !== null && (
        <p className="mt-4 font-mono text-[10px] text-muted-foreground">
          Your wallet balance: <span className="text-foreground">{formatCredits(usdcBalance)} tUSDC</span>
        </p>
      )}

      <div className="mt-6 border border-purple-500/30 bg-purple-500/5 p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-purple-400">
          Encrypted (ZK sealed bid)
        </span>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          All bids are private ZK records on Aleo. Only a BHP256 commitment is stored
          on-chain. Bid amounts stay invisible until you reveal. Escrow uses{" "}
          <code>silentbid_usdc.aleo</code> so no real credits move.
        </p>
      </div>

      {isActive && (
        <div className="mt-10">
          <h2 className="font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight">
            Place sealed bid
          </h2>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Your bid is a private ZK record. It stays invisible until you reveal.
          </p>
          <PlaceBidForm
            auctionId={auctionId}
            minBid={auction.min_bid}
            maxBid={auction.max_bid}
            onBidSuccess={handleBidSuccess}
          />
        </div>
      )}

      {status === "reveal" && (
        <div className="mt-10 border border-border/40 p-6 md:p-8">
          <h2 className="font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight">
            Reveal your bid
          </h2>
          <p className="mt-2 font-mono text-xs text-muted-foreground mb-4">
            Deadline passed. Reveal your sealed bid to compete. Reveals are only accepted
            between <code>end_block</code> ({auction.end_block}) and{" "}
            <code>grace_block</code> ({auction.grace_block}).
          </p>

          {revealResult && (
            <div
              className={cn(
                "border px-4 py-3 font-mono text-sm mb-4 break-all",
                revealResult.startsWith("Error")
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-accent/50 bg-accent/10 text-accent",
              )}
            >
              {revealResult}
            </div>
          )}

          <button
            onClick={handleFetchRecords}
            disabled={fetchingRecords || !address}
            className="border border-foreground/20 px-4 py-2 font-mono text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-all disabled:opacity-50 mb-4"
          >
            {fetchingRecords ? "Loading…" : "Load my bid records"}
          </button>

          {bidRecords.length > 0 && (
            <div className="space-y-3 mt-2">
              {bidRecords.map((record, i) => (
                <div
                  key={i}
                  className="border border-border/40 p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-foreground">Bid record #{i + 1}</p>
                    <p className="font-mono text-[10px] text-muted-foreground truncate mt-1">
                      {(typeof record === "string" ? record : JSON.stringify(record)).slice(
                        0,
                        80,
                      )}
                      …
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevealBid(record)}
                    disabled={revealLoading}
                    className="border border-purple-500/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-purple-400 hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {revealLoading ? "…" : "Reveal"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(status === "grace_expired" || status === "settled") && (
        <div className="mt-10 border border-border/40 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight">
              {status === "settled" ? "Auction settled" : "Settle auction"}
            </h2>
            {highestBidder ? (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Winner:{" "}
                <span className="text-accent">
                  {highestBidder.slice(0, 12)}…{highestBidder.slice(-6)}
                </span>
                {isWinner && <span className="text-accent ml-1">(You)</span>}
                <br />
                Winning bid:{" "}
                <span className="text-foreground">{formatCredits(highestBid)} tUSDC</span>
              </p>
            ) : (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                No bids revealed. Creator can still sweep forfeited escrow.
              </p>
            )}
          </div>

          {actionResult && (
            <div
              className={cn(
                "border px-4 py-3 font-mono text-sm break-all",
                actionResult.startsWith("Error")
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-accent/50 bg-accent/10 text-accent",
              )}
            >
              {actionResult}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {status === "grace_expired" && (
              <button
                onClick={handleSettle}
                disabled={actionLoading !== null || !address}
                className="border border-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50"
              >
                {actionLoading === "settle" ? "Settling…" : "Settle"}
              </button>
            )}

            {status === "settled" && isCreator && highestBid > 0 && (
              <button
                onClick={handleClaimCreator}
                disabled={actionLoading !== null}
                className="border border-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50"
              >
                {actionLoading === "creator"
                  ? "Claiming…"
                  : `Claim ${formatCredits(highestBid)} tUSDC (creator)`}
              </button>
            )}

            {status === "settled" && isWinner && (
              <button
                onClick={handleClaimWinnerOverpay}
                disabled={actionLoading !== null}
                className="border border-purple-500/60 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-purple-400 hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50"
              >
                {actionLoading === "winner"
                  ? "Refunding…"
                  : `Refund overpay ${formatCredits(auction.max_bid - highestBid)} tUSDC`}
              </button>
            )}

            {status === "settled" && !isWinner && !isCreator && address && (
              <button
                onClick={handleClaimLoserRefund}
                disabled={actionLoading !== null}
                className="border border-foreground/40 px-5 py-2.5 font-mono text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-all disabled:opacity-50"
              >
                {actionLoading === "loser"
                  ? "Refunding…"
                  : `Refund my ${formatCredits(auction.max_bid)} tUSDC`}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Bids
        </span>
        <h2 className="mt-2 font-[var(--font-bebas)] text-2xl md:text-3xl tracking-tight mb-4">
          Latest bids
        </h2>
        <LatestBids
          auctionId={auctionId}
          bidCount={bidCount}
          highestBid={highestBid}
          highestBidder={highestBidder}
          isEnded={status !== "active"}
          currentBlock={currentBlock}
          endBlock={auction.end_block}
        />
      </div>
    </div>
  )
}
