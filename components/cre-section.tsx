"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const workflows = [
  {
    step: "01",
    name: "Place Sealed Bid",
    route: "place_bid(auction_id, amount, salt, max_bid)",
    private: "Your bid amount and salt are stored as a private Aleo record in your wallet. Only you can decrypt it. A BHP256 commitment binds your bid cryptographically.",
    onchain: "Escrows max_bid tUSDC into the program via silentbid_usdc.aleo. Commitment hash stored publicly. Bid count incremented.",
    accent: "accent",
  },
  {
    step: "02",
    name: "Reveal Bid",
    route: "reveal_bid(bid_record)",
    private: "Your wallet provides the private Bid record. The ZK proof verifies the commitment matches without exposing inputs to other users.",
    onchain: "Bid amount becomes public. If higher than current highest, updates highest_bids and highest_bidders mappings. Revealed flag set on-chain.",
    accent: "amber-500",
  },
  {
    step: "03",
    name: "Settle & Claim",
    route: "settle_auction / claim_* / forfeit_nonrevealer",
    private: "Settlement is permissionless — anyone can trigger it after the grace period. Claims are pull-based: each participant claims their own funds.",
    onchain: "Winner pays winning bid, gets overpay refunded. Losers get full max_bid refund. Creator receives winning amount. Non-revealers forfeit escrow to creator.",
    accent: "emerald-500",
  },
]

export function CreSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !cardsRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        x: -60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      })

      const cards = cardsRef.current?.querySelectorAll(":scope > div")
      if (cards) {
        gsap.from(cards, {
          y: 60,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="cre" className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12">
      {/* Section header */}
      <div ref={headerRef} className="mb-16 flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            03 / Aleo ZK Flow
          </span>
          <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight">
            AUCTION LIFECYCLE
          </h2>
        </div>
        <p className="hidden md:block max-w-xs font-mono text-xs text-muted-foreground text-right leading-relaxed">
          Three on-chain phases powered by Leo transitions and ZK proofs. Privacy until reveal, transparency after.
        </p>
      </div>

      {/* Workflow cards */}
      <div ref={cardsRef} className="grid gap-6 md:grid-cols-3">
        {workflows.map((wf) => (
          <div
            key={wf.step}
            className="group relative border border-border/40 p-6 md:p-8 flex flex-col gap-6 hover:border-accent/60 transition-all duration-500"
          >
            {/* Step number + name */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Step {wf.step}
              </span>
              <h3 className="mt-2 font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight group-hover:text-accent transition-colors duration-300">
                {wf.name}
              </h3>
              <code className="mt-1 block font-mono text-[11px] text-accent/80">
                {wf.route}
              </code>
            </div>

            {/* Private (ZK) */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                Private (ZK)
              </span>
              <p className="mt-2 font-mono text-xs text-muted-foreground leading-relaxed">
                {wf.private}
              </p>
            </div>

            {/* On-chain */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                On-chain
              </span>
              <p className="mt-2 font-mono text-xs text-foreground/80 leading-relaxed">
                {wf.onchain}
              </p>
            </div>

            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute top-0 right-0 w-full h-[1px] bg-accent" />
              <div className="absolute top-0 right-0 w-[1px] h-full bg-accent" />
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-12 border border-border/30 p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-accent shrink-0">
          Key point
        </span>
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          During the active phase, bid amounts and identities are invisible — stored only as private ZK records in each bidder&apos;s wallet.
          After the reveal deadline, bid amounts become public on-chain. Settlement is fully transparent and permissionless.
          Non-revealers forfeit their escrow to the auction creator.
        </p>
      </div>
    </section>
  )
}
