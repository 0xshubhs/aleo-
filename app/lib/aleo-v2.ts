/**
 * Provable API v2 REST client (same as AleoLens).
 * Base: https://api.explorer.provable.com/v2/mainnet (or testnet via ALEO_API_V2)
 */

const V2_BASE =
  process.env.ALEO_API_V2 || "https://api.explorer.provable.com/v2/mainnet";

async function fetchV2<T>(path: string): Promise<T> {
  const url = `${V2_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Provable v2 ${res.status}: ${path} ${text}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

interface V2HeightLatest {
  height: number;
}

interface V2HashLatest {
  hash: string;
}

interface V2MetricsTransactionDay {
  day: string;
  count: number;
}

export interface V2BlockLatest {
  block_hash: string;
  previous_hash: string;
  header: Record<string, unknown>;
  [k: string]: unknown;
}

export async function getLatestBlockV2(): Promise<V2BlockLatest | null> {
  try {
    return await fetchV2<V2BlockLatest>("/block/latest");
  } catch {
    return null;
  }
}

export async function getLatestHeightV2(): Promise<number | null> {
  try {
    const r = await fetchV2<number | V2HeightLatest>("/block/height/latest");
    if (typeof r === "number") return r;
    return typeof (r as V2HeightLatest)?.height === "number" ? (r as V2HeightLatest).height : null;
  } catch {
    return null;
  }
}

export async function getLatestHashV2(): Promise<string | null> {
  try {
    const r = await fetchV2<string | V2HashLatest>("/block/hash/latest");
    if (typeof r === "string") return r;
    return typeof (r as V2HashLatest)?.hash === "string" ? (r as V2HashLatest).hash : null;
  } catch {
    return null;
  }
}

export async function getTransactionMetricsDailyV2(): Promise<
  { date: string; count: number }[]
> {
  try {
    const r = await fetchV2<V2MetricsTransactionDay[]>("/metrics/transactions");
    if (!Array.isArray(r)) return [];
    return r.map((x) => {
      const dayStr = String(x?.day ?? "");
      const date = dayStr.includes("T") ? dayStr.split("T")[0] : dayStr.slice(0, 10);
      return {
        date,
        count: Number(x?.count ?? 0),
      };
    });
  } catch (e) {
    console.error("[getTransactionMetricsDailyV2]", e);
    return [];
  }
}

export async function getDeFiTVLV2(): Promise<
  { protocol_name: string; total_value: number }[]
> {
  try {
    const r = await fetchV2<{ protocol_name: string; total_value: number }[]>("/defi/totalValue");
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
