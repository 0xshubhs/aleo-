# SilentBid live test state (testnet)

## Program
- id: `silentbid_v1.aleo`
- address: `aleo1uqhxxx4snc33nymztch8whq9se23egc5vd0y609uw6m6edt7g5qqp64t6j`
- deploy tx: `at1vn3e93g54e04fjltrp2yry7rnfyk28u863jvy36zpxpdpx02ryzsg6gjn8`

## Pending auction (waiting on grace period)
- auction_id: `4268751437624735585494870038257590570835131255942032840046118436588049471182field`
- item_name: `11111field`
- creator / sole bidder / winner: `aleo1jkhlte69auf8r2zf44g93wl9teyuw9kn0w2dlan3546j2rmjvs9s76z6wp`
- min_bid: 1 credit, max_bid: 5 credits, winning bid: 3 credits
- end_block: 15697027 (past), grace_block: 15698027 (wait for this)
- escrowed in program: 5 credits

## When grace passes, run these in order
```bash
# 1. Settle
leo execute settle_auction \
  4268751437624735585494870038257590570835131255942032840046118436588049471182field \
  --private-key "$ALEOPVTKEY" --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" --broadcast --yes

# 2. Winner pulls overpay (max_bid 5 - winning 3 = 2 credits back)
leo execute claim_winner_overpay \
  4268751437624735585494870038257590570835131255942032840046118436588049471182field \
  2000000u64 \
  --private-key "$ALEOPVTKEY" --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" --broadcast --yes

# 3. Creator claims winning amount (3 credits)
leo execute claim_creator_payment \
  4268751437624735585494870038257590570835131255942032840046118436588049471182field \
  3000000u64 \
  --private-key "$ALEOPVTKEY" --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" --broadcast --yes
```

After step 3, program escrow balance for this auction should be 0, and the creator
balance should reflect: + 5 credits total (minus fees).

## How to check block height
```bash
curl -s https://api.explorer.provable.com/v1/testnet/block/height/latest
# Wait until > 15698027 before step 1
```

## How to check program escrow
```bash
curl -s "https://api.explorer.provable.com/v1/testnet/program/credits.aleo/mapping/account/aleo1uqhxxx4snc33nymztch8whq9se23egc5vd0y609uw6m6edt7g5qqp64t6j"
```
