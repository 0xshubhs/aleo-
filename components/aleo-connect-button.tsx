"use client"

import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { useWalletModal } from "@provablehq/aleo-wallet-adaptor-react-ui"
import { Network } from "@provablehq/aleo-types"
import { useCallback } from "react"
import { cn } from "@/lib/utils"

export function AleoConnectButton({ className }: { className?: string }) {
  const { address, disconnect, connecting, connect, selectWallet, wallets } = useWallet()
  const { setVisible } = useWalletModal()

  const handleClick = useCallback(async () => {
    if (address) {
      await disconnect()
    } else {
      // Always use the modal — it handles wallet selection + connection properly
      setVisible(true)
    }
  }, [address, disconnect, setVisible])

  return (
    <div className={cn(className)}>
      <button
        onClick={handleClick}
        disabled={connecting}
        className="border border-accent/60 px-4 py-2 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-200 disabled:opacity-50"
      >
        {connecting
          ? "Connecting..."
          : address
          ? `${address.slice(0, 8)}...${address.slice(-4)}`
          : "Connect Wallet"}
      </button>
    </div>
  )
}
