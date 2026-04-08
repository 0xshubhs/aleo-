"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "../wallet/WalletButton";
import { cn } from "../lib/utils";

const NAV_LINKS = [
  { href: "/auctions", label: "Auctions" },
  { href: "/my-bids", label: "My Bids" },
  { href: "/credits", label: "Credits" },
  { href: "/explorer", label: "Explorer" },
] as const;

function SilentBidLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="60" height="60" rx="0" fill="var(--accent)" />
        <path d="M20 20L44 20L44 44L20 44Z" fill="none" stroke="black" strokeWidth="3" />
        <path d="M28 32L36 32M32 28L32 36" stroke="black" strokeWidth="2.5" strokeLinecap="square" />
      </svg>
      <span className="font-[var(--font-display)] text-2xl tracking-wide text-foreground group-hover:text-accent transition-colors">
        SILENTBID
      </span>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[100] border-b border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 md:px-12 py-4 gap-4">
        <SilentBidLogo />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "font-mono text-xs uppercase tracking-widest transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
          <WalletButton />
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <WalletButton />
          <button
            type="button"
            aria-label="Toggle menu"
            className="p-2 text-foreground hover:text-accent transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-200",
          menuOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pb-4 px-6 border-t border-border/20 pt-2 flex flex-col gap-2">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "font-mono text-xs uppercase tracking-widest py-2 transition-colors",
                pathname === href ? "text-accent" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
