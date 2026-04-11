import {
  SILENTBID_PROGRAM_ID,
  SILENTBID_USDC_PROGRAM_ID,
  type AuctionInfo,
} from "./auction-contracts";

async function getMappingValue(
  programId: string,
  mappingName: string,
  key: string
): Promise<string | null> {
  const mod = await import("./aleo-client");
  return mod.getMappingValue(programId, mappingName, key);
}

export type { AuctionInfo };

/**
 * Parse an AuctionInfo struct (silentbid_v2 shape) from an Aleo mapping response.
 * Aleo returns structs as JSON-like strings with typed literals, e.g.
 *   { creator: aleo1..., item_name: 123field, min_bid: 100u64, max_bid: 5000000u64,
 *     end_block: 50000u32, grace_block: 51000u32, is_settled: false }
 */
export function parseAuctionInfo(raw: string, auctionId: string): AuctionInfo | null {
  if (!raw || raw === "null") return null;

  const cleaned = raw.replace(/^"?\{?\s*/, "").replace(/\s*\}?"?$/, "");
  const fields: Record<string, string> = {};
  const regex = /(\w+)\s*:\s*([^,}]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(cleaned)) !== null) {
    fields[m[1].trim()] = m[2].trim();
  }

  const numField = (key: string) =>
    parseInt((fields[key] || "0").replace(/u(8|32|64|128)$/, ""), 10);

  return {
    creator: fields.creator || "",
    item_name: fields.item_name || "0field",
    min_bid: numField("min_bid"),
    max_bid: numField("max_bid"),
    end_block: numField("end_block"),
    grace_block: numField("grace_block"),
    is_settled: fields.is_settled === "true",
    auction_id: auctionId,
  };
}

export async function fetchAuctionInfo(auctionId: string): Promise<AuctionInfo | null> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "auctions", auctionId);
  if (!raw) return null;
  return parseAuctionInfo(raw, auctionId);
}

export async function fetchBidCount(auctionId: string): Promise<number> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "bid_counts", auctionId);
  if (!raw) return 0;
  return parseInt(raw.replace(/u64$/, ""), 10) || 0;
}

export async function fetchHighestBid(auctionId: string): Promise<number> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "highest_bids", auctionId);
  if (!raw) return 0;
  return parseInt(raw.replace(/u64$/, ""), 10) || 0;
}

export async function fetchHighestBidder(auctionId: string): Promise<string | null> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "highest_bidders", auctionId);
  if (!raw || raw === "null") return null;
  return raw.trim().replace(/^"|"$/g, "");
}

export async function fetchAuctionCount(): Promise<number> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "auction_counter", "0u8");
  if (!raw) return 0;
  return parseInt(raw.replace(/u64$/, ""), 10) || 0;
}

/** USDC balance of an arbitrary address (caller, program escrow, etc). */
export async function fetchUsdcBalance(address: string): Promise<number> {
  const raw = await getMappingValue(SILENTBID_USDC_PROGRAM_ID, "balances", address);
  if (!raw) return 0;
  return parseInt(raw.replace(/u64$/, ""), 10) || 0;
}

/** Random BHP256-safe salt for bid commitments. */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  const FIELD_MODULUS = BigInt(
    "8444461749428370424248824938781546531375899335154063827935233455917409239040"
  );
  const value = BigInt("0x" + hex) % FIELD_MODULUS;
  return `${value}field`;
}

export type AuctionPhase = "active" | "reveal" | "grace_expired" | "settled";

/** Determine lifecycle phase of an auction for UI decisions. */
export function getAuctionStatus(
  auction: AuctionInfo,
  currentBlockHeight: number
): AuctionPhase {
  if (auction.is_settled) return "settled";
  if (currentBlockHeight > auction.grace_block) return "grace_expired";
  if (currentBlockHeight > auction.end_block) return "reveal";
  return "active";
}

/** Microcredits/microUSDC → human display. */
export function formatCredits(microcredits: number): string {
  if (microcredits === 0) return "0";
  const credits = microcredits / 1_000_000;
  return credits.toFixed(credits < 1 ? 6 : 2);
}
