import Link from "next/link"
import { Suspense } from "react"
import { AuctionStatusTabs } from "@/components/auction-status-tabs"
import { AuctionList } from "@/components/auction-list"
import { MintUsdcButton } from "@/components/mint-usdc-button"
import { cn } from "@/lib/utils"
import type { AuctionStatus } from "@/lib/auction-contracts"

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filter =
    status === "active" || status === "upcoming" || status === "ended"
      ? (status as AuctionStatus)
      : undefined

  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            Auctions
          </span>
          <h1 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight">
            SEALED-BID
          </h1>
          <p className="mt-6 max-w-lg font-mono text-sm text-muted-foreground leading-relaxed">
            Privacy-first sealed-bid auctions on Aleo. Bids are private ZK records, escrowed
            in test USDC. Only a BHP256 commitment is public until you reveal.
          </p>
        </div>
        <MintUsdcButton className="min-w-[260px]" />
      </div>

      <div className="mb-10 flex items-center justify-between gap-4 flex-wrap">
        <Suspense fallback={<div className="h-9 w-48 bg-muted/30 animate-pulse" />}>
          <AuctionStatusTabs />
        </Suspense>
        <Link
          href="/auctions/new"
          className={cn(
            "border border-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-accent",
            "hover:bg-accent hover:text-accent-foreground transition-all duration-200",
          )}
        >
          + Create auction
        </Link>
      </div>

      <AuctionList filter={filter} />
    </div>
  )
}
