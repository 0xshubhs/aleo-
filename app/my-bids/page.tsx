"use client";

import { useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Navigation from "../components/Navigation";
import { cn } from "../lib/utils";
import { SILENTBID_PROGRAM_ID, getWalletErrorMessage } from "../lib/aleo";

export default function MyBidsPage() {
  const { address, requestRecords } = useWallet();
  const [records, setRecords] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setError(null); setRecords(null);
    if (!address || !requestRecords) { setError("Connect your wallet first."); return; }
    setLoading(true);
    try {
      const recs = await requestRecords(SILENTBID_PROGRAM_ID);
      setRecords(Array.isArray(recs) ? recs : recs ? [recs] : []);
    } catch (e) { setError(getWalletErrorMessage(e)); } finally { setLoading(false); }
  };

  const parseBidRecord = (record: any) => {
    const str = typeof record === "string" ? record : JSON.stringify(record);
    const auctionMatch = str.match(/auction_id[:\s]+(\d+)field/);
    const amountMatch = str.match(/amount[:\s]+(\d+)u64/);
    const revealedMatch = str.match(/is_revealed[:\s]+(true|false)/);
    return {
      auction_id: auctionMatch ? auctionMatch[1] + "field" : null,
      amount: amountMatch ? parseInt(amountMatch[1], 10) : null,
      is_revealed: revealedMatch ? revealedMatch[1] === "true" : null,
      raw: str,
    };
  };

  return (
    <main className="relative min-h-screen">
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
      <div className="relative z-10">
        <Navigation />

        <div className="px-6 md:px-12 py-12 md:py-20 max-w-4xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Private Records</span>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl md:text-7xl tracking-tight text-foreground">MY BIDS</h1>
          <p className="mt-6 max-w-lg font-mono text-sm text-muted-foreground leading-relaxed">
            Your private bid records stored in your wallet. These are encrypted ZK records that only you can decrypt.
          </p>

          {/* Wallet */}
          <div className="mt-8 border border-border/40 p-4 font-mono text-[10px] text-muted-foreground">
            <span className="uppercase tracking-widest">Connected: </span>
            {address ? <span className="text-foreground break-all">{address}</span> : <span>Not connected</span>}
          </div>

          {error && <div className="mt-4 border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive">{error}</div>}

          <button onClick={handleFetch} disabled={loading || !address}
            className={cn(
              "mt-6 w-full border border-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent",
              "hover:bg-accent hover:text-accent-foreground transition-all duration-200",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}>
            {loading ? "Fetching bid records..." : "Fetch My Bid Records"}
          </button>

          {records !== null && (
            <div className="mt-8">
              {records.length === 0 ? (
                <div className="border border-border/40 p-12 text-center">
                  <p className="font-mono text-sm text-muted-foreground">No bid records found.</p>
                  <p className="font-mono text-[10px] text-muted-foreground/50 mt-2">Place a bid on an auction first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    {records.length} record{records.length !== 1 ? "s" : ""} found
                  </p>
                  {records.map((record, i) => {
                    const parsed = parseBidRecord(record);
                    return (
                      <div key={i} className="border border-border/40 p-6 hover:border-accent/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs text-foreground">Bid #{i + 1}</span>
                          {parsed.is_revealed !== null && (
                            <span className={cn(
                              "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border",
                              parsed.is_revealed ? "border-purple-500/60 text-purple-400" : "border-accent/60 text-accent"
                            )}>
                              {parsed.is_revealed ? "Revealed" : "Sealed"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 font-mono text-sm">
                          {parsed.auction_id && (
                            <div className="flex justify-between"><span className="text-muted-foreground text-[10px] uppercase">Auction</span><span className="text-foreground text-xs">{parsed.auction_id}</span></div>
                          )}
                          {parsed.amount !== null && (
                            <div className="flex justify-between"><span className="text-muted-foreground text-[10px] uppercase">Amount</span><span className="text-accent">{parsed.amount.toLocaleString()} microcredits</span></div>
                          )}
                        </div>
                        <details className="mt-3">
                          <summary className="font-mono text-[10px] text-muted-foreground/50 cursor-pointer hover:text-muted-foreground">Raw data</summary>
                          <pre className="mt-2 p-3 bg-input/50 font-mono text-[10px] text-muted-foreground overflow-x-auto max-h-24">{parsed.raw}</pre>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
