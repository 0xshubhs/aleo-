program silentbid_v1.aleo;

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
    end_block as u32.private;

struct AuctionInfo:
    creator as address;
    item_name as field;
    min_bid as u64;
    end_block as u32;
    is_settled as boolean;

struct CommitData:
    addr as address;
    id as field;
    amt as u64;
    nonce as field;

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

function create_auction:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as u32.private;
    hash.bhp256 r2 into r3 as field;
    cast self.caller r0 r1 r3 into r4 as CommitData;
    hash.bhp256 r4 into r5 as field;
    cast self.caller r5 r0 r1 0u32 into r6 as AuctionReceipt.record;
    async create_auction r5 r2 self.caller r0 r1 into r7;
    output r6 as AuctionReceipt.record;
    output r7 as silentbid_v1.aleo/create_auction.future;

finalize create_auction:
    input r0 as field.public;
    input r1 as u32.public;
    input r2 as address.public;
    input r3 as field.public;
    input r4 as u64.public;
    contains auctions[r0] into r5;
    not r5 into r6;
    assert.eq r6 true;
    add block.height r1 into r7;
    cast r2 r3 r4 r7 false into r8 as AuctionInfo;
    set r8 into auctions[r0];
    set 0u64 into bid_counts[r0];
    set 0u64 into highest_bids[r0];
    get.or_use auction_counter[0u8] 0u64 into r9;
    add r9 1u64 into r10;
    set r10 into auction_counter[0u8];

function place_bid:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as field.private;
    cast self.caller r0 r1 r2 into r3 as CommitData;
    hash.bhp256 r3 into r4 as field;
    cast self.caller r0 r1 r2 false into r5 as Bid.record;
    async place_bid r0 r4 into r6;
    output r5 as Bid.record;
    output r6 as silentbid_v1.aleo/place_bid.future;

finalize place_bid:
    input r0 as field.public;
    input r1 as field.public;
    get auctions[r0] into r2;
    lte block.height r2.end_block into r3;
    assert.eq r3 true;
    not r2.is_settled into r4;
    assert.eq r4 true;
    contains commitments[r1] into r5;
    not r5 into r6;
    assert.eq r6 true;
    set true into commitments[r1];
    get.or_use bid_counts[r0] 0u64 into r7;
    add r7 1u64 into r8;
    set r8 into bid_counts[r0];

function reveal_bid:
    input r0 as Bid.record;
    assert.eq r0.owner self.caller;
    not r0.is_revealed into r1;
    assert.eq r1 true;
    cast self.caller r0.auction_id r0.amount r0.salt into r2 as CommitData;
    hash.bhp256 r2 into r3 as field;
    cast r0.owner r0.auction_id r0.amount r0.salt true into r4 as Bid.record;
    async reveal_bid r0.auction_id r3 r0.amount self.caller into r5;
    output r4 as Bid.record;
    output r5 as silentbid_v1.aleo/reveal_bid.future;

finalize reveal_bid:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as address.public;
    get auctions[r0] into r4;
    gt block.height r4.end_block into r5;
    assert.eq r5 true;
    not r4.is_settled into r6;
    assert.eq r6 true;
    get commitments[r1] into r7;
    assert.eq r7 true;
    gte r2 r4.min_bid into r8;
    assert.eq r8 true;
    get.or_use highest_bids[r0] 0u64 into r9;
    gt r2 r9 into r10;
    branch.eq r10 false to end_then_0_0;
    set r2 into highest_bids[r0];
    set r3 into highest_bidders[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function settle_auction:
    input r0 as field.private;
    async settle_auction r0 self.caller into r1;
    output r1 as silentbid_v1.aleo/settle_auction.future;

finalize settle_auction:
    input r0 as field.public;
    input r1 as address.public;
    get auctions[r0] into r2;
    gt block.height r2.end_block into r3;
    assert.eq r3 true;
    not r2.is_settled into r4;
    assert.eq r4 true;
    get highest_bidders[r0] into r5;
    is.eq r1 r5 into r6;
    is.eq r1 r2.creator into r7;
    or r6 r7 into r8;
    assert.eq r8 true;
    cast r2.creator r2.item_name r2.min_bid r2.end_block true into r9 as AuctionInfo;
    set r9 into auctions[r0];

constructor:
    assert.eq edition 0u16;
