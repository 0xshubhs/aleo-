import silentbid_usdc.aleo;
program silentbid_v2.aleo;

record Bid:
    owner as address.private;
    auction_id as field.private;
    amount as u64.private;
    salt as field.private;
    is_revealed as boolean.private;

record AuctionReceipt:
    owner as address.private;
    auction_id as field.private;
    item_name as field.private;
    min_bid as u64.private;
    max_bid as u64.private;

struct AuctionInfo:
    creator as address;
    item_name as field;
    min_bid as u64;
    max_bid as u64;
    end_block as u32;
    grace_block as u32;
    is_settled as boolean;

struct CommitData:
    addr as address;
    id as field;
    amt as u64;
    nonce as field;

struct BidKey:
    auction_id as field;
    bidder as address;

mapping auctions:
    key as field.public;
    value as AuctionInfo.public;

mapping commitments:
    key as field.public;
    value as boolean.public;

mapping highest_bids:
    key as field.public;
    value as u64.public;

mapping highest_bidders:
    key as field.public;
    value as address.public;

mapping bid_counts:
    key as field.public;
    value as u64.public;

mapping auction_counter:
    key as u8.public;
    value as u64.public;

mapping escrowed:
    key as field.public;
    value as u64.public;

mapping revealed:
    key as field.public;
    value as boolean.public;

mapping refunded:
    key as field.public;
    value as boolean.public;

mapping creator_paid:
    key as field.public;
    value as boolean.public;

function create_auction:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as u64.private;
    input r3 as u32.private;
    input r4 as u32.private;
    gte r2 r1 into r5;
    assert.eq r5 true;
    hash.bhp256 r3 into r6 as field;
    cast self.caller r0 r1 r6 into r7 as CommitData;
    hash.bhp256 r7 into r8 as field;
    cast self.caller r8 r0 r1 r2 into r9 as AuctionReceipt.record;
    async create_auction r8 r3 self.caller r0 r1 r2 r4 into r10;
    output r9 as AuctionReceipt.record;
    output r10 as silentbid_v2.aleo/create_auction.future;

finalize create_auction:
    input r0 as field.public;
    input r1 as u32.public;
    input r2 as address.public;
    input r3 as field.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as u32.public;
    contains auctions[r0] into r7;
    not r7 into r8;
    assert.eq r8 true;
    add block.height r1 into r9;
    add r9 r6 into r10;
    cast r2 r3 r4 r5 r9 r10 false into r11 as AuctionInfo;
    set r11 into auctions[r0];
    set 0u64 into bid_counts[r0];
    set 0u64 into highest_bids[r0];
    get.or_use auction_counter[0u8] 0u64 into r12;
    add r12 1u64 into r13;
    set r13 into auction_counter[0u8];

function place_bid:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as field.private;
    input r3 as u64.private;
    lte r1 r3 into r4;
    assert.eq r4 true;
    cast self.caller r0 r1 r2 into r5 as CommitData;
    hash.bhp256 r5 into r6 as field;
    cast self.caller r0 r1 r2 false into r7 as Bid.record;
    cast r0 self.caller into r8 as BidKey;
    hash.bhp256 r8 into r9 as field;
    call silentbid_usdc.aleo/transfer_public_as_signer silentbid_v2.aleo r3 into r10;
    async place_bid r10 r0 r3 r9 r6 into r11;
    output r7 as Bid.record;
    output r11 as silentbid_v2.aleo/place_bid.future;

finalize place_bid:
    input r0 as silentbid_usdc.aleo/transfer_public_as_signer.future;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as field.public;
    await r0;
    get auctions[r1] into r5;
    lte block.height r5.end_block into r6;
    assert.eq r6 true;
    not r5.is_settled into r7;
    assert.eq r7 true;
    assert.eq r2 r5.max_bid;
    contains escrowed[r3] into r8;
    not r8 into r9;
    assert.eq r9 true;
    contains commitments[r4] into r10;
    not r10 into r11;
    assert.eq r11 true;
    set true into commitments[r4];
    set r2 into escrowed[r3];
    get.or_use bid_counts[r1] 0u64 into r12;
    add r12 1u64 into r13;
    set r13 into bid_counts[r1];

function reveal_bid:
    input r0 as Bid.record;
    assert.eq r0.owner self.caller;
    not r0.is_revealed into r1;
    assert.eq r1 true;
    cast self.caller r0.auction_id r0.amount r0.salt into r2 as CommitData;
    hash.bhp256 r2 into r3 as field;
    cast r0.owner r0.auction_id r0.amount r0.salt true into r4 as Bid.record;
    cast r0.auction_id self.caller into r5 as BidKey;
    hash.bhp256 r5 into r6 as field;
    async reveal_bid r0.auction_id r3 r0.amount r6 self.caller into r7;
    output r4 as Bid.record;
    output r7 as silentbid_v2.aleo/reveal_bid.future;

finalize reveal_bid:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as address.public;
    get auctions[r0] into r5;
    gt block.height r5.end_block into r6;
    assert.eq r6 true;
    lte block.height r5.grace_block into r7;
    assert.eq r7 true;
    not r5.is_settled into r8;
    assert.eq r8 true;
    get commitments[r1] into r9;
    assert.eq r9 true;
    gte r2 r5.min_bid into r10;
    assert.eq r10 true;
    get.or_use revealed[r3] false into r11;
    not r11 into r12;
    assert.eq r12 true;
    set true into revealed[r3];
    get.or_use highest_bids[r0] 0u64 into r13;
    gt r2 r13 into r14;
    branch.eq r14 false to end_then_0_0;
    set r2 into highest_bids[r0];
    set r4 into highest_bidders[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function settle_auction:
    input r0 as field.private;
    async settle_auction r0 into r1;
    output r1 as silentbid_v2.aleo/settle_auction.future;

finalize settle_auction:
    input r0 as field.public;
    get auctions[r0] into r1;
    gt block.height r1.grace_block into r2;
    assert.eq r2 true;
    not r1.is_settled into r3;
    assert.eq r3 true;
    cast r1.creator r1.item_name r1.min_bid r1.max_bid r1.end_block r1.grace_block true into r4 as AuctionInfo;
    set r4 into auctions[r0];

function claim_loser_refund:
    input r0 as field.private;
    input r1 as u64.private;
    call silentbid_usdc.aleo/transfer_public self.caller r1 into r2;
    cast r0 self.caller into r3 as BidKey;
    hash.bhp256 r3 into r4 as field;
    async claim_loser_refund r2 r0 r4 self.caller r1 into r5;
    output r5 as silentbid_v2.aleo/claim_loser_refund.future;

finalize claim_loser_refund:
    input r0 as silentbid_usdc.aleo/transfer_public.future;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as address.public;
    input r4 as u64.public;
    await r0;
    get auctions[r1] into r5;
    assert.eq r5.is_settled true;
    get.or_use revealed[r2] false into r6;
    assert.eq r6 true;
    get.or_use refunded[r2] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    get highest_bidders[r1] into r9;
    is.neq r3 r9 into r10;
    assert.eq r10 true;
    assert.eq r4 r5.max_bid;
    set true into refunded[r2];

function claim_winner_overpay:
    input r0 as field.private;
    input r1 as u64.private;
    call silentbid_usdc.aleo/transfer_public self.caller r1 into r2;
    cast r0 self.caller into r3 as BidKey;
    hash.bhp256 r3 into r4 as field;
    async claim_winner_overpay r2 r0 r4 self.caller r1 into r5;
    output r5 as silentbid_v2.aleo/claim_winner_overpay.future;

finalize claim_winner_overpay:
    input r0 as silentbid_usdc.aleo/transfer_public.future;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as address.public;
    input r4 as u64.public;
    await r0;
    get auctions[r1] into r5;
    assert.eq r5.is_settled true;
    get.or_use revealed[r2] false into r6;
    assert.eq r6 true;
    get.or_use refunded[r2] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    get highest_bidders[r1] into r9;
    assert.eq r3 r9;
    get highest_bids[r1] into r10;
    sub r5.max_bid r10 into r11;
    assert.eq r4 r11;
    set true into refunded[r2];

function claim_creator_payment:
    input r0 as field.private;
    input r1 as u64.private;
    call silentbid_usdc.aleo/transfer_public self.caller r1 into r2;
    async claim_creator_payment r2 r0 self.caller r1 into r3;
    output r3 as silentbid_v2.aleo/claim_creator_payment.future;

finalize claim_creator_payment:
    input r0 as silentbid_usdc.aleo/transfer_public.future;
    input r1 as field.public;
    input r2 as address.public;
    input r3 as u64.public;
    await r0;
    get auctions[r1] into r4;
    assert.eq r4.is_settled true;
    assert.eq r2 r4.creator;
    get.or_use creator_paid[r1] false into r5;
    not r5 into r6;
    assert.eq r6 true;
    get highest_bids[r1] into r7;
    assert.eq r3 r7;
    set true into creator_paid[r1];

function forfeit_nonrevealer:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as u64.private;
    call silentbid_usdc.aleo/transfer_public self.caller r2 into r3;
    cast r0 r1 into r4 as BidKey;
    hash.bhp256 r4 into r5 as field;
    async forfeit_nonrevealer r3 r0 self.caller r5 r2 into r6;
    output r6 as silentbid_v2.aleo/forfeit_nonrevealer.future;

finalize forfeit_nonrevealer:
    input r0 as silentbid_usdc.aleo/transfer_public.future;
    input r1 as field.public;
    input r2 as address.public;
    input r3 as field.public;
    input r4 as u64.public;
    await r0;
    get auctions[r1] into r5;
    assert.eq r2 r5.creator;
    gt block.height r5.grace_block into r6;
    assert.eq r6 true;
    contains escrowed[r3] into r7;
    assert.eq r7 true;
    get.or_use revealed[r3] false into r8;
    not r8 into r9;
    assert.eq r9 true;
    get.or_use refunded[r3] false into r10;
    not r10 into r11;
    assert.eq r11 true;
    assert.eq r4 r5.max_bid;
    set true into refunded[r3];

constructor:
    assert.eq edition 0u16;
