"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { SILENTBID_PROGRAM_ID, SILENTBID_FEE } from "@/lib/auction-contracts"
import { getWalletErrorMessage } from "@/lib/aleo"
import { formatCredits, generateSalt } from "@/lib/silentbid"

const inputClass = cn(
  "mt-2 w-full border border-border bg-input/50 px-4 py-3 font-mono text-sm",
  "placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent",
)
const labelClass = "block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"

export function PlaceBidForm({
  auctionId,
  minBid,
  maxBid,
  onBidSuccess,
}: {
  auctionId: string
  minBid: number
  maxBid: number
  onBidSuccess?: () => void
}) {
  const { address, executeTransaction } = useWallet()
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!address) {
      setError("Connect your wallet first.")
      return
    }
    if (!executeTransaction) {
      setError("Wallet not ready.")
      return
    }

    const amountNum = parseInt(amount, 10)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number (microUSDC).")
      return
    }
    if (amountNum < minBid) {
      setError(`Amount must be at least ${minBid} microUSDC (the minimum bid).`)
      return
    }
    if (amountNum > maxBid) {
      setError(`Amount must be at most ${maxBid} microUSDC (the escrow ceiling).`)
      return
    }

    setSubmitting(true)
    try {
      const salt = generateSalt()
      const result = await executeTransaction({
        program: SILENTBID_PROGRAM_ID,
        function: "place_bid",
        inputs: [auctionId, `${amountNum}u64`, salt, `${maxBid}u64`],
        fee: SILENTBID_FEE,
      })
      setTxId(result?.transactionId || "pending")
      setIsSuccess(true)
      onBidSuccess?.()
    } catch (err: unknown) {
      setError(getWalletErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-sm space-y-5">
      <div className="border border-accent/50 bg-accent/10 px-4 py-3 font-mono text-[10px] text-accent">
        Sealed bid via Aleo ZK: your bid is a private record. Only a BHP256 commitment is
        stored publicly. Every bidder escrows the same <code>max_bid</code>, so the public
        transfer amount reveals nothing about your real bid until you reveal.
      </div>

      {error && (
        <div role="alert" className="border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive break-all">
          {error}
        </div>
      )}
      {isSuccess && (
        <div role="status" className="border border-accent/50 bg-accent/10 px-4 py-3 font-mono text-sm text-accent">
          Sealed bid placed! Tx: {txId?.slice(0, 16)}…
          <br />
          <span className="text-[10px] text-muted-foreground">
            {formatCredits(maxBid)} tUSDC escrowed into the program. Reveal after the
            auction deadline to compete for the win.
          </span>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setIsSuccess(false)
                setTxId(null)
                setAmount("")
                setError(null)
              }}
              className="border border-accent/40 px-3 py-1 font-mono text-[10px] uppercase tracking-widest hover:bg-accent/20 transition-colors"
            >
              Place another bid
            </button>
          </div>
        </div>
      )}

      <div className="font-mono text-[10px] text-muted-foreground/70 space-y-1">
        <p>Min bid: <span className="text-foreground">{minBid} µUSDC ({formatCredits(minBid)} tUSDC)</span></p>
        <p>Max bid / escrow: <span className="text-foreground">{maxBid} µUSDC ({formatCredits(maxBid)} tUSDC)</span></p>
      </div>

      <div>
        <label htmlFor="amount" className={labelClass}>
          Bid amount (microUSDC)
        </label>
        <input
          id="amount"
          type="number"
          inputMode="numeric"
          placeholder={`${minBid}–${maxBid}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          disabled={submitting}
          min={minBid}
          max={maxBid}
          required
        />
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
          Your bid amount stays private in a ZK record. A random salt is auto-generated
          for the commitment.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting || !amount || !address}
        aria-busy={submitting}
        className={cn(
          "mt-4 border border-foreground/20 px-6 py-3 font-mono text-xs uppercase tracking-widest",
          "hover:border-accent hover:text-accent transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        )}
      >
        {submitting ? "Generating ZK proof…" : isSuccess ? "Bid placed" : "Submit sealed bid"}
      </button>

      <div className="mt-4 font-mono text-[10px] text-muted-foreground/70 border border-border/40 px-3 py-2 space-y-1">
        <p>
          Calls <code>place_bid(auction_id, amount, salt, max_bid)</code> on{" "}
          <code>{SILENTBID_PROGRAM_ID}</code>. Escrows <code>max_bid</code> tUSDC into the
          program and returns a private <code>Bid</code> record to your wallet.
        </p>
      </div>
    </form>
  )
}
