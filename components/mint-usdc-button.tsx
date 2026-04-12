"use client"

import { useCallback, useEffect, useState } from "react"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { SILENTBID_USDC_PROGRAM_ID, SILENTBID_FEE } from "@/lib/auction-contracts"
import { fetchUsdcBalance, formatCredits } from "@/lib/silentbid"
import { getWalletErrorMessage } from "@/lib/aleo"
import { cn } from "@/lib/utils"

const QUICK_AMOUNTS = [100, 500, 1000, 5000] // in tUSDC
const DECIMALS = 1_000_000 // 6 decimals

export function MintUsdcButton({ className }: { className?: string }) {
  const { address, executeTransaction } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState("")

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance(null)
      return
    }
    try {
      const b = await fetchUsdcBalance(address)
      setBalance(b)
    } catch {
      setBalance(null)
    }
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleMint = async (amountUsdc: number) => {
    if (!address || !executeTransaction || amountUsdc <= 0) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const microUsdc = Math.floor(amountUsdc * DECIMALS)
      const result = await executeTransaction({
        program: SILENTBID_USDC_PROGRAM_ID,
        function: "mint_public",
        inputs: [`${microUsdc}u64`],
        fee: SILENTBID_FEE,
      })
      setMsg(`Minted ${amountUsdc.toLocaleString()} tUSDC. TX: ${result?.transactionId?.slice(0, 16) || "pending"}...`)
      setTimeout(refresh, 8000)
    } catch (e) {
      setErr(getWalletErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const handleCustomMint = () => {
    const val = parseFloat(customAmount)
    if (isNaN(val) || val <= 0) {
      setErr("Enter a valid amount")
      return
    }
    handleMint(val)
  }

  return (
    <div className={cn("border border-border/40 p-4 font-mono text-xs space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Test USDC balance
          </div>
          <div className="text-foreground text-sm">
            {balance === null
              ? address
                ? "..."
                : "connect wallet"
              : `${formatCredits(balance)} tUSDC`}
          </div>
        </div>
        <button
          onClick={() => refresh()}
          disabled={!address}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => handleMint(amt)}
            disabled={!address || busy}
            className={cn(
              "border border-accent px-3 py-1.5 text-[10px] uppercase tracking-widest text-accent",
              "hover:bg-accent hover:text-accent-foreground transition-all",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            {busy ? "..." : `${amt.toLocaleString()}`}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCustomMint() }}
          placeholder="Custom amount (tUSDC)"
          min={1}
          className={cn(
            "flex-1 border border-border bg-input/50 px-3 py-1.5 text-xs",
            "placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent",
          )}
          disabled={!address || busy}
        />
        <button
          onClick={handleCustomMint}
          disabled={!address || busy || !customAmount}
          className={cn(
            "border border-accent px-3 py-1.5 text-[10px] uppercase tracking-widest text-accent",
            "hover:bg-accent hover:text-accent-foreground transition-all",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          {busy ? "Minting..." : "Mint"}
        </button>
      </div>

      {msg && <p className="text-accent">{msg}</p>}
      {err && <p className="text-destructive break-all">{err}</p>}
    </div>
  )
}
