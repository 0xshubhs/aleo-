"use client";

import { useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Navigation from "../components/Navigation";
import { GREETING_PROGRAM_ID, stringToField, getWalletErrorMessage } from "../lib/aleo";

const FEE = 150_000;

export default function GreetingPage() {
  const { address, executeTransaction } = useWallet();
  const [message, setMessage] = useState("Hello Aleo");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGreet = async () => {
    setError(null);
    setTxStatus(null);
    if (!address || !executeTransaction) {
      setError("Connect your wallet first.");
      return;
    }
    if (!message.trim()) {
      setError("Enter a message.");
      return;
    }
    setLoading(true);
    try {
      const trimmed = message.trim().slice(0, 25);
      const inputs = [stringToField(trimmed)];
      const result = await executeTransaction({
        program: GREETING_PROGRAM_ID,
        function: "greet",
        inputs,
        fee: FEE,
      });
      setTxStatus(`Transaction submitted. ID: ${result?.transactionId || "pending"}`);
    } catch (e) {
      const msg = getWalletErrorMessage(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">Greeting (greeting.aleo)</h1>

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

        <div className="bg-card  p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Call greet</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Submits a transaction to the <code className="bg-black/5 px-1 rounded">greet</code> transition with your message (max 25 chars).
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-foreground font-medium mb-2">Message (max 25 chars)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hello Aleo"
                maxLength={25}
                className="w-full px-4 py-2 border border-border  focus:outline-none focus:ring-2 focus:ring-black text-foreground"
              />
            </div>
            <button
              onClick={handleGreet}
              disabled={loading}
              className="w-full px-6 py-3 bg-black text-white  hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit greet transaction"}
            </button>
    </div>
    </div>
    </div>
    </div>
  );
}
