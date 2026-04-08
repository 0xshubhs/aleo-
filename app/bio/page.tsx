"use client";

import { useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Navigation from "../components/Navigation";
import { PROGRAM_ID, stringToField, getWalletErrorMessage } from "../lib/aleo";

const FEE = 150_000;

export default function BioPage() {
  const { address, executeTransaction, requestRecords } = useWallet();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [bioData, setBioData] = useState<any[] | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"register" | "fetch" | null>(null);

  const handleRegister = async () => {
    setError(null);
    setTxStatus(null);
    if (!address || !executeTransaction) {
      setError("Connect your wallet first.");
      return;
    }
    if (!name.trim() || !bio.trim()) {
      setError("Name and bio are required.");
      return;
    }
    setLoading("register");
    try {
      const inputs = [
        stringToField(name.trim()),
        stringToField(bio.trim()),
        "0u64",
      ];
      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: "register_bio",
        inputs,
        fee: FEE,
      });
      setTxStatus(`Transaction submitted. ID: ${result?.transactionId || "pending"}`);
      setName("");
      setBio("");
    } catch (e) {
      const message = getWalletErrorMessage(e);
      setError(message);
    } finally {
      setLoading(null);
    }
  };

  const handleFetchBio = async () => {
    setError(null);
    setBioData(null);
    if (!address || !requestRecords) {
      setError("Connect your wallet first.");
      return;
    }
    setLoading("fetch");
    try {
      const records = await requestRecords(PROGRAM_ID);
      const list = Array.isArray(records) ? records : records != null ? [records] : [];
      setBioData(list);
    } catch (e) {
      setError(getWalletErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-2">Bio</h1>
        <p className="text-muted-foreground mb-8">
          This is your decentralized profile stored on the Aleo blockchain.
        </p>

        {error && (
          <div className="mb-6 p-4 border border-destructive/50 bg-destructive/10 text-destructive text-sm">
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}
        {txStatus && (
          <div className="mb-6 p-4 border border-accent/50 bg-accent/10 text-accent text-sm">
            <p>{txStatus}</p>
          </div>
        )}

        <div className="bg-card  p-6 mb-8">
          <p className="text-foreground font-semibold mb-2">Connected Address:</p>
          {address ? (
            <p className="text-foreground text-sm font-mono break-all">{address}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Not connected</p>
          )}
        </div>

        <div className="bg-card  p-6 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Register or Update Your Bio
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Enter your name and a short bio to store on-chain. Keep under 25 characters each.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-foreground font-medium mb-2">Your Name (max 25 chars)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={25}
                className="w-full px-4 py-2 border border-border  focus:outline-none focus:ring-2 focus:ring-black text-foreground"
              />
            </div>

            <div>
              <label className="block text-foreground font-medium mb-2">Your Bio (max 25 chars)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short bio"
                rows={4}
                maxLength={25}
                className="w-full px-4 py-2 border border-border  focus:outline-none focus:ring-2 focus:ring-black text-foreground"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={loading === "register"}
              className="w-full px-6 py-3 bg-black text-white  hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
            >
              {loading === "register" ? "Submitting..." : "Register Bio"}
            </button>
          </div>
        </div>

        <div className="bg-card  p-6 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Fetch your Bio records
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Request your <code className="bg-black/5 px-1 rounded">onchainbio.aleo</code> records from the wallet.
          </p>

          <button
            onClick={handleFetchBio}
            disabled={loading === "fetch"}
            className="w-full px-6 py-3 bg-black text-white  hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
          >
            {loading === "fetch" ? "Fetching..." : "Fetch my records"}
          </button>

          {bioData !== null && (
            <div className="mt-4 p-4 bg-black/5 ">
              {Array.isArray(bioData) && bioData.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No records found. If you just registered, wait a few moments and try again.
                </p>
              ) : (
                <pre className="text-sm text-foreground overflow-auto max-h-64">
                  {JSON.stringify(bioData, null, 2)}
                </pre>
              )}
            </div>
          )}
    </div>
    </div>
    </div>
  );
}
