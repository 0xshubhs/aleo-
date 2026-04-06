"use client";

import Navigation from "./components/Navigation";

const DappLogoSvg = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect x="2" y="2" width="60" height="60" rx="12" fill="black" />
    <ellipse cx="32" cy="34" rx="18" ry="12" stroke="white" strokeWidth="3" fill="none" />
    <circle cx="32" cy="34" r="8" stroke="white" strokeWidth="2.5" fill="none" />
    <circle cx="32" cy="34" r="4" fill="white" />
    <line x1="8" y1="22" x2="56" y2="18" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <line x1="8" y1="46" x2="56" y2="50" stroke="white" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default function Home() {
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "#FFA977" }}>
      <Navigation />

      {/* Dapp logo: bottom-left, a bit above the bottom */}
      <div className="absolute bottom-16 left-6 w-20 h-20 sm:w-24 sm:h-24 opacity-90 pointer-events-none select-none">
        <DappLogoSvg className="w-full h-full" />
      </div>
      {/* Dapp logo: top-right, a bit below and left */}
      <div className="absolute top-28 right-8 sm:right-12 w-20 h-20 sm:w-24 sm:h-24 opacity-90 pointer-events-none select-none">
        <DappLogoSvg className="w-full h-full" />
      </div>

      <main className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center container mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
        <div className="max-w-4xl mx-auto w-full text-center overflow-hidden">
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <h1 className="landing-headline text-3xl min-[380px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-black font-serif leading-tight px-1">
              <span className="landing-headline-line block">Aleo blockchain</span>
              <span className="landing-headline-line block landing-headline-accent">Starter-Kit</span>
            </h1>
            <p className="text-sm min-[380px]:text-base sm:text-lg md:text-xl text-black/80 leading-relaxed font-serif px-2 sm:px-0 max-w-2xl mx-auto">
              Build the next generation of private, on-chain applications with zero-knowledge proofs.
              <br className="hidden sm:inline" />{" "}
              <span className="sm:block">Shape the future of decentralized applications on Aleo blockchain.</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
