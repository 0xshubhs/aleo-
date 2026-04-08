import type { Metadata } from "next"
import { SilentBidLogo } from "@/components/silentbid-logo"
import { AleoConnectButton } from "@/components/aleo-connect-button"

export const metadata: Metadata = {
  title: "Auctions — SilentBid",
  description: "Sealed-bid auctions with Aleo zero-knowledge privacy.",
}

export default function AuctionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative min-h-screen">
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
      <header className="relative z-20 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 gap-4 flex-wrap">
          <SilentBidLogo />
          <AleoConnectButton />
        </div>
      </header>
      <div className="relative z-10">{children}</div>
    </main>
  )
}
