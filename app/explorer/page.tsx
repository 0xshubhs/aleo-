"use client";

import { useState, useEffect, useCallback } from "react";
import Navigation from "../components/Navigation";
import ExplorerLineChart from "../components/explorer/LineChart";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "blocks", label: "Blocks" },
  { id: "transactions", label: "Transactions" },
  { id: "programs", label: "Programs" },
  { id: "defi", label: "DeFi" },
  { id: "validators", label: "Validators" },
  { id: "api-docs", label: "API Documentation" },
] as const;

type SectionId = (typeof SIDEBAR_ITEMS)[number]["id"];

interface TxPerDay {
  date: string;
  count: number;
}

interface BlockRow {
  height: number;
  hash: string;
  timestamp: string;
  txCount: number;
  proposer: string | null;
}

interface TxRow {
  txHash: string;
  blockHeight: number;
  timestamp: string;
  txType: string;
  programName: string | null;
}

interface DefiRow {
  protocol_name: string;
  total_value: number;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border-2 border-black/20 bg-white p-4 sm:p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);
  return (
    <button
      type="button"
      onClick={copy}
      className="p-1.5 rounded bg-black/10 hover:bg-black/20 text-black transition-colors shrink-0"
      title={label}
      aria-label={label}
    >
      {copied ? "✓" : "📋"}
    </button>
  );
}

export default function ExplorerPage() {
  const [selectedSection, setSelectedSection] = useState<SectionId>("overview");

  // Overview
  const [latestHeight, setLatestHeight] = useState<number | null>(null);
  const [latestHash, setLatestHash] = useState<string | null>(null);
  const [txPerDay, setTxPerDay] = useState<TxPerDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Blocks
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [blocksTotal, setBlocksTotal] = useState(0);
  const [blocksPage, setBlocksPage] = useState(1);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blockHeightSearch, setBlockHeightSearch] = useState("");
  const [blocksError, setBlocksError] = useState<string | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txProgramFilter, setTxProgramFilter] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  // Programs
  const [programId, setProgramId] = useState("credits.aleo");
  const [programSource, setProgramSource] = useState<string | null>(null);
  const [programMappings, setProgramMappings] = useState<string[]>([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [programError, setProgramError] = useState<string | null>(null);

  // DeFi
  const [defiTvl, setDefiTvl] = useState<DefiRow[]>([]);
  const [defiLoading, setDefiLoading] = useState(false);
  const [defiError, setDefiError] = useState<string | null>(null);

  // Validators
  const [validators, setValidators] = useState<{ address: string }[]>([]);
  const [validatorsLoading, setValidatorsLoading] = useState(false);
  const [validatorsError, setValidatorsError] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    if (selectedSection !== "overview") return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    Promise.all([
      fetch("/api/v2/block/height/latest").then((r) => r.json()),
      fetch("/api/v2/block/hash/latest").then((r) => r.json()),
      fetch("/api/v2/metrics/transactions").then((r) => r.json()),
    ])
      .then(([heightData, hashData, metricsData]) => {
        if (cancelled) return;
        if (heightData?.height != null) setLatestHeight(heightData.height);
        if (hashData?.hash) setLatestHash(hashData.hash);
        if (Array.isArray(metricsData?.txPerDay)) setTxPerDay(metricsData.txPerDay);
        if (heightData?.error || hashData?.error || metricsData?.error) {
          setError(heightData?.error || hashData?.error || metricsData?.error || "Failed to load");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedSection]);

  const fetchBlocks = useCallback(() => {
    setBlocksError(null);
    setBlocksLoading(true);
    const params = new URLSearchParams({ page: String(blocksPage), limit: String(limit) });
    if (blockHeightSearch.trim()) params.set("height", blockHeightSearch.trim());
    fetch(`/api/blocks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setBlocksError(data.error);
        else {
          setBlocks(data.blocks ?? []);
          setBlocksTotal(data.total ?? 0);
        }
      })
      .catch((e) => setBlocksError(e instanceof Error ? e.message : "Failed to fetch"))
      .finally(() => setBlocksLoading(false));
  }, [blocksPage, blockHeightSearch]);

  useEffect(() => {
    if (selectedSection === "blocks") fetchBlocks();
  }, [selectedSection, fetchBlocks]);

  const fetchTransactions = useCallback(() => {
    setTxError(null);
    setTxLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (txProgramFilter.trim()) params.set("program", txProgramFilter.trim());
    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setTxError(data.error);
        else setTransactions(data.transactions ?? []);
      })
      .catch((e) => setTxError(e instanceof Error ? e.message : "Failed to fetch"))
      .finally(() => setTxLoading(false));
  }, [txProgramFilter]);

  useEffect(() => {
    if (selectedSection === "transactions") fetchTransactions();
  }, [selectedSection, fetchTransactions]);

  const fetchProgram = useCallback(() => {
    if (!programId.trim()) return;
    setProgramError(null);
    setProgramLoading(true);
    fetch(`/api/programs?id=${encodeURIComponent(programId.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setProgramError(data.error);
        else {
          setProgramSource(data.program ?? null);
          setProgramMappings(data.mappings ?? []);
        }
      })
      .catch((e) => setProgramError(e instanceof Error ? e.message : "Failed to fetch"))
      .finally(() => setProgramLoading(false));
  }, [programId]);

  useEffect(() => {
    if (selectedSection === "programs" && programId.trim()) fetchProgram();
  }, [selectedSection]); // eslint-disable-line react-hooks/exhaustive-deps -- fetch on section switch if id set

  const fetchDefi = useCallback(() => {
    setDefiError(null);
    setDefiLoading(true);
    fetch("/api/v2/defi/totalValue")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setDefiError(data.error);
        else setDefiTvl(Array.isArray(data) ? data : []);
      })
      .catch((e) => setDefiError(e instanceof Error ? e.message : "Failed to fetch"))
      .finally(() => setDefiLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSection === "defi") fetchDefi();
  }, [selectedSection, fetchDefi]);

  const fetchValidators = useCallback(() => {
    setValidatorsError(null);
    setValidatorsLoading(true);
    fetch("/api/validators")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setValidatorsError(data.error);
        else setValidators(data.validators ?? []);
      })
      .catch((e) => setValidatorsError(e instanceof Error ? e.message : "Failed to fetch"))
      .finally(() => setValidatorsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSection === "validators") fetchValidators();
  }, [selectedSection, fetchValidators]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFA977" }}>
      <Navigation />

      <div className="flex-1 flex min-h-0">
        <aside className="w-56 shrink-0 border-r border-black/20 bg-white/80 flex flex-col">
          <div className="p-4 border-b border-black/10">
            <span className="font-semibold text-black">Explorer</span>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {SIDEBAR_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedSection(id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedSection === id ? "bg-black text-white" : "text-black/80 hover:bg-black/10 hover:text-black"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Overview */}
            {selectedSection === "overview" && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Network Overview</h1>
                <p className="text-black/70 text-sm sm:text-base mb-6">Latest block and transaction metrics from Provable v2 API.</p>
                {error && (
                  <div className="mb-6 p-4 rounded-lg border-2 border-red-500/50 bg-red-100 text-red-800 text-sm">
                    <p className="font-medium">Could not reach API</p>
                    <p className="mt-1">{error}</p>
                  </div>
                )}
                {loading && !latestHeight && txPerDay.length === 0 && !error ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 rounded-xl border border-black/20 bg-white animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <Card>
                        <p className="text-sm font-medium text-black/70">Latest block height</p>
                        <p className="mt-1 text-xl sm:text-2xl font-bold text-black font-mono">
                          {latestHeight != null ? latestHeight.toLocaleString() : "—"}
                        </p>
                        {latestHash && (
                          <p className="mt-0.5 text-xs text-black/60 font-mono truncate">{latestHash.slice(0, 16)}…</p>
                        )}
                      </Card>
                    </div>
                    <Card className="mb-8">
                      <h2 className="text-lg font-semibold text-black mb-4">Transactions per day</h2>
                      <p className="text-xs text-black/60 mb-2">
                        Provable v2 <code className="rounded bg-black/10 px-1">/metrics/transactions</code>
                      </p>
                      {txPerDay.length > 0 ? (
                        <ExplorerLineChart data={txPerDay} dataKey="count" xKey="date" height={260} />
                      ) : (
                        <div className="h-[260px] flex items-center justify-center text-black/50 text-sm">No transaction data yet</div>
                      )}
                    </Card>
                    <button
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        Promise.all([
                          fetch("/api/v2/block/height/latest").then((r) => r.json()),
                          fetch("/api/v2/block/hash/latest").then((r) => r.json()),
                          fetch("/api/v2/metrics/transactions").then((r) => r.json()),
                        ]).then(([a, b, c]) => {
                          if (a?.height != null) setLatestHeight(a.height);
                          if (b?.hash) setLatestHash(b.hash);
                          if (Array.isArray(c?.txPerDay)) setTxPerDay(c.txPerDay);
                          setLoading(false);
                        });
                      }}
                      className="px-5 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-black/80 transition-colors"
                    >
                      Refresh
                    </button>
                  </>
                )}
              </>
            )}

            {/* Blocks */}
            {selectedSection === "blocks" && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Blocks</h1>
                <p className="text-black/70 text-sm sm:text-base mb-4">Recent blocks from Provable API.</p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="number"
                    placeholder="Block height (optional)"
                    value={blockHeightSearch}
                    onChange={(e) => setBlockHeightSearch(e.target.value)}
                    className="px-3 py-2 rounded-lg border-2 border-black/20 bg-white text-black font-mono w-40"
                  />
                  <button onClick={fetchBlocks} disabled={blocksLoading} className="px-4 py-2 rounded-lg bg-black text-white font-medium hover:bg-black/80 disabled:opacity-50">
                    {blocksLoading ? "Loading…" : "Fetch"}
                  </button>
                </div>
                {blocksError && (
                  <div className="mb-4 p-4 rounded-lg border-2 border-red-500/50 bg-red-100 text-red-800 text-sm">{blocksError}</div>
                )}
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/20">
                          <th className="py-2 font-semibold text-black">Height</th>
                          <th className="py-2 font-semibold text-black">Hash</th>
                          <th className="py-2 font-semibold text-black">Timestamp</th>
                          <th className="py-2 font-semibold text-black">Txs</th>
                          <th className="py-2 w-10 text-right font-semibold text-black">Copy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blocks.map((b) => (
                          <tr key={b.height} className="border-b border-black/10 last:border-0 hover:bg-black/5">
                            <td className="py-2 font-mono text-black">{b.height.toLocaleString()}</td>
                            <td className="py-2 font-mono text-xs text-black/80 break-all max-w-[140px]" title={b.hash}>{b.hash.slice(0, 14)}…</td>
                            <td className="py-2 text-black/80">{new Date(b.timestamp).toLocaleString()}</td>
                            <td className="py-2 text-black/80">{b.txCount}</td>
                            <td className="py-2 text-right">
                              <CopyButton text={b.hash} label="Copy hash" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {blocks.length === 0 && !blocksLoading && <p className="py-4 text-center text-black/60">No blocks</p>}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-black/10">
                    <span className="text-sm text-black/60">Total: {blocksTotal}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setBlocksPage((p) => Math.max(1, p - 1))} disabled={blocksPage <= 1} className="px-3 py-1.5 rounded-lg border border-black/20 text-sm font-medium disabled:opacity-50 hover:bg-black/10">Previous</button>
                      <button onClick={() => setBlocksPage((p) => p + 1)} disabled={blocksPage * limit >= blocksTotal} className="px-3 py-1.5 rounded-lg border border-black/20 text-sm font-medium disabled:opacity-50 hover:bg-black/10">Next</button>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Transactions */}
            {selectedSection === "transactions" && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Transactions</h1>
                <p className="text-black/70 text-sm sm:text-base mb-4">Recent transactions from last 15 blocks.</p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Filter by program (e.g. credits.aleo)"
                    value={txProgramFilter}
                    onChange={(e) => setTxProgramFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border-2 border-black/20 bg-white text-black font-mono flex-1 min-w-[180px]"
                  />
                  <button onClick={fetchTransactions} disabled={txLoading} className="px-4 py-2 rounded-lg bg-black text-white font-medium hover:bg-black/80 disabled:opacity-50">
                    {txLoading ? "Loading…" : "Fetch"}
                  </button>
                </div>
                {txError && (
                  <div className="mb-4 p-4 rounded-lg border-2 border-red-500/50 bg-red-100 text-red-800 text-sm">{txError}</div>
                )}
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/20">
                          <th className="py-2 font-semibold text-black">Tx ID</th>
                          <th className="py-2 font-semibold text-black">Block</th>
                          <th className="py-2 font-semibold text-black">Time</th>
                          <th className="py-2 font-semibold text-black">Type</th>
                          <th className="py-2 font-semibold text-black">Program</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx, i) => (
                          <tr key={tx.txHash + i} className="border-b border-black/10 last:border-0">
                            <td className="py-2 font-mono text-xs text-black truncate max-w-[100px]" title={tx.txHash}>{tx.txHash.slice(0, 12)}…</td>
                            <td className="py-2 text-black/80">{tx.blockHeight}</td>
                            <td className="py-2 text-black/80">{new Date(tx.timestamp).toLocaleString()}</td>
                            <td className="py-2 text-black/80">{tx.txType}</td>
                            <td className="py-2 font-mono text-xs text-black/80">{tx.programName ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {transactions.length === 0 && !txLoading && <p className="py-4 text-center text-black/60">No transactions</p>}
                </Card>
              </>
            )}

            {/* Programs */}
            {selectedSection === "programs" && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Programs</h1>
                <p className="text-black/70 text-sm sm:text-base mb-4">Fetch program source and mappings by ID.</p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="e.g. credits.aleo"
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="px-3 py-2 rounded-lg border-2 border-black/20 bg-white text-black font-mono flex-1 min-w-[200px]"
                  />
                  <button onClick={fetchProgram} disabled={programLoading || !programId.trim()} className="px-4 py-2 rounded-lg bg-black text-white font-medium hover:bg-black/80 disabled:opacity-50">
                    {programLoading ? "Loading…" : "Fetch"}
                  </button>
                </div>
                {programError && (
                  <div className="mb-4 p-4 rounded-lg border-2 border-red-500/50 bg-red-100 text-red-800 text-sm">{programError}</div>
                )}
                {(programSource || programMappings.length > 0) && (
                  <Card>
                    {programMappings.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-black mb-2">Mappings</h3>
                        <p className="text-black/80 text-sm font-mono">{programMappings.join(", ")}</p>
                      </div>
                    )}
                    {programSource && (
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2">Source</h3>
                        <pre className="bg-black/5 p-4 rounded-lg overflow-x-auto text-xs font-mono text-black max-h-96 overflow-y-auto whitespace-pre">
                          {programSource}
                        </pre>
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}

            {/* DeFi */}
            {selectedSection === "defi" && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">DeFi</h1>
                <p className="text-black/70 text-sm sm:text-base mb-4">Total value locked by protocol from Provable v2 API.</p>
                <button onClick={fetchDefi} disabled={defiLoading} className="mb-4 px-4 py-2 rounded-lg bg-black text-white font-medium hover:bg-black/80 disabled:opacity-50">
                  {defiLoading ? "Loading…" : "Fetch TVL"}
                </button>
                {defiError && (
                  <div className="mb-4 p-4 rounded-lg border-2 border-red-500/50 bg-red-100 text-red-800 text-sm">{defiError}</div>
                )}
                <Card>
                  {defiTvl.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b-2 border-black/20">
                            <th className="py-3 pr-4 font-semibold text-black">Protocol</th>
                            <th className="py-3 pl-4 font-semibold text-black text-right">Total value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {defiTvl.map((row) => (
                            <tr key={row.protocol_name} className="border-b border-black/10 last:border-0 hover:bg-black/5">
                              <td className="py-3 pr-4 font-medium text-black">{row.protocol_name}</td>
                              <td className="py-3 pl-4 text-right font-mono text-black/80">{row.total_value.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-black/60 text-sm py-6 text-center">No TVL data. Click Fetch TVL.</p>
                  )}
                </Card>
              </>
            )}

            {/* Validators */}
            {selectedSection === "validators" && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Validators</h1>
                <p className="text-black/70 text-sm sm:text-base mb-4">Committee members from Provable API. Copy an address with the copy button.</p>
                <button onClick={fetchValidators} disabled={validatorsLoading} className="mb-4 px-4 py-2 rounded-lg bg-black text-white font-medium hover:bg-black/80 disabled:opacity-50">
                  {validatorsLoading ? "Loading…" : "Fetch validators"}
                </button>
                {validatorsError && (
                  <div className="mb-4 p-4 rounded-lg border-2 border-red-500/50 bg-red-100 text-red-800 text-sm">{validatorsError}</div>
                )}
                <Card>
                  {validators.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b-2 border-black/20">
                            <th className="py-3 pr-4 font-semibold text-black w-12">#</th>
                            <th className="py-3 pr-4 font-semibold text-black">Address</th>
                            <th className="py-3 w-10 text-right font-semibold text-black">Copy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validators.map((v, i) => (
                            <tr key={v.address} className="border-b border-black/10 last:border-0 hover:bg-black/5">
                              <td className="py-3 pr-4 text-black/70 font-mono">{i + 1}</td>
                              <td className="py-3 pr-4 font-mono text-black break-all" title={v.address}>{v.address}</td>
                              <td className="py-3 text-right">
                                <CopyButton text={v.address} label="Copy address" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-black/60 text-sm py-6 text-center">No validators loaded. Click Fetch validators.</p>
                  )}
                </Card>
              </>
            )}

            {/* API Documentation */}
            {selectedSection === "api-docs" && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">API Documentation</h1>
                <p className="text-black/70 text-sm sm:text-base mb-4">Endpoints used by this explorer. Click 📋 to copy the path.</p>
                <div className="mb-6 p-4 rounded-xl border-2 border-black/20 bg-black/5 text-sm text-black/90">
                  <p className="font-semibold text-black mb-2">What API we use</p>
                  <p className="mb-2">This app uses <strong>Provable</strong> (Aleo explorer API) as the data source. The paths below are this app’s <strong>Next.js API routes</strong>; they proxy to Provable under the hood.</p>
                  <ul className="list-disc list-inside space-y-1 text-black/80">
                    <li><strong>/api/v2/*</strong> — Proxies to <span className="font-mono text-xs">api.explorer.provable.com/v2</span> (block height/hash/latest, transaction metrics, DeFi TVL).</li>
                    <li><strong>/api/blocks</strong>, <strong>/api/transactions</strong>, <strong>/api/programs</strong>, <strong>/api/validators</strong> — Proxies to Provable <strong>v1</strong> (<span className="font-mono text-xs">api.explorer.provable.com/v1</span>) via <span className="font-mono text-xs">@provablehq/sdk</span>.</li>
                  </ul>
                </div>
                <Card>
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-black mb-3 pb-2 border-b border-black/20">V2 — Block &amp; metrics</h2>
                      <ul className="space-y-2">
                        {["/api/v2/block/height/latest", "/api/v2/block/hash/latest", "/api/v2/block/latest", "/api/v2/metrics/transactions", "/api/v2/defi/totalValue"].map((path) => (
                          <li key={path} className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-black/60 shrink-0">GET</span>
                            <code className="flex-1 min-w-0 font-mono text-black text-sm break-all bg-black/5 px-2 py-1 rounded">{path}</code>
                            <CopyButton text={path} label="Copy path" />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-black mb-3 pb-2 border-b border-black/20">V1 — Blocks, transactions, programs, validators</h2>
                      <ul className="space-y-2">
                        {["/api/blocks?page=1&limit=20", "/api/blocks?height=12345", "/api/blocks/12345", "/api/transactions?limit=50", "/api/transactions?limit=50&program=credits.aleo", "/api/programs?id=credits.aleo", "/api/validators"].map((path) => (
                          <li key={path} className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-black/60 shrink-0">GET</span>
                            <code className="flex-1 min-w-0 font-mono text-black text-sm break-all bg-black/5 px-2 py-1 rounded">{path}</code>
                            <CopyButton text={path} label="Copy path" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
