import { SILENTBID_PROGRAM_ID } from "./aleo";

async function getMappingValue(programId: string, mappingName: string, key: string): Promise<string | null> {
  const mod = await import("./aleo-client");
  return mod.getMappingValue(programId, mappingName, key);
}

export interface AuctionInfo {
  creator: string;
  item_name: string;
  min_bid: number;
  end_block: number;
  is_settled: boolean;
  auction_id: string;
}

/**
 * Parse an AuctionInfo struct from the Aleo mapping response.
 * Aleo returns structs as JSON-like strings:
 * { creator: aleo1..., item_name: 123field, min_bid: 100u64, end_block: 50000u64, is_settled: false }
 */
export function parseAuctionInfo(raw: string, auctionId: string): AuctionInfo | null {
  if (!raw || raw === "null") return null;

  // Remove outer braces and parse key-value pairs
  const cleaned = raw.replace(/^\{?\s*/, "").replace(/\s*\}?$/, "");
  const fields: Record<string, string> = {};

  // Match key: value pairs (value can contain aleo addresses with numbers)
  const regex = /(\w+)\s*:\s*([^,}]+)/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    fields[match[1].trim()] = match[2].trim();
  }

  return {
    creator: fields.creator || "",
    item_name: fields.item_name || "0field",
    min_bid: parseInt((fields.min_bid || "0").replace(/u64$/, ""), 10),
    end_block: parseInt((fields.end_block || "0").replace(/u(32|64)$/, ""), 10),
    is_settled: fields.is_settled === "true",
    auction_id: auctionId,
  };
}

/**
 * Fetch auction info from the Aleo mapping.
 */
export async function fetchAuctionInfo(auctionId: string): Promise<AuctionInfo | null> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "auctions", auctionId);
  if (!raw) return null;
  return parseAuctionInfo(raw, auctionId);
}

/**
 * Fetch the bid count for an auction.
 */
export async function fetchBidCount(auctionId: string): Promise<number> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "bid_counts", auctionId);
  if (!raw) return 0;
  return parseInt(raw.replace(/u64$/, ""), 10) || 0;
}

/**
 * Fetch the highest bid for an auction.
 */
export async function fetchHighestBid(auctionId: string): Promise<number> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "highest_bids", auctionId);
  if (!raw) return 0;
  return parseInt(raw.replace(/u64$/, ""), 10) || 0;
}

/**
 * Fetch the highest bidder address for an auction.
 */
export async function fetchHighestBidder(auctionId: string): Promise<string | null> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "highest_bidders", auctionId);
  if (!raw || raw === "null") return null;
  return raw.trim();
}

/**
 * Fetch the total auction count.
 */
export async function fetchAuctionCount(): Promise<number> {
  const raw = await getMappingValue(SILENTBID_PROGRAM_ID, "auction_counter", "0u8");
  if (!raw) return 0;
  return parseInt(raw.replace(/u64$/, ""), 10) || 0;
}

/**
 * Generate a random salt for bid commitments.
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  // Convert to field-safe value (< field modulus)
  const FIELD_MODULUS = BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239040");
  const value = BigInt("0x" + hex) % FIELD_MODULUS;
  return `${value}field`;
}

/**
 * Get auction status based on current block height.
 */
export function getAuctionStatus(
  auction: AuctionInfo,
  currentBlockHeight: number
): "active" | "reveal" | "settled" {
  if (auction.is_settled) return "settled";
  if (currentBlockHeight > auction.end_block) return "reveal";
  return "active";
}

/**
 * Format microcredits to credits for display.
 */
export function formatCredits(microcredits: number): string {
  if (microcredits === 0) return "0";
  const credits = microcredits / 1_000_000;
  return credits.toFixed(credits < 1 ? 6 : 2);
}
