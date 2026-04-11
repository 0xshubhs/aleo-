"use client"

import { useCallback, useEffect, useState } from "react"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { SILENTBID_USDC_PROGRAM_ID, SILENTBID_FEE } from "@/lib/auction-contracts"
import { fetchUsdcBalance, formatCredits } from "@/lib/silentbid"
import { getWalletErrorMessage } from "@/lib/aleo"
import { cn } from "@/lib/utils"

const DEFAULT_MINT = 100_000_000 // 100 USDC (6 decimals)

export function MintUsdcButton({ className }: { className?: string }) {
  const { address, executeTransaction } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

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

  const handleMint = async () => {
    if (!address || !executeTransaction) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const result = await executeTransaction({
        program: SILENTBID_USDC_PROGRAM_ID,
        function: "mint_public",
        inputs: [`${DEFAULT_MINT}u64`],
        fee: SILENTBID_FEE,
      })
      setMsg(`Minted 100 tUSDC. TX: ${result?.transactionId?.slice(0, 16) || "pending"}…`)
      setTimeout(refresh, 8000)
    } catch (e) {
      setErr(getWalletErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn("border border-border/40 p-4 font-mono text-xs space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Test USDC balance
          </div>
          <div className="text-foreground">
            {balance === null
              ? address
                ? "—"
                : "connect wallet"
              : `${formatCredits(balance)} tUSDC`}
          </div>
        </div>
        <button
          onClick={handleMint}
          disabled={!address || busy}
          className={cn(
            "border border-accent px-4 py-2 text-[10px] uppercase tracking-widest text-accent",
            "hover:bg-accent hover:text-accent-foreground transition-all",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          {busy ? "Minting…" : "Mint 100 tUSDC"}
        </button>
      </div>
      {msg && <p className="text-accent">{msg}</p>}
      {err && <p className="text-destructive break-all">{err}</p>}
    </div>
  )
}
