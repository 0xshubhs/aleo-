"use client";

import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import Navigation from "../components/Navigation";
import { CREDITS_PROGRAM_ID, getWalletErrorMessage } from "../lib/aleo";

const NETWORK = WalletAdapterNetwork.TestnetBeta;
const FEE = 35_000;
const MICROCREDITS_PER_CREDIT = 1_000_000;

export default function CreditsPage() {
  const { publicKey, requestTransaction, requestRecords } = useWallet();
  const [records, setRecords] = useState<string[] | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [amountCredits, setAmountCredits] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"fetch" | "transfer" | null>(null);

  const handleFetchRecords = async () => {
    setError(null);
    setRecords(null);
    if (!publicKey || !requestRecords) {
      setError("Connect your Leo wallet first.");
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
    if (!publicKey || !requestTransaction) {
      setError("Connect your Leo wallet first.");
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
      const tx = Transaction.createTransaction(
        publicKey,
        NETWORK,
        CREDITS_PROGRAM_ID,
        "transfer_public",
        inputs,
        FEE,
        false
      );
      const txId = await requestTransaction(tx);
      setTxStatus(`Transfer submitted. Transaction ID: ${txId}`);
      setTransferTo("");
      setAmountCredits("");
    } catch (e) {
      const message = getWalletErrorMessage(e);
      setError(
        message.toLowerCase().includes("try again") || message.toLowerCase().includes("report")
          ? `Transfer failed. ${message} Make sure Leo Wallet is on Testnet and you have enough credits; then try again or report the error.`
          : message
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFA977" }}>
      <Navigation />
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold text-black mb-2">Credits (credits.aleo)</h1>
        <p className="text-black/80 mb-8">
          View your Aleo credit records and send public transfers using the native{" "}
          <code className="bg-black/10 px-1 rounded">credits.aleo</code> program.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
            <p className="mt-3 text-red-700 text-xs">
              Tip: Use Leo Wallet on <strong>Testnet</strong>, ensure you have enough credits, and approve the transaction in the wallet popup. If it still fails, try again or report the error.
            </p>
          </div>
        )}
        {txStatus && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm">
            {txStatus}
          </div>
        )}

        <div className="bg-white rounded-lg p-6 mb-8">
          <p className="text-black font-semibold mb-2">Connected:</p>
          {publicKey ? (
            <p className="text-black text-sm font-mono break-all">{publicKey}</p>
          ) : (
            <p className="text-black/60 text-sm">Not connected</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">My credit records</h2>
          <p className="text-black/80 text-sm mb-4">
            Request your <code className="bg-black/5 px-1 rounded">credits.aleo</code> records from the wallet. These are private UTXO-style balances.
          </p>
          <button
            onClick={handleFetchRecords}
            disabled={loading === "fetch"}
            className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
          >
            {loading === "fetch" ? "Fetching…" : "Fetch my credit records"}
          </button>
          {records && (
            <div className="mt-4 p-4 bg-black/5 rounded-lg">
              <pre className="text-sm text-black overflow-auto max-h-64">
                {JSON.stringify(records, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold text-black mb-4">Transfer (public)</h2>
          <p className="text-black/80 text-sm mb-4">
            Send credits publicly. Amount is in <strong>credits</strong> (1 credit = 1,000,000 microcredits). Uses <code className="bg-black/5 px-1 rounded">transfer_public</code>.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-black font-medium mb-2">Recipient address</label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="aleo1..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
            <div>
              <label className="block text-black font-medium mb-2">Amount (credits)</label>
              <input
                type="text"
                value={amountCredits}
                onChange={(e) => setAmountCredits(e.target.value)}
                placeholder="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
            <button
              onClick={handleTransferPublic}
              disabled={loading === "transfer"}
              className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
            >
              {loading === "transfer" ? "Submitting…" : "Transfer (public)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
