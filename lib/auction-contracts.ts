// SilentBid v2 + silentbid_usdc.aleo config.
// Program IDs can be overridden via NEXT_PUBLIC_* env vars at build time.

export const SILENTBID_PROGRAM_ID =
  process.env.NEXT_PUBLIC_SILENTBID_PROGRAM_ID || "silentbid_v2.aleo"

export const SILENTBID_USDC_PROGRAM_ID =
  process.env.NEXT_PUBLIC_SILENTBID_USDC_PROGRAM_ID || "silentbid_usdc.aleo"

// Default fee in microcredits applied to every transition
export const SILENTBID_FEE = 200_000

export type AuctionStatus = "active" | "upcoming" | "ended"

export interface AuctionInfo {
  creator: string
  item_name: string
  min_bid: number
  max_bid: number
  end_block: number
  grace_block: number
  is_settled: boolean
  auction_id: string
}

export interface AuctionWithMeta extends AuctionInfo {
  bid_count: number
  highest_bid: number
  status: AuctionStatus
}
