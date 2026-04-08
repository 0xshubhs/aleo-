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

const DURATION_OPTIONS = [
  { value: "5m", label: "5 min (testing)", blocks: 60 },
  { value: "30m", label: "30 min", blocks: 360 },
  { value: "1h", label: "1 hr", blocks: 720 },
  { value: "6h", label: "6 hr", blocks: 4320 },
  { value: "1d", label: "1 day", blocks: 17280 },
]

type Step = "form" | "submitting" | "done"

export function CreateAuctionForm() {
  const router = useRouter()
  const { address, executeTransaction } = useWallet()

  const [step, setStep] = useState<Step>("form")
  const [itemName, setItemName] = useState("")
  const [minBid, setMinBid] = useState("")
  const [duration, setDuration] = useState(DURATION_OPTIONS[0].value)
  const [error, setError] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)

  const durationBlocks = DURATION_OPTIONS.find((d) => d.value === duration)?.blocks ?? 60

  async function handleCreate() {
    setError(null)

    if (!address || !executeTransaction) {
      setError("Connect your wallet first.")
      return
    }

    if (!itemName.trim()) { setError("Item name is required."); return }
    const minBidVal = parseInt(minBid, 10)
    if (isNaN(minBidVal) || minBidVal <= 0) { setError("Minimum bid must be positive (microcredits)."); return }

    setStep("submitting")
    try {
      const inputs = [
        stringToField(itemName.trim()),
        `${minBidVal}u64`,
        `${durationBlocks}u32`,
      ]

      const result = await executeTransaction({
        program: SILENTBID_PROGRAM_ID,
        function: "create_auction",
        inputs,
        fee: SILENTBID_FEE,
      })

      setTxId(result?.transactionId || "pending")
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
      {/* Step indicator */}
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
                  : "border-border/40 text-muted-foreground/40"
            )}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Step: Form */}
      {step === "form" && (
        <div className="space-y-6">
          {error && (
            <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive">
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

          <div>
            <label className={labelClass}>Minimum bid (microcredits)</label>
            <input
              type="number"
              value={minBid}
              onChange={(e) => setMinBid(e.target.value)}
              placeholder="100"
              min={1}
              className={inputClass}
            />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
              1 credit = 1,000,000 microcredits
            </p>
          </div>

          <div>
            <label className={labelClass}>Duration</label>
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

          <button
            onClick={handleCreate}
            disabled={!address || !itemName.trim() || !minBid}
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

      {/* Step: Submitting */}
      {step === "submitting" && (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-muted-foreground animate-pulse">
            Generating zero-knowledge proof...
          </p>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
            This may take 30-60 seconds. Please wait and approve the transaction in your wallet.
          </p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="border border-accent/50 bg-accent/10 px-4 py-3 font-mono text-sm text-accent">
            Auction created! TX: {txId?.slice(0, 20)}...
          </div>

          <p className="font-mono text-[10px] text-muted-foreground">
            Your auction is being confirmed on {networkName}. It will appear in the auctions list once the transaction finalizes.
          </p>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => router.push("/auctions")}
              className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-accent-foreground transition-all"
            >
              View Auctions
            </button>
            <button
              onClick={() => { setStep("form"); setItemName(""); setMinBid(""); setTxId(null); setError(null) }}
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
