# SilentBid

**Privacy-preserving sealed-bid auctions on Aleo.**

SilentBid uses zero-knowledge proofs to run auctions where bid amounts stay completely hidden until the reveal phase. No one — not even the auctioneer — can see what you bid until the bidding window closes. Built for the Aleo Privacy Buildathon.

> **Live on Aleo Testnet** | Program: [`silentbid_v3.aleo`](https://testnet.explorer.provable.com/program/silentbid_v3.aleo)

---

## Why SilentBid?

Traditional auctions leak information. On-chain auctions on transparent blockchains are even worse — every bid is visible to everyone in real-time, enabling front-running, bid sniping, and strategic manipulation.

SilentBid solves this with Aleo's privacy primitives:

| Problem | SilentBid Solution |
|---------|-------------------|
| Bids visible on-chain | Bid amounts encrypted in private ZK records |
| Front-running | Commitment hashes reveal nothing about amounts |
| Bid manipulation | All bidders escrow the same `max_bid` — transfers leak zero info |
| Winner-takes-all transparency | Only the winner's identity is revealed after settlement |

---

## How It Works

### Commit-Reveal Auction in 4 Phases

```
Phase 1: BIDDING                    Phase 2: REVEAL
┌─────────────────────┐            ┌─────────────────────┐
│ Bidders submit       │            │ Bidders open their   │
│ sealed bids with     │  ──────>  │ private Bid records  │
│ BHP256 commitment    │            │ to prove their       │
│ hashes on-chain      │            │ actual bid amount    │
└─────────────────────┘            └─────────────────────┘
        │                                    │
        │  All bids are PRIVATE              │  Highest bid determined
        │  Only hash visible                 │  on-chain via ZK proof
        ▼                                    ▼
Phase 4: CLAIMS                     Phase 3: SETTLEMENT
┌─────────────────────┐            ┌─────────────────────┐
│ Winner: pays bid amt │            │ Auction locked       │
│ Losers: full refund  │  <──────  │ No more reveals      │
│ Creator: gets paid   │            │ State finalized      │
└─────────────────────┘            └─────────────────────┘
```

### Privacy Guarantees

| Data | During Bidding | After Reveal | After Settlement |
|------|:-:|:-:|:-:|
| Bid amount | Private | Revealed | Public |
| Bidder identity | Private | Winner only | Winner only |
| Number of bids | Public (count) | Public | Public |
| Bid strategy | Private | Private | Private |

**Key insight:** Every bidder escrows the same `max_bid` amount in USDC. Since all public transfers are identical, on-chain observers learn nothing about actual bid amounts from watching the escrow transactions.

---

## Why Privacy Is Essential for Auctions

Auctions are one of the clearest real-world use cases where **privacy isn't optional — it's a requirement for fairness**.

**The problem with transparent blockchains:**
Every bid on Ethereum, Solana, or any public chain is visible in the mempool before it's even confirmed. This creates:

1. **Front-running** — MEV bots see your bid and place a slightly higher one in the same block
2. **Last-second sniping** — Bidders wait until the final moment, using others' bids as free information
3. **Collusion** — Bidders coordinate based on visible bid history to suppress prices
4. **Strategic manipulation** — Seeing the current highest bid lets bidders bid just $1 more instead of their true valuation

**How SilentBid uses Aleo's privacy:**

| Aleo Primitive | How SilentBid Uses It |
|---|---|
| **Private Records** | Bid amounts stored as encrypted records — only the bidder can decrypt their own bid |
| **BHP256 Commitments** | On-chain commitment hash binds the bidder to their amount without revealing it |
| **Finalize Blocks** | Public mapping updates (highest bid, settlement) happen on-chain with validator consensus |
| **Uniform Escrow** | Every bidder deposits identical `max_bid` amounts — transfer amounts leak zero information |
| **ZK Proof Verification** | During reveal, the contract verifies the commitment matches without trusting the bidder |

**Result:** A sealed-bid auction where the blockchain itself cannot see what anyone bid until the reveal phase. This is impossible on any transparent chain without a trusted third party.

---

## Architecture

### Leo Programs (Deployed on Testnet)

| Program | Purpose | TX |
|---------|---------|------|
| `silentbid_v3.aleo` | Core auction logic with on-chain enumeration | [`at1p0yln2...`](https://testnet.explorer.provable.com/transaction/at1p0yln285rchg7f0ewhes3hur0xr9slecffg59hw7ke8e73ztwqzs4kp6ym) |
| `silentbid_usdc.aleo` | Test USDC token with open mint + escrow transfers | [`at1x2q6kd...`](https://testnet.explorer.provable.com/transaction/at1x2q6kd2gvd75l2rzztanyql08png2njygqj633rqjt8dgklyugrsw8nqze) |

### On-Chain State

**Private (ZK Records — only owner can decrypt):**
- `Bid` — bidder's sealed bid (auction_id, amount, salt)
- `AuctionReceipt` — creator's proof of auction ownership

**Public (Mappings — readable by anyone):**
- `auctions` — auction metadata (creator, min/max bid, end block, status)
- `auction_ids` — sequential index for frontend discovery (v3 addition)
- `bid_counts` — number of sealed bids per auction
- `highest_bids` / `highest_bidders` — updated during reveal phase
- `escrowed` / `revealed` / `refunded` — escrow lifecycle tracking

### Smart Contract Transitions

| # | Function | Phase | What Happens |
|---|----------|-------|-------------|
| 1 | `create_auction` | Setup | Creator sets item, min/max bid, duration, grace period |
| 2 | `place_bid` | Bidding | Bidder commits hash + escrows max_bid in USDC |
| 3 | `reveal_bid` | Reveal | Bidder opens private Bid record, ZK proof verifies commitment |
| 4 | `settle_auction` | Settlement | Locks auction after grace period |
| 5 | `claim_creator_payment` | Claims | Creator withdraws winning bid amount |
| 6 | `claim_winner_overpay` | Claims | Winner reclaims (max_bid - winning_amount) |
| 7 | `claim_loser_refund` | Claims | Losing bidders reclaim full escrow |
| 8 | `forfeit_nonrevealer` | Claims | Creator sweeps escrow from bidders who never revealed |

### Program Deep Dive: `silentbid_v3.aleo`

The core program (~330 lines of Leo) implements a complete commit-reveal auction protocol:

**Records (Private ZK State):**
```leo
record Bid {
    owner: address,        // bidder's address
    auction_id: field,     // which auction this bid belongs to
    amount: u64,           // the actual bid amount (PRIVATE — only bidder sees this)
    salt: field,           // random nonce for commitment security
    is_revealed: bool,     // tracks if bid has been opened
}
```

**Commitment Scheme:**
When placing a bid, the contract computes `BHP256::hash(bidder_address, auction_id, amount, salt)` and stores only this hash on-chain. The actual amount stays inside the private Bid record. During reveal, the contract recomputes the hash from the opened record and verifies it matches — proving the bidder didn't change their bid.

**Escrow Design:**
```
place_bid() → calls silentbid_usdc.aleo::transfer_public_as_signer()
              → transfers max_bid (not actual bid) to program address
              → identical transfer for ALL bidders = zero information leakage
```

**On-Chain Enumeration (v3 innovation):**
Aleo mappings cannot be iterated — you must know the key to query a value. Previous versions required an off-chain indexer. v3 adds:
```leo
mapping auction_ids: u64 => field;   // index 0,1,2... → auction_id
mapping auction_counter: u8 => u64;  // total count
```
The frontend simply reads `auction_counter`, then queries `auction_ids[0]` through `auction_ids[count-1]` to discover every auction directly from chain.

---

## Using SilentBid

### Prerequisites

- [Shield Wallet](https://www.provable.com/shield) browser extension
- Aleo testnet credits (get from [faucet](https://faucet.aleo.org))

### 1. Mint Test USDC

Navigate to any auction page and use the mint panel. Choose a quick amount (100, 500, 1000, 5000 tUSDC) or enter a custom amount. This calls `silentbid_usdc.aleo::mint_public`.

### 2. Create an Auction

Go to `/auctions/new` and fill in:
- **Item name** — what you're auctioning (max 25 chars)
- **Min bid** — minimum acceptable bid (in microUSDC)
- **Max bid** — escrow ceiling (every bidder deposits this amount)
- **Bidding window** — how long bids are accepted
- **Reveal window** — grace period for revealing bids after bidding ends

Your wallet generates a ZK proof and submits the transaction. You'll receive a private `AuctionReceipt` record.

### 3. Place a Sealed Bid

On any active auction page, enter your bid amount and a random salt. The frontend:
1. Generates a BHP256 commitment hash of (your address, auction_id, amount, salt)
2. Escrows `max_bid` USDC to the program
3. Returns a private `Bid` record to your wallet

No one can see your bid amount — only the commitment hash is public.

### 4. Reveal Your Bid

After the bidding window closes, go to the auction page and click **Reveal**. Your wallet opens the private Bid record and the smart contract:
1. Verifies the commitment hash matches
2. Checks the bid meets the minimum
3. Updates `highest_bids` if yours is the current leader

### 5. Settle & Claim

After the grace period, anyone can settle the auction. Then:
- **Creator** claims the winning bid amount
- **Winner** reclaims the overpayment (max_bid - winning bid)
- **Losers** reclaim their full escrow
- **Non-revealers** forfeit their escrow to the creator

---

## Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000 and connect Shield Wallet.

### Deploy Programs

```bash
# Deploy v3 auction program
cd program-silentbid-v3
bash deploy.sh

# Deploy test USDC program
cd program-silentbid-usdc
bash deploy.sh
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Leo 4.0 (Aleo ZK language) |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, Radix UI |
| Wallet | @provablehq Shield Wallet + Leo Wallet adapters |
| Network | Aleo Testnet |
| Token | silentbid_usdc.aleo (test stablecoin) |

---

## Project Structure

```
├── program-silentbid-v3/        # Core auction program (Leo)
│   └── src/main.leo             # Commit-reveal auction with USDC escrow
├── program-silentbid-usdc/      # Test USDC token program
│   └── src/main.leo             # Open mint + transfer functions
├── app/
│   ├── auctions/                # Browse, create, bid, reveal, claim
│   │   ├── page.tsx             # Auction listing with on-chain discovery
│   │   ├── new/                 # Create auction form
│   │   └── [id]/               # Single auction view + bid/reveal/claim
│   ├── my-bids/                 # View your private bid records
│   └── api/auctions/           # Server-side registry + block scanner
├── lib/
│   ├── silentbid.ts            # Auction queries + on-chain enumeration
│   ├── aleo-client.ts          # Provable API client
│   └── auction-contracts.ts    # Program IDs + types
└── components/
    ├── auction-list.tsx         # Auction grid with auto-discovery
    └── mint-usdc-button.tsx     # USDC faucet with custom amounts
```

---

## Deployed Programs

| Program | ID | Network |
|---------|-----|---------|
| Auction v3 | `silentbid_v3.aleo` | Testnet |
| Test USDC | `silentbid_usdc.aleo` | Testnet |
| Auction v2 (legacy) | `silentbid_v2.aleo` | Testnet |
| Auction v1 (legacy) | `silentbid_v1.aleo` | Testnet |

---

## What Makes This Different

- **True privacy, not obscurity** — Bid amounts are cryptographically hidden using Aleo's ZK proof system, not just hidden behind a paywall or delay
- **Uniform escrow** — All bidders deposit the same amount, so on-chain transfers reveal nothing about actual bid values
- **On-chain enumeration** — v3 adds `auction_ids` mapping so the frontend discovers all auctions directly from chain without needing an indexer
- **Full lifecycle** — Not just bidding — complete settlement with winner/loser/creator claims and non-revealer penalties
- **Real stablecoin escrow** — Uses `silentbid_usdc.aleo` for payments instead of abstract credits

---

## License

MIT
