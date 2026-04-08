// SilentBid - Private Sealed-Bid Auction on Aleo
// Bids are private ZK records; only commitments are public until reveal.

program silentbid_v1.aleo {

    // ─── Records (Private) ───────────────────────────────────────

    record Bid {
        owner: address,
        auction_id: field,
        amount: u64,
        salt: field,
        is_revealed: bool,
    }

    record AuctionReceipt {
        owner: address,
        auction_id: field,
        item_name: field,
        min_bid: u64,
        end_block: u32,
    }

    // ─── Structs ─────────────────────────────────────────────────

    struct AuctionInfo {
        creator: address,
        item_name: field,
        min_bid: u64,
        end_block: u32,
        is_settled: bool,
    }

    struct CommitData {
        addr: address,
        id: field,
        amt: u64,
        nonce: field,
    }

    // ─── Mappings (Public On-Chain State) ─────────────────────────

    mapping auctions: field => AuctionInfo;
    mapping commitments: field => bool;
    mapping highest_bids: field => u64;
    mapping highest_bidders: field => address;
    mapping bid_counts: field => u64;
    mapping auction_counter: u8 => u64;

    // ─── Constructor ─────────────────────────────────────────────

    @noupgrade
    constructor() {}

    // ─── Functions ───────────────────────────────────────────────

    // Create a new auction
    fn create_auction(
        item_name: field,
        min_bid: u64,
        duration_blocks: u32,
    ) -> (AuctionReceipt, Final) {
        let duration_as_field: field = BHP256::hash_to_field(duration_blocks);

        let auction_id: field = BHP256::hash_to_field(CommitData {
            addr: self.caller,
            id: item_name,
            amt: min_bid,
            nonce: duration_as_field,
        });

        let receipt: AuctionReceipt = AuctionReceipt {
            owner: self.caller,
            auction_id: auction_id,
            item_name: item_name,
            min_bid: min_bid,
            end_block: 0u32,
        };

        let caller: address = self.caller;

        return (receipt, final {
            let exists: bool = auctions.contains(auction_id);
            assert(!exists);

            let end_block: u32 = block.height + duration_blocks;

            let info: AuctionInfo = AuctionInfo {
                creator: caller,
                item_name: item_name,
                min_bid: min_bid,
                end_block: end_block,
                is_settled: false,
            };

            auctions.set(auction_id, info);
            bid_counts.set(auction_id, 0u64);
            highest_bids.set(auction_id, 0u64);

            let current: u64 = auction_counter.get_or_use(0u8, 0u64);
            auction_counter.set(0u8, current + 1u64);
        });
    }

    // Place a sealed bid (private)
    fn place_bid(
        auction_id: field,
        amount: u64,
        salt: field,
    ) -> (Bid, Final) {
        let commitment: field = BHP256::hash_to_field(CommitData {
            addr: self.caller,
            id: auction_id,
            amt: amount,
            nonce: salt,
        });

        let bid: Bid = Bid {
            owner: self.caller,
            auction_id: auction_id,
            amount: amount,
            salt: salt,
            is_revealed: false,
        };

        return (bid, final {
            let info: AuctionInfo = auctions.get(auction_id);

            assert(block.height <= info.end_block);
            assert(!info.is_settled);

            let already: bool = commitments.contains(commitment);
            assert(!already);

            commitments.set(commitment, true);

            let count: u64 = bid_counts.get_or_use(auction_id, 0u64);
            bid_counts.set(auction_id, count + 1u64);
        });
    }

    // Reveal a bid after auction deadline
    fn reveal_bid(
        bid: Bid,
    ) -> (Bid, Final) {
        assert_eq(bid.owner, self.caller);
        assert(!bid.is_revealed);

        let commitment: field = BHP256::hash_to_field(CommitData {
            addr: self.caller,
            id: bid.auction_id,
            amt: bid.amount,
            nonce: bid.salt,
        });

        let revealed_bid: Bid = Bid {
            owner: bid.owner,
            auction_id: bid.auction_id,
            amount: bid.amount,
            salt: bid.salt,
            is_revealed: true,
        };

        let auction_id: field = bid.auction_id;
        let amount: u64 = bid.amount;
        let bidder: address = self.caller;

        return (revealed_bid, final {
            let info: AuctionInfo = auctions.get(auction_id);

            assert(block.height > info.end_block);
            assert(!info.is_settled);

            let comm_exists: bool = commitments.get(commitment);
            assert(comm_exists);

            assert(amount >= info.min_bid);

            let current_highest: u64 = highest_bids.get_or_use(auction_id, 0u64);
            if amount > current_highest {
                highest_bids.set(auction_id, amount);
                highest_bidders.set(auction_id, bidder);
            }
        });
    }

    // Settle the auction
    fn settle_auction(
        auction_id: field,
    ) -> Final {
        let caller: address = self.caller;

        return final {
            let info: AuctionInfo = auctions.get(auction_id);

            assert(block.height > info.end_block);
            assert(!info.is_settled);

            let winner: address = highest_bidders.get(auction_id);
            let is_winner: bool = caller == winner;
            let is_creator: bool = caller == info.creator;
            assert(is_winner || is_creator);

            let settled_info: AuctionInfo = AuctionInfo {
                creator: info.creator,
                item_name: info.item_name,
                min_bid: info.min_bid,
                end_block: info.end_block,
                is_settled: true,
            };
            auctions.set(auction_id, settled_info);
        };
    }
}
