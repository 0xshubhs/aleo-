// Aleo auction contracts config (replaces Ethereum auction-contracts)
// This module provides types and constants for the silentbid_v1.aleo program

export const SILENTBID_PROGRAM_ID = "silentbid_v1.aleo"
export const SILENTBID_FEE = 150_000 // microcredits

export type AuctionStatus = "active" | "upcoming" | "ended"

export interface AuctionInfo {
  creator: string
  item_name: string
  min_bid: number
  end_block: number
  is_settled: boolean
  auction_id: string
}

export interface AuctionWithMeta extends AuctionInfo {
  bid_count: number
  highest_bid: number
  status: AuctionStatus
}
