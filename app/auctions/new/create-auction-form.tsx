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

// Poll the explorer until the create_auction tx is confirmed, then pull
// auction_id out of the finalize future's first argument.
async function resolveAuctionIdFromTx(submittedId: string): Promise<string | null> {
  if (!submittedId || submittedId === "pending") return null
  const mod = await import("@/lib/aleo-client")

  let txId: string | null = submittedId
  // Leo Wallet may return a transition id (au1...) instead of a tx id (at1...).
  if (submittedId.startsWith("au1")) {
    for (let i = 0; i < 40; i++) {
      txId = await mod.findTransactionIdByTransition(submittedId)
      if (txId) break
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  if (!txId) return null

  for (let i = 0; i < 40; i++) {
    const tx = await mod.getTransaction(txId)
    const transitions = tx?.execution?.transitions ?? []
    const t = transitions.find((x) => x?.function === "create_auction") ?? transitions[0]
    const future = t?.outputs?.find((o) => o?.type === "future")
    const value = typeof future?.value === "string" ? future.value : null
    if (value) {
      const m = value.match(/arguments:\s*\[\s*(\d+field)/)
      if (m) return m[1]
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
  return null
}

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

      // Leo Wallet sometimes broadcasts successfully but never resolves its
      // requestTransaction Promise, leaving the dapp hanging forever. Race
      // executeTransaction against a 3-minute timeout so the UI can recover.
      const WALLET_TIMEOUT_MS = 180_000
      const result = await Promise.race<unknown>([
        executeTransaction({
          program: SILENTBID_PROGRAM_ID,
          function: "create_auction",
          inputs,
          fee: SILENTBID_FEE,
        }),
        new Promise((_, rej) =>
          setTimeout(
            () => rej(new Error("WALLET_TIMEOUT")),
            WALLET_TIMEOUT_MS,
          ),
        ),
      ])

      const resultUnknown = result as unknown as {
        transactionId?: string
      }
      const submittedId = resultUnknown.transactionId || "pending"
      setTxId(submittedId)

      // Leo/Shield wallets only return { transactionId }. To get auction_id, poll
      // the explorer for the confirmed tx and read the first finalize argument.
      // Cap the whole lookup at 90s so the UI never hangs — user can still
      // paste the id manually via the Add-by-ID input on the auctions page.
      const extracted = await Promise.race<string | null>([
        resolveAuctionIdFromTx(submittedId),
        new Promise<null>((res) => setTimeout(() => res(null), 90_000)),
      ])
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
          // Register with server-side registry so all users can discover it
          fetch("/api/auctions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: extracted }),
          }).catch(() => {})
        } catch {
          /* ignore */
        }
      }

      setStep("done")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === "WALLET_TIMEOUT") {
        // Wallet may have broadcast the tx but silently dropped the promise.
        // Move to done so the user can check their wallet activity and paste
        // the auction_id manually via Add-by-ID on the auctions page.
        setTxId("unknown")
        setStep("done")
        return
      }
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
