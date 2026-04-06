/**
 * Provable v1 client (AleoNetworkClient) for blocks, transactions, programs, committee.
 * Same as AleoLens lib/aleo/client.ts
 */

import { AleoNetworkClient } from "@provablehq/sdk";

const BASE = (() => {
  const raw = process.env.ALEO_API_BASE || "https://api.explorer.provable.com/v1/mainnet";
  return raw.trim().replace(/\/+$/, "")
    .replace(/\/testnet\/testnet/g, "/testnet")
    .replace(/\/mainnet\/mainnet/g, "/mainnet");
})();

let _client: AleoNetworkClient | null = null;

function getClient(): AleoNetworkClient {
  if (!_client) _client = new AleoNetworkClient(BASE);
  return _client;
}

async function fetchApi<T>(path: string): Promise<T> {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Aleo API ${res.status}: ${path}`);
  const json = (await res.json()) as { result?: T };
  return (json.result ?? json) as T;
}

export interface AleoBlockHeaderMetadata {
  height?: number;
  timestamp?: number;
  [k: string]: unknown;
}

export interface AleoBlockHeader {
  metadata?: AleoBlockHeaderMetadata;
  [k: string]: unknown;
}

export interface AleoBlockRaw {
  block_hash?: string;
  hash?: string;
  header?: AleoBlockHeader;
  transactions?: AleoTransactionInBlock[];
  [k: string]: unknown;
}

export interface AleoTransactionInBlock {
  status?: string;
  type?: string;
  id?: string;
  transaction?: {
    id?: string;
    type?: string;
    execution?: { transitions?: { program_id?: string }[] };
    deployment?: { program?: string; program_id?: string; [k: string]: unknown };
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface AleoBlock {
  height: number;
  hash: string;
  timestamp: Date;
  proposer: string | null;
  transactions: AleoTxParsed[];
}

export interface AleoTxParsed {
  id: string;
  type: "deploy" | "execute" | "fee";
  programName: string | null;
}

function parseBlock(raw: AleoBlockRaw): AleoBlock {
  const hash = (raw.block_hash ?? raw.hash ?? "") as string;
  const meta = raw.header?.metadata ?? {};
  const height = Number(meta.height ?? 0);
  const ts = meta.timestamp;
  const timestamp = ts ? new Date(Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts)) : new Date(0);
  const txs: AleoTxParsed[] = [];
  const list = Array.isArray(raw.transactions) ? raw.transactions : [];
  for (const item of list) {
    const t = item.transaction ?? item;
    const id = (t.id ?? item.id) as string | undefined;
    if (!id) continue;
    const kind = (t.type ?? item.type ?? "execute") as string;
    if (kind === "fee") continue;
    let programName: string | null = null;
    const dep = t.deployment as { program?: string; program_id?: string } | undefined;
    const exec = t.execution as { transitions?: { program_id?: string }[] } | undefined;
    if (kind === "deploy" && dep) programName = dep.program || dep.program_id || null;
    if (kind === "execute" && exec?.transitions?.length)
      programName = exec.transitions[0]?.program_id ? String(exec.transitions[0].program_id) : null;
    txs.push({ id: String(id), type: kind === "deploy" ? "deploy" : "execute", programName: programName || null });
  }
  return { height, hash, timestamp, proposer: null, transactions: txs };
}

function toRawBlock(block: unknown): AleoBlockRaw {
  const b = block as Record<string, unknown>;
  return {
    block_hash: (b.block_hash ?? b.blockHash) as string | undefined,
    hash: (b.block_hash ?? b.blockHash ?? b.hash) as string | undefined,
    header: (b.header ?? {}) as AleoBlockHeader,
    transactions: (b.transactions ?? []) as AleoTransactionInBlock[],
  };
}

export async function getLatestHeight(): Promise<number> {
  try {
    const h = await getClient().getLatestHeight();
    return Number(h);
  } catch (e) {
    const res = await fetch(`${BASE}/block/height/latest`, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (res.ok) {
      const text = await res.text();
      const height = parseInt(text.trim(), 10);
      if (!isNaN(height)) return height;
      const data = JSON.parse(text) as { height?: number };
      if (typeof data?.height === "number") return data.height;
    }
    throw e;
  }
}

export async function getBlockByHeight(height: number): Promise<AleoBlock> {
  try {
    const block = await getClient().getBlock(height);
    return parseBlock(toRawBlock(block));
  } catch (e) {
    const res = await fetch(`${BASE}/block/${height}`, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (res.ok) return parseBlock(toRawBlock(await res.json()));
    throw e;
  }
}

export async function getBlockRange(start: number, end: number): Promise<AleoBlock[]> {
  try {
    const blocks = await getClient().getBlockRange(start, end);
    const list = Array.isArray(blocks) ? blocks : [];
    return list.map((b) => parseBlock(toRawBlock(b)));
  } catch (e) {
    const blocks: AleoBlock[] = [];
    for (let h = start; h <= end; h++) {
      try {
        blocks.push(await getBlockByHeight(h));
      } catch {
        // skip
      }
    }
    return blocks;
  }
}

function normalizeCommittee(committee: unknown): { members?: { address?: string }[] } {
  if (!committee || typeof committee !== "object") return { members: [] };
  const c = committee as Record<string, unknown>;
  const membersObj = c.members;
  if (membersObj && typeof membersObj === "object" && !Array.isArray(membersObj)) {
    return { members: Object.keys(membersObj).filter(Boolean).map((address) => ({ address })) };
  }
  const members = membersObj as { address?: string }[] | undefined;
  if (!Array.isArray(members)) return { members: [] };
  return {
    members: members
      .filter((m) => m && typeof m === "object" && "address" in m)
      .map((m) => ({ address: String((m as { address: unknown }).address ?? "") }))
      .filter((m) => m.address.length > 0),
  };
}

export async function getCommittee(): Promise<{ members?: { address?: string }[] }> {
  try {
    const committee = await getClient().getLatestCommittee();
    return normalizeCommittee(committee);
  } catch {
    try {
      return await fetchApi<{ members?: { address?: string }[] }>("/committee/latest");
    } catch {
      return { members: [] };
    }
  }
}

export async function getProgram(programId: string): Promise<string | null> {
  try {
    const src = await getClient().getProgram(programId);
    if (typeof src === "string" && src.trim().length > 0) return src;
    return null;
  } catch (e) {
    try {
      const res = await fetch(`${BASE}/program/${encodeURIComponent(programId)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          return typeof parsed === "string" ? parsed : text;
        } catch {
          return text;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export async function getProgramMappingNames(programId: string): Promise<string[]> {
  try {
    const names = await getClient().getProgramMappingNames(programId);
    if (Array.isArray(names)) return names.filter((n): n is string => typeof n === "string" && n.length > 0);
    return [];
  } catch {
    return [];
  }
}
