"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { SILENTBID_PROGRAM_ID, SILENTBID_FEE } from "@/lib/auction-contracts"
import { stringToField, getWalletErrorMessage } from "@/lib/aleo"
import { networkName } from "@/lib/chain-config"

const inputClass = cn(
  "mt-2 w-full border border-border bg-input/50 px-4 py-3 font-mono text-sm",
  "placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent",
)
const labelClass = "block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"

// Aleo testnet blocks ≈ 5s apart (SDK default estimate)
const DURATION_OPTIONS = [
  { value: "3m", label: "3 min (quick test)", blocks: 36 },
  { value: "10m", label: "10 min", blocks: 120 },
  { value: "30m", label: "30 min", blocks: 360 },
  { value: "1h", label: "1 hr", blocks: 720 },
  { value: "6h", label: "6 hr", blocks: 4320 },
  { value: "1d", label: "1 day", blocks: 17280 },
]

const GRACE_OPTIONS = [
  { value: "3m", label: "3 min", blocks: 36 },
  { value: "10m", label: "10 min", blocks: 120 },
  { value: "1h", label: "1 hr", blocks: 720 },
  { value: "1d", label: "1 day", blocks: 17280 },
]

type Step = "form" | "submitting" | "done"

export function CreateAuctionForm() {
  const router = useRouter()
  const { address, executeTransaction } = useWallet()

  const [step, setStep] = useState<Step>("form")
  const [itemName, setItemName] = useState("")
  const [minBid, setMinBid] = useState("")
  const [maxBid, setMaxBid] = useState("")
  const [duration, setDuration] = useState(DURATION_OPTIONS[0].value)
  const [grace, setGrace] = useState(GRACE_OPTIONS[0].value)
  const [error, setError] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)
  const [newAuctionId, setNewAuctionId] = useState<string | null>(null)

  const durationBlocks = DURATION_OPTIONS.find((d) => d.value === duration)?.blocks ?? 36
  const graceBlocks = GRACE_OPTIONS.find((g) => g.value === grace)?.blocks ?? 36

  async function handleCreate() {
    setError(null)
    if (!address || !executeTransaction) {
      setError("Connect your wallet first.")
      return
    }
    if (!itemName.trim()) {
      setError("Item name is required.")
      return
    }
    const minBidVal = parseInt(minBid, 10)
    const maxBidVal = parseInt(maxBid, 10)
    if (isNaN(minBidVal) || minBidVal <= 0) {
      setError("Minimum bid must be positive (microUSDC).")
      return
    }
    if (isNaN(maxBidVal) || maxBidVal < minBidVal) {
      setError("Maximum bid (escrow ceiling) must be ≥ minimum bid.")
      return
    }

    setStep("submitting")
    try {
      const inputs = [
        stringToField(itemName.trim()),
        `${minBidVal}u64`,
        `${maxBidVal}u64`,
        `${durationBlocks}u32`,
        `${graceBlocks}u32`,
      ]

      const result = await executeTransaction({
        program: SILENTBID_PROGRAM_ID,
        function: "create_auction",
        inputs,
        fee: SILENTBID_FEE,
      })

      const resultUnknown = result as unknown as {
        transactionId?: string
        outputs?: unknown[]
      }
      setTxId(resultUnknown.transactionId || "pending")

      // Best-effort: if the wallet returned outputs, try to extract auction_id
      // from the first (receipt) record so we can deep-link to it after confirmation.
      let extracted: string | null = null
      const outs = resultUnknown.outputs
      if (Array.isArray(outs) && outs.length > 0) {
        const rec = outs[0]
        const str = typeof rec === "string" ? rec : JSON.stringify(rec)
        const m = str.match(/auction_id[:\s]+(\d+field)/)
        if (m) extracted = m[1]
      }
      if (extracted) {
        setNewAuctionId(extracted)
        try {
          if (typeof localStorage !== "undefined") {
            const stored: string[] = JSON.parse(
              localStorage.getItem("silentbid_auction_ids") || "[]",
            )
            if (!stored.includes(extracted)) {
              stored.push(extracted)
              localStorage.setItem("silentbid_auction_ids", JSON.stringify(stored))
            }
          }
        } catch {
          /* ignore */
        }
      }

      setStep("done")
    } catch (e) {
      setError(getWalletErrorMessage(e))
      setStep("form")
    }
  }

  const steps = [
    { label: "1. Create", active: step === "form" },
    { label: "2. ZK Proof", active: step === "submitting" },
    { label: "3. Done", active: step === "done" },
  ]

  return (
    <div>
      <div className="flex gap-2 mb-8 flex-wrap">
        {steps.map((s, i) => (
          <span
            key={i}
            className={cn(
              "px-2 py-1 border font-mono text-[10px] uppercase tracking-widest transition-colors",
              s.active
                ? "border-accent text-accent"
                : i < steps.findIndex((st) => st.active)
                  ? "border-accent/30 text-accent/60"
                  : "border-border/40 text-muted-foreground/40",
            )}
          >
            {s.label}
          </span>
        ))}
      </div>

      {step === "form" && (
        <div className="space-y-6">
          {error && (
            <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive break-all">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Item Name (max 25 chars)</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Rare NFT Collection"
              maxLength={25}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Minimum bid (microUSDC)</label>
              <input
                type="number"
                value={minBid}
                onChange={(e) => setMinBid(e.target.value)}
                placeholder="1000000"
                min={1}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Maximum bid / escrow ceiling</label>
              <input
                type="number"
                value={maxBid}
                onChange={(e) => setMaxBid(e.target.value)}
                placeholder="10000000"
                min={1}
                className={inputClass}
              />
            </div>
          </div>
          <p className="-mt-3 font-mono text-[10px] text-muted-foreground/60">
            1 tUSDC = 1,000,000 microUSDC. Every bidder escrows the same max_bid so the
            public transfer leaks no information about real bid amounts until reveal.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bidding window</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={cn(inputClass, "cursor-pointer appearance-none")}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.blocks} blocks)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Reveal window (grace)</label>
              <select
                value={grace}
                onChange={(e) => setGrace(e.target.value)}
                className={cn(inputClass, "cursor-pointer appearance-none")}
              >
                {GRACE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.blocks} blocks)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!address || !itemName.trim() || !minBid || !maxBid}
            className={cn(
              "w-full border border-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent",
              "hover:bg-accent hover:text-accent-foreground transition-all duration-200",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            Create Auction
          </button>
        </div>
      )}

      {step === "submitting" && (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-muted-foreground animate-pulse">
            Generating zero-knowledge proof…
          </p>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
            30–60 seconds. Approve the transaction in your wallet.
          </p>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="border border-accent/50 bg-accent/10 px-4 py-3 font-mono text-sm text-accent break-all">
            Auction created! TX: {txId?.slice(0, 20)}…
          </div>
          {newAuctionId && (
            <p className="font-mono text-[10px] text-muted-foreground break-all">
              auction_id: <span className="text-foreground">{newAuctionId}</span>
            </p>
          )}
          <p className="font-mono text-[10px] text-muted-foreground">
            Your auction is being confirmed on {networkName}. It will appear in the list shortly.
          </p>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => router.push("/auctions")}
              className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-accent-foreground transition-all"
            >
              View Auctions
            </button>
            <button
              onClick={() => {
                setStep("form")
                setItemName("")
                setMinBid("")
                setMaxBid("")
                setTxId(null)
                setNewAuctionId(null)
                setError(null)
              }}
              className="border border-border/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
