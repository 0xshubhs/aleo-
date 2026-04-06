"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "../wallet/WalletButton";

const NAV_LINKS = [
  { href: "/bio", label: "Bio" },
  { href: "/credits", label: "Credits" },
  { href: "/greeting", label: "Greeting" },
  { href: "/explorer", label: "Explorer" },
  { href: "/debug", label: "Debug" },
  { href: "/docs", label: "Docs" },
] as const;

function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "sm" ? 32 : size === "lg" ? 56 : 40;
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
      <svg width={dimensions} height={dimensions} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
        <rect x="2" y="2" width="60" height="60" rx="12" fill="black"/>
        <ellipse cx="32" cy="34" rx="18" ry="12" stroke="white" strokeWidth="3" fill="none"/>
        <circle cx="32" cy="34" r="8" stroke="white" strokeWidth="2.5" fill="none"/>
        <circle cx="32" cy="34" r="4" fill="white"/>
        <line x1="8" y1="22" x2="56" y2="18" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <line x1="8" y1="46" x2="56" y2="50" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <span className={`font-bold text-black truncate max-w-[120px] sm:max-w-none ${size === "sm" ? "text-base sm:text-lg" : size === "lg" ? "text-2xl sm:text-3xl" : "text-lg sm:text-2xl"}`}>
        Aleo-Scaffold
      </span>
    </div>
  );
}

function NavLink({
  href,
  children,
  isActive,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
  onClick?: () => void;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={`font-medium transition-colors py-2 px-1 -mx-1 rounded cursor-pointer inline-block block sm:inline-block ${
        isActive ? "text-black" : "text-black/70 hover:text-black"
      }`}
      onClick={(e) => {
        onClick?.();
        if (e.ctrlKey || e.metaKey || e.button === 1) return;
        e.preventDefault();
        router.push(href);
      }}
    >
      {children}
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-[100]">
      <nav className="border-b border-black/20" style={{ backgroundColor: "#FFA977" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 min-h-[3.5rem]">
            <Link href="/" className="flex items-center min-w-0">
              <Logo size="md" />
            </Link>

            {/* Desktop: inline links */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6 relative z-[101]">
              {NAV_LINKS.map(({ href, label }) => (
                <NavLink key={href} href={href} isActive={pathname === href}>
                  {label}
                </NavLink>
              ))}
              <WalletButton />
            </div>

            {/* Mobile: menu button + wallet */}
            <div className="flex md:hidden items-center gap-2">
              <WalletButton />
              <button
                type="button"
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                className="p-2 rounded-lg text-black hover:bg-black/10 transition-colors"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {menuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <>
                      <path d="M3 12h18M3 6h18M3 18h18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${
              menuOpen ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pb-3 pt-1 border-t border-black/10 flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <NavLink
                  key={href}
                  href={href}
                  isActive={pathname === href}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
