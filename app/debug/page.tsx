"use client";

import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import Navigation from "../components/Navigation";
import {
  PROGRAM_ID,
  GREETING_PROGRAM_ID,
  stringToField,
  getWalletErrorMessage,
} from "../lib/aleo";

const NETWORK = WalletAdapterNetwork.TestnetBeta;
const FEE = 150_000;

export default function DebugPage() {
  const { publicKey, requestTransaction, requestRecords } = useWallet();
  const [selectedTab, setSelectedTab] = useState<"bio" | "greeting">("bio");

  // Bio tab state
  const [bioName, setBioName] = useState("");
  const [bioBio, setBioBio] = useState("");
  const [bioRecords, setBioRecords] = useState<unknown>(null);
  const [bioTxStatus, setBioTxStatus] = useState<string | null>(null);

  // Greeting tab state
  const [greetingMessage, setGreetingMessage] = useState("");
  const [greetingTxStatus, setGreetingTxStatus] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setBioTxStatus(null);
    setGreetingTxStatus(null);
    setBioRecords(null);
  };

  const handleBioFetchRecords = async () => {
    clearFeedback();
    if (!publicKey || !requestRecords) {
      setError("Connect your Leo wallet first.");
      return;
    }
    setLoading("bio-fetch");
    try {
      const records = await requestRecords(PROGRAM_ID);
      const list = Array.isArray(records) ? records : records != null ? [records] : [];
      setBioRecords(list.length ? list : "No records found for your wallet.");
    } catch (e) {
      setError(getWalletErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const handleBioRegister = async () => {
    clearFeedback();
    if (!publicKey || !requestTransaction) {
      setError("Connect your Leo wallet first.");
      return;
    }
    const name = bioName.trim().slice(0, 25);
    const bio = bioBio.trim().slice(0, 25);
    if (!name || !bio) {
      setError("Name and bio are required (max 25 chars each).");
      return;
    }
    setLoading("bio-register");
    try {
      const inputs = [stringToField(name), stringToField(bio), "0u64"];
      const tx = Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "register_bio",
        inputs,
        FEE,
        false
      );
      const txId = await requestTransaction(tx);
      setBioTxStatus(`Submitted. ID: ${txId}`);
      setBioName("");
      setBioBio("");
    } catch (e) {
      setError(getWalletErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const handleGreetingCall = async () => {
    clearFeedback();
    if (!publicKey || !requestTransaction) {
      setError("Connect your Leo wallet first.");
      return;
    }
    const msg = greetingMessage.trim().slice(0, 25);
    if (!msg) {
      setError("Message is required (max 25 chars).");
      return;
    }
    setLoading("greeting");
    try {
      const inputs = [stringToField(msg)];
      const tx = Transaction.createTransaction(
        publicKey,
        NETWORK,
        GREETING_PROGRAM_ID,
        "greet",
        inputs,
        FEE,
        false
      );
      const txId = await requestTransaction(tx);
      setGreetingTxStatus(`Submitted. ID: ${txId}`);
      setGreetingMessage("");
    } catch (e) {
      setError(getWalletErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFA977" }}>
      <Navigation />

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold text-black mb-6">Debug</h1>

        {publicKey && (
          <p className="text-black/70 text-sm font-mono mb-6 break-all">Connected: {publicKey}</p>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
        {(bioTxStatus || greetingTxStatus) && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm">
            {bioTxStatus || greetingTxStatus}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setSelectedTab("bio"); clearFeedback(); }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedTab === "bio" ? "bg-black text-white" : "bg-white text-black hover:bg-white/80"
            }`}
          >
            Bio (onchainbio.aleo)
          </button>
          <button
            onClick={() => { setSelectedTab("greeting"); clearFeedback(); }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedTab === "greeting" ? "bg-black text-white" : "bg-white text-black hover:bg-white/80"
            }`}
          >
            Greeting (greeting.aleo)
          </button>
        </div>

        {selectedTab === "bio" && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-bold text-black mb-2">onchainbio.aleo</h2>
            <p className="text-black/60 text-sm mb-6">Register a profile or fetch your private Bio records.</p>

            <div className="space-y-6">
              <div className="p-4 bg-black/5 rounded-lg">
                <h3 className="text-lg font-bold text-black mb-3">Fetch my records</h3>
                <p className="text-black/70 text-sm mb-3">Request decrypted Bio records from your wallet.</p>
                <button
                  onClick={handleBioFetchRecords}
                  disabled={!!loading}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-black/80 disabled:opacity-50 text-sm font-medium"
                >
                  {loading === "bio-fetch" ? "Fetching…" : "Fetch records"}
                </button>
                {bioRecords !== null && (
                  <pre className="mt-4 p-3 bg-black/5 rounded text-xs overflow-x-auto text-black max-h-48 overflow-y-auto">
                    {typeof bioRecords === "string"
                      ? bioRecords
                      : JSON.stringify(bioRecords, null, 2)}
                  </pre>
                )}
              </div>

              <div className="p-4 bg-black/5 rounded-lg">
                <h3 className="text-lg font-bold text-black mb-3">register_bio</h3>
                <p className="text-black/70 text-sm mb-3">Submit name and bio (max 25 chars each).</p>
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={bioName}
                    onChange={(e) => setBioName(e.target.value)}
                    placeholder="Name (max 25)"
                    maxLength={25}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-black"
                  />
                  <input
                    type="text"
                    value={bioBio}
                    onChange={(e) => setBioBio(e.target.value)}
                    placeholder="Bio (max 25)"
                    maxLength={25}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-black"
                  />
                </div>
                <button
                  onClick={handleBioRegister}
                  disabled={!!loading}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-black/80 disabled:opacity-50 text-sm font-medium"
                >
                  {loading === "bio-register" ? "Submitting…" : "Run register_bio"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "greeting" && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-bold text-black mb-2">greeting.aleo</h2>
            <p className="text-black/60 text-sm mb-6">Call the greet transition with a short message.</p>

            <div className="p-4 bg-black/5 rounded-lg">
              <h3 className="text-lg font-bold text-black mb-3">greet</h3>
              <p className="text-black/70 text-sm mb-3">Message (max 25 chars).</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="e.g. Hello Aleo"
                  maxLength={25}
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded text-sm text-black"
                />
                <button
                  onClick={handleGreetingCall}
                  disabled={!!loading}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-black/80 disabled:opacity-50 text-sm font-medium"
                >
                  {loading === "greeting" ? "Submitting…" : "Run greet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
