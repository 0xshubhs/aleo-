// SilentBid v2 — Sealed-bid auction escrowed in silentbid_usdc.aleo.
//
// Same commit/reveal/pull-claim flow as silentbid_v1.aleo, but every payment moves
// test USDC instead of native credits. Every bidder escrows the same public max_bid,
// so on-chain transfers leak nothing about real bid magnitude until reveal.

import silentbid_usdc.aleo;

program silentbid_v2.aleo {

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
        max_bid: u64,
    }

    struct AuctionInfo {
        creator: address,
        item_name: field,
        min_bid: u64,
        max_bid: u64,
        end_block: u32,
        grace_block: u32,
        is_settled: bool,
    }

    struct CommitData {
        addr: address,
        id: field,
        amt: u64,
        nonce: field,
    }

    struct BidKey {
        auction_id: field,
        bidder: address,
    }

    mapping auctions: field => AuctionInfo;
    mapping commitments: field => bool;
    mapping highest_bids: field => u64;
    mapping highest_bidders: field => address;
    mapping bid_counts: field => u64;
    mapping auction_counter: u8 => u64;

    mapping escrowed: field => u64;
    mapping revealed: field => bool;
    mapping refunded: field => bool;

    mapping creator_paid: field => bool;

    @noupgrade
    constructor() {}

    // ═══ 1. Create auction ═══════════════════════════════════
    fn create_auction(
        item_name: field,
        min_bid: u64,
        max_bid: u64,
        duration_blocks: u32,
        grace_blocks: u32,
    ) -> (AuctionReceipt, Final) {
        assert(max_bid >= min_bid);

        let nonce: field = BHP256::hash_to_field(duration_blocks);
        let auction_id: field = BHP256::hash_to_field(CommitData {
            addr: self.caller,
            id: item_name,
            amt: min_bid,
            nonce: nonce,
        });

        let receipt: AuctionReceipt = AuctionReceipt {
            owner: self.caller,
            auction_id: auction_id,
            item_name: item_name,
            min_bid: min_bid,
            max_bid: max_bid,
        };

        let creator: address = self.caller;

        return (receipt, final {
            assert(!auctions.contains(auction_id));
            let end_block: u32 = block.height + duration_blocks;
            let info: AuctionInfo = AuctionInfo {
                creator: creator,
                item_name: item_name,
                min_bid: min_bid,
                max_bid: max_bid,
                end_block: end_block,
                grace_block: end_block + grace_blocks,
                is_settled: false,
            };
            auctions.set(auction_id, info);
            bid_counts.set(auction_id, 0u64);
            highest_bids.set(auction_id, 0u64);
            let c: u64 = auction_counter.get_or_use(0u8, 0u64);
            auction_counter.set(0u8, c + 1u64);
        });
    }

    // ═══ 2. Place sealed bid — escrows max_bid in USDC ═══════
    fn place_bid(
        auction_id: field,
        amount: u64,
        salt: field,
        max_bid: u64,
    ) -> (Bid, Final) {
        assert(amount <= max_bid);

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

        let bid_key: field = BHP256::hash_to_field(BidKey {
            auction_id: auction_id,
            bidder: self.caller,
        });

        let esc: Final = silentbid_usdc.aleo::transfer_public_as_signer(
            silentbid_v2.aleo,
            max_bid,
        );

        return (bid, final {
            Final::run(esc);
            let info: AuctionInfo = auctions.get(auction_id);
            assert(block.height <= info.end_block);
            assert(!info.is_settled);
            assert_eq(max_bid, info.max_bid);
            assert(!escrowed.contains(bid_key));
            assert(!commitments.contains(commitment));

            commitments.set(commitment, true);
            escrowed.set(bid_key, max_bid);
            let n: u64 = bid_counts.get_or_use(auction_id, 0u64);
            bid_counts.set(auction_id, n + 1u64);
        });
    }

    // ═══ 3. Reveal bid ═══════════════════════════════════════
    fn reveal_bid(bid: Bid) -> (Bid, Final) {
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

        let bid_key: field = BHP256::hash_to_field(BidKey {
            auction_id: bid.auction_id,
            bidder: self.caller,
        });

        let auction_id: field = bid.auction_id;
        let amount: u64 = bid.amount;
        let bidder: address = self.caller;

        return (revealed_bid, final {
            let info: AuctionInfo = auctions.get(auction_id);
            assert(block.height > info.end_block);
            assert(block.height <= info.grace_block);
            assert(!info.is_settled);
            assert(commitments.get(commitment));
            assert(amount >= info.min_bid);
            assert(!revealed.get_or_use(bid_key, false));

            revealed.set(bid_key, true);

            let hi: u64 = highest_bids.get_or_use(auction_id, 0u64);
            if amount > hi {
                highest_bids.set(auction_id, amount);
                highest_bidders.set(auction_id, bidder);
            }
        });
    }

    // ═══ 4. Settle ═══════════════════════════════════════════
    fn settle_auction(auction_id: field) -> Final {
        return final {
            let info: AuctionInfo = auctions.get(auction_id);
            assert(block.height > info.grace_block);
            assert(!info.is_settled);
            let settled: AuctionInfo = AuctionInfo {
                creator: info.creator,
                item_name: info.item_name,
                min_bid: info.min_bid,
                max_bid: info.max_bid,
                end_block: info.end_block,
                grace_block: info.grace_block,
                is_settled: true,
            };
            auctions.set(auction_id, settled);
        };
    }

    // ═══ 5a. Loser pulls full refund in USDC ═════════════════
    fn claim_loser_refund(
        auction_id: field,
        refund_amount: u64,
    ) -> Final {
        let refund_f: Final = silentbid_usdc.aleo::transfer_public(self.caller, refund_amount);
        let bid_key: field = BHP256::hash_to_field(BidKey {
            auction_id: auction_id,
            bidder: self.caller,
        });
        let bidder: address = self.caller;

        return final {
            Final::run(refund_f);
            let info: AuctionInfo = auctions.get(auction_id);
            assert(info.is_settled);
            assert(revealed.get_or_use(bid_key, false));
            assert(!refunded.get_or_use(bid_key, false));
            let winner: address = highest_bidders.get(auction_id);
            assert(bidder != winner);
            assert_eq(refund_amount, info.max_bid);
            refunded.set(bid_key, true);
        };
    }

    // ═══ 5b. Winner pulls overpay = max_bid - winning ════════
    fn claim_winner_overpay(
        auction_id: field,
        overpay: u64,
    ) -> Final {
        let refund_f: Final = silentbid_usdc.aleo::transfer_public(self.caller, overpay);
        let bid_key: field = BHP256::hash_to_field(BidKey {
            auction_id: auction_id,
            bidder: self.caller,
        });
        let bidder: address = self.caller;

        return final {
            Final::run(refund_f);
            let info: AuctionInfo = auctions.get(auction_id);
            assert(info.is_settled);
            assert(revealed.get_or_use(bid_key, false));
            assert(!refunded.get_or_use(bid_key, false));
            assert_eq(bidder, highest_bidders.get(auction_id));
            let winning: u64 = highest_bids.get(auction_id);
            assert_eq(overpay, info.max_bid - winning);
            refunded.set(bid_key, true);
        };
    }

    // ═══ 5c. Creator pulls winning amount ════════════════════
    fn claim_creator_payment(
        auction_id: field,
        winning: u64,
    ) -> Final {
        let pay_f: Final = silentbid_usdc.aleo::transfer_public(self.caller, winning);
        let caller: address = self.caller;

        return final {
            Final::run(pay_f);
            let info: AuctionInfo = auctions.get(auction_id);
            assert(info.is_settled);
            assert_eq(caller, info.creator);
            assert(!creator_paid.get_or_use(auction_id, false));
            assert_eq(winning, highest_bids.get(auction_id));
            creator_paid.set(auction_id, true);
        };
    }

    // ═══ 6. Creator sweeps non-revealer escrow ═══════════════
    fn forfeit_nonrevealer(
        auction_id: field,
        bidder: address,
        amount: u64,
    ) -> Final {
        let pay_f: Final = silentbid_usdc.aleo::transfer_public(self.caller, amount);
        let bid_key: field = BHP256::hash_to_field(BidKey {
            auction_id: auction_id,
            bidder: bidder,
        });
        let caller: address = self.caller;

        return final {
            Final::run(pay_f);
            let info: AuctionInfo = auctions.get(auction_id);
            assert_eq(caller, info.creator);
            assert(block.height > info.grace_block);
            assert(escrowed.contains(bid_key));
            assert(!revealed.get_or_use(bid_key, false));
            assert(!refunded.get_or_use(bid_key, false));
            assert_eq(amount, info.max_bid);
            refunded.set(bid_key, true);
        };
    }
}
