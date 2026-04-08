"use client";

import { useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Navigation from "../components/Navigation";
import { CREDITS_PROGRAM_ID, getWalletErrorMessage } from "../lib/aleo";

const FEE = 35_000;
const MICROCREDITS_PER_CREDIT = 1_000_000;

export default function CreditsPage() {
  const { address, executeTransaction, requestRecords } = useWallet();
  const [records, setRecords] = useState<any[] | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [amountCredits, setAmountCredits] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"fetch" | "transfer" | null>(null);

  const handleFetchRecords = async () => {
    setError(null);
    setRecords(null);
    if (!address || !requestRecords) {
      setError("Connect your wallet first.");
      return;
    }
    setLoading("fetch");
    try {
      const recs = await requestRecords(CREDITS_PROGRAM_ID);
      setRecords(Array.isArray(recs) ? recs : [recs]);
    } catch (e) {
      setError(getWalletErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const handleTransferPublic = async () => {
    setError(null);
    setTxStatus(null);
    if (!address || !executeTransaction) {
      setError("Connect your wallet first.");
      return;
    }
    const amount = parseFloat(amountCredits);
    if (!transferTo.trim() || isNaN(amount) || amount <= 0) {
      setError("Enter a valid recipient address and amount (credits).");
      return;
    }
    const microcredits = Math.floor(amount * MICROCREDITS_PER_CREDIT);
    setLoading("transfer");
    try {
      const inputs = [transferTo.trim(), `${microcredits}u64`];
      const result = await executeTransaction({
        program: CREDITS_PROGRAM_ID,
        function: "transfer_public",
        inputs,
        fee: FEE,
      });
      setTxStatus(`Transfer submitted. Transaction ID: ${result?.transactionId || "pending"}`);
      setTransferTo("");
      setAmountCredits("");
    } catch (e) {
      const message = getWalletErrorMessage(e);
      setError(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-2">Credits (credits.aleo)</h1>
        <p className="text-muted-foreground mb-8">
          View your Aleo credit records and send public transfers using the native{" "}
          <code className="bg-black/10 px-1 rounded">credits.aleo</code> program.
        </p>

        {error && (
          <div className="mb-6 p-4 border border-destructive/50 bg-destructive/10 text-destructive text-sm">
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}
        {txStatus && (
          <div className="mb-6 p-4 border border-accent/50 bg-accent/10 text-accent text-sm">
            {txStatus}
          </div>
        )}

        <div className="bg-card  p-6 mb-8">
          <p className="text-foreground font-semibold mb-2">Connected:</p>
          {address ? (
            <p className="text-foreground text-sm font-mono break-all">{address}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Not connected</p>
          )}
        </div>

        <div className="bg-card  p-6 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">My credit records</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Request your <code className="bg-black/5 px-1 rounded">credits.aleo</code> records from the wallet.
          </p>
          <button
            onClick={handleFetchRecords}
            disabled={loading === "fetch"}
            className="w-full px-6 py-3 bg-black text-white  hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
          >
            {loading === "fetch" ? "Fetching..." : "Fetch my credit records"}
          </button>
          {records && (
            <div className="mt-4 p-4 bg-black/5 ">
              <pre className="text-sm text-foreground overflow-auto max-h-64">
                {JSON.stringify(records, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-card  p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Transfer (public)</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Send credits publicly. Amount is in <strong>credits</strong> (1 credit = 1,000,000 microcredits).
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-foreground font-medium mb-2">Recipient address</label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="aleo1..."
                className="w-full px-4 py-2 border border-border  focus:outline-none focus:ring-2 focus:ring-black text-foreground"
              />
            </div>
            <div>
              <label className="block text-foreground font-medium mb-2">Amount (credits)</label>
              <input
                type="text"
                value={amountCredits}
                onChange={(e) => setAmountCredits(e.target.value)}
                placeholder="0.1"
                className="w-full px-4 py-2 border border-border  focus:outline-none focus:ring-2 focus:ring-black text-foreground"
              />
            </div>
            <button
              onClick={handleTransferPublic}
              disabled={loading === "transfer"}
              className="w-full px-6 py-3 bg-black text-white  hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
            >
              {loading === "transfer" ? "Submitting..." : "Transfer (public)"}
            </button>
    </div>
    </div>
    </div>
    </div>
  );
}
