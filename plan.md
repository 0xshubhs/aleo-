# SilentBid - Private Sealed-Bid Auction on Aleo

## Build Plan

---

## 1. Overview

**SilentBid** is a privacy-preserving sealed-bid auction platform on Aleo. Users place encrypted bids that remain hidden until the auction deadline. After the deadline, bids are revealed and the highest bidder wins. All bid amounts, bidder identities, and strategies stay private during the active auction phase using Aleo's ZK record model.

**Why privacy matters here:**
- Eliminates bid sniping (last-second outbidding based on seeing others' bids)
- Prevents front-running and collusion
- Protects bidder strategy and financial information
- Real-world sealed-bid auctions (procurement, art, ad slots) require this by design

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                                                         │
│  /auctions          - Browse & create auctions          │
│  /auctions/[id]     - Bid, reveal, claim                │
│  /my-bids           - View your private bid records     │
│                                                         │
│  Reuses: Navigation, WalletButton, field encoding,      │
│          error handling, explorer, bio, credits pages    │
├─────────────────────────────────────────────────────────┤
│                  SHIELD WALLET ADAPTER                   │
│  @provablehq/aleo-wallet-adaptor-shield                 │
│  + Leo Wallet as fallback                               │
├─────────────────────────────────────────────────────────┤
│                 LEO SMART CONTRACTS                      │
│                                                         │
│  silentbid.aleo     - Auction + sealed bid logic        │
│  credits.aleo       - Payment escrow (native)           │
├─────────────────────────────────────────────────────────┤
│                   ALEO TESTNET                           │
│  Records (private bids) + Mappings (auction state)      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Leo Smart Contract: `silentbid.aleo`

### 3.1 Data Structures

```leo
// Private bid - only the bidder can see this
record Bid {
    owner: address,
    auction_id: field,
    amount: u64,
    salt: field,          // random nonce for commitment
    is_revealed: u8,      // 0 = sealed, 1 = revealed
}

// Auction receipt for the creator
record AuctionReceipt {
    owner: address,
    auction_id: field,
    item_name: field,
    min_bid: u64,
    end_block: u64,
}

// Structs for mapping storage
struct AuctionInfo {
    creator: address,
    item_name: field,
    min_bid: u64,
    end_block: u64,
    is_settled: u8,       // 0 = active, 1 = settled
}

struct RevealInfo {
    bidder: address,
    amount: u64,
}
```

### 3.2 Mappings (Public On-Chain State)

```leo
// Auction metadata - publicly visible
mapping auctions: field => AuctionInfo;

// Bid commitments: BHP256::hash(auction_id, bidder, amount, salt) => true
mapping commitments: field => bool;

// Track highest revealed bid per auction
mapping highest_bids: field => u64;

// Track highest bidder per auction
mapping highest_bidders: field => address;

// Bid count per auction
mapping bid_counts: field => u64;

// Auction counter for unique IDs
mapping auction_counter: u8 => u64;
```

### 3.3 Transitions

#### `create_auction`
```
Input:  item_name: field, min_bid: u64, end_block: u64
Output: AuctionReceipt record
Async:  Writes AuctionInfo to auctions mapping, increments counter
```
- Anyone can create an auction
- `end_block` is the deadline (after this block, no more bids accepted)
- Returns a private receipt to the creator

#### `place_bid`
```
Input:  auction_id: field, amount: u64, salt: field
Output: Bid record (private, encrypted)
Async:  Stores commitment hash in commitments mapping, increments bid_count
```
- Computes `commitment = BHP256::hash_to_field(auction_id, self.caller, amount, salt)`
- Stores commitment in public mapping (reveals nothing about amount or bidder)
- Returns private Bid record to bidder
- Finalize checks: auction exists, not settled, amount >= min_bid

#### `reveal_bid`
```
Input:  bid: Bid record (consumed)
Output: New Bid record with is_revealed = 1
Async:  Verifies commitment, compares with highest, updates if greater
```
- Can only be called after `end_block` has passed
- Recomputes commitment from record fields, verifies it matches stored commitment
- If amount > current highest_bid → update highest_bid and highest_bidder
- Marks bid as revealed

#### `claim_winner`
```
Input:  bid: Bid record (must be revealed, must be highest)
Output: (none - bid consumed)
Async:  Marks auction as settled, transfers credits to creator
```
- Verifies caller is highest_bidder for this auction
- Settles the auction
- Winner's bid amount transferred to auction creator via credits.aleo

#### `reclaim_bid`
```
Input:  bid: Bid record (must be revealed, must NOT be highest)
Output: (none - bid consumed)
Async:  Verifies bidder is not winner, allows reclaim
```
- Losing bidders can reclaim their bid records
- Only works after auction is settled

### 3.4 Privacy Model

| Data | During Auction | After Reveal | After Settlement |
|------|---------------|--------------|-----------------|
| Bid amount | PRIVATE (in record) | PUBLIC (in mapping) | PUBLIC |
| Bidder identity | PRIVATE | PUBLIC (highest only) | PUBLIC (winner) |
| Number of bids | PUBLIC (count) | PUBLIC | PUBLIC |
| Auction details | PUBLIC | PUBLIC | PUBLIC |
| Losing bid amounts | PRIVATE | PUBLIC (if revealed) | PUBLIC (if revealed) |
| Bid strategy/timing | PRIVATE | PRIVATE | PRIVATE |

**Key privacy guarantee:** During the active auction, NO ONE (not even the auction creator) can see any bid amounts or bidder identities. Only the existence of commitments is public.

### 3.5 Compile-Time Constraints & Workarounds

| Leo Limitation | Impact | Workaround |
|---|---|---|
| No strings | Item names can't be text | Use `field` encoding (existing `stringToField()`) |
| No dynamic arrays | Can't iterate all bids | Progressive highest-bid pattern in mappings |
| No block.height in transition | Can't enforce deadline in transition | Enforce in `async finalize` block using `block.height` |
| Max field size ~31 bytes | Item descriptions limited | Use multiple field slots or keep descriptions off-chain |
| Proof generation 30-60s | UX delay per bid/reveal | Loading states, progress indicators |

---

## 4. Shield Wallet Migration

### 4.1 Package Changes

**Remove:**
```
@demox-labs/aleo-wallet-adapter-base
@demox-labs/aleo-wallet-adapter-leo
@demox-labs/aleo-wallet-adapter-react
@demox-labs/aleo-wallet-adapter-reactui
```

**Install:**
```
@provablehq/aleo-wallet-adaptor-shield
@provablehq/aleo-wallet-adaptor-leo
@provablehq/aleo-wallet-adaptor-react
@provablehq/aleo-wallet-adaptor-react-ui
@provablehq/aleo-wallet-adaptor-core
@provablehq/aleo-wallet-standard
@provablehq/aleo-types
```

### 4.2 Code Changes in `app/wallet/WalletProvider.tsx`

**Before (current):**
```tsx
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import { WalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

const wallets = [new LeoWalletAdapter({ appName: "Aleo Demo App" })];
// Network: WalletAdapterNetwork.TestnetBeta
// Decrypt: DecryptPermission.UponRequest
```

**After (migrated):**
```tsx
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { Network } from "@provablehq/aleo-types";
import { WalletDecryptPermission } from "@provablehq/aleo-wallet-standard";
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

const wallets = [new ShieldWalletAdapter(), new LeoWalletAdapter()];
// Network: Network.TESTNET
// Decrypt: WalletDecryptPermission.UponRequest
```

### 4.3 API Differences to Handle

| Old API (`@demox-labs`) | New API (`@provablehq`) |
|---|---|
| `publicKey` | `address` |
| `WalletAdapterNetwork.TestnetBeta` | `Network.TESTNET` |
| `DecryptPermission.UponRequest` | `WalletDecryptPermission.UponRequest` |
| `Transaction.createTransaction(...)` | `executeTransaction({ ...TransactionOptions })` |

### 4.4 Files That Need Updates

```
app/wallet/WalletProvider.tsx          - Provider swap
app/wallet/ClientWalletProvider.tsx     - Import path updates
app/wallet/WalletButton.tsx            - Import path updates
app/wallet/LeoWalletAdapter.ts         - May need rewrite or removal
app/wallet/utils/RequestTransaction.tsx - Transaction API change
app/wallet/utils/RequestRecords.tsx     - Import updates
app/wallet/utils/*.tsx                  - All utils import updates
app/bio/page.tsx                       - publicKey → address
app/credits/page.tsx                   - publicKey → address
app/greeting/page.tsx                  - publicKey → address
app/layout.tsx                         - CSS import path
app/lib/aleo.ts                        - Add SILENTBID_PROGRAM_ID constant
```

**CRITICAL:** Do NOT break existing bio/credits/greeting pages. Test all existing flows after migration.

---

## 5. Frontend Implementation

### 5.1 New Files to Create

```
app/auctions/page.tsx                  - Auction listing + create form
app/auctions/[id]/page.tsx             - Single auction view + bid/reveal/claim
app/my-bids/page.tsx                   - User's private bid records
app/lib/silentbid.ts                   - SilentBid-specific helpers
program-silentbid/                     - Leo program directory
program-silentbid/src/main.leo         - The auction contract
program-silentbid/program.json         - Program metadata
program-silentbid/deploy.sh            - Deployment script
```

### 5.2 `/auctions` Page

**Features:**
- List all auctions (fetched from mappings via API)
- Create auction form: item name, minimum bid, deadline (block number)
- Status badges: Active / Reveal Phase / Settled
- Connect wallet prompt if not connected

**Transaction flow for creating:**
```typescript
const inputs = [
  stringToField(itemName),        // item_name: field
  `${minBid}u64`,                 // min_bid: u64
  `${endBlock}u64`,               // end_block: u64
];
// Execute create_auction transition via wallet
```

### 5.3 `/auctions/[id]` Page

**Sections:**
1. **Auction Info** - Item name, creator, min bid, deadline, status
2. **Place Bid** (if active) - Amount input + auto-generated salt + submit
3. **Reveal Bid** (if past deadline) - Select your Bid record → reveal
4. **Claim / Reclaim** (if settled) - Winner claims, losers reclaim
5. **Results** (if settled) - Winning bid amount, winner address

**Bid placement flow:**
```typescript
const salt = BigInt("0x" + crypto.getRandomValues(new Uint8Array(16))
  .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")) % FIELD_MODULUS;

const inputs = [
  stringToField(auctionId),       // auction_id: field
  `${amount}u64`,                 // amount: u64
  `${salt}field`,                 // salt: field
];
// Execute place_bid transition → returns private Bid record
```

**Reveal flow:**
```typescript
// Fetch user's Bid records from wallet
const records = await requestRecords("silentbid.aleo");
// Find the record for this auction
// Execute reveal_bid with the record as input
```

### 5.4 `/my-bids` Page

- Fetch all Bid records from wallet via `requestRecords("silentbid.aleo")`
- Display: auction ID, amount, status (sealed/revealed)
- Link to auction page for each bid
- Decode field values using existing `fieldToString()`

### 5.5 UI Components

```
app/components/auction/
  AuctionCard.tsx         - Card for auction listing
  BidForm.tsx             - Place bid form with amount + loading
  RevealButton.tsx        - Reveal bid action
  AuctionStatus.tsx       - Status badge (Active/Reveal/Settled)
  CountdownTimer.tsx      - Blocks remaining until deadline
```

### 5.6 Reading Mapping State from Frontend

To display auction info, highest bids, etc., query the Aleo API for mapping values:

```typescript
// Add to app/lib/aleo-client.ts
export async function getMappingValue(programId: string, mappingName: string, key: string) {
  return fetchApi<string>(`/program/${programId}/mapping/${mappingName}/${key}`);
}
```

This is how we read public auction state without needing the wallet.

---

## 6. Contract Build & Deployment

### 6.1 Setup

```bash
# Create program directory
mkdir -p program-silentbid/src

# Initialize
cd program-silentbid
```

**program-silentbid/program.json:**
```json
{
  "program": "silentbid.aleo",
  "version": "1.0.0",
  "description": "SilentBid - Private Sealed-Bid Auction Platform",
  "license": "MIT",
  "dependencies": null,
  "dev_dependencies": null
}
```

### 6.2 Build

```bash
cd program-silentbid
leo build
```

This compiles `src/main.leo` → `build/main.aleo` (Aleo VM bytecode).

**Common build errors:**
- Type mismatches in struct fields
- Missing semicolons after mapping operations in finalize
- `assert()` vs `assert_eq()` usage
- Record fields must include `owner: address`

### 6.3 Test Locally

```bash
leo run create_auction "12345field" "100u64" "50000u64"
leo run place_bid "12345field" "500u64" "99999field"
```

Leo CLI executes transitions locally and shows outputs. No wallet needed for testing.

### 6.4 Deploy

**program-silentbid/deploy.sh:**
```bash
#!/bin/bash
PRIVATE_KEY="$1"
if [ -z "$PRIVATE_KEY" ]; then
    if [ -f "../.env" ]; then
        set -a; source "../.env"; set +a
        PRIVATE_KEY="$ALEO_PRIVATE_KEY"
    fi
fi
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: Private key required. Set ALEO_PRIVATE_KEY in .env"
    exit 1
fi
# Fix key prefix if needed
if [ "${PRIVATE_KEY#PrivateKey1zkp}" != "$PRIVATE_KEY" ] && [ "${PRIVATE_KEY#APrivateKey1zkp}" = "$PRIVATE_KEY" ]; then
    PRIVATE_KEY="A${PRIVATE_KEY}"
fi

echo "Building silentbid.aleo..."
leo build
if [ $? -ne 0 ]; then echo "Build failed."; exit 1; fi

echo "Deploying silentbid.aleo to testnet..."
export LEO_DISABLE_UPDATE_CHECK=1
leo deploy --private-key "$PRIVATE_KEY" --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" --yes --broadcast

if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed."
    exit 1
fi
```

**Add to package.json:**
```json
"scripts": {
  "deploy:silentbid": "cd program-silentbid && bash deploy.sh"
}
```

### 6.5 Deployment Costs

- Program deployment: ~5-10 credits (depends on program size)
- Each transition execution: 150,000 microcredits (0.15 credits) base fee
- Get testnet credits from faucet: https://faucet.aleo.org/

### 6.6 Post-Deployment Verification

```bash
# Verify program is deployed
curl https://api.explorer.provable.com/v1/testnet/program/silentbid.aleo

# Check mapping names
curl https://api.explorer.provable.com/v1/testnet/program/silentbid.aleo/mappings
```

---

## 7. Integration Checklist

### 7.1 Connect Everything

```
Leo Contract (silentbid.aleo)
    ↕ deployed on testnet
Shield Wallet
    ↕ signs transactions
Frontend (Next.js)
    ↕ creates Transaction objects, calls wallet
Aleo API (provable.com)
    ↕ reads mapping state for display
```

### 7.2 Frontend ↔ Contract Integration Points

| Frontend Action | Leo Transition | Inputs | Output |
|---|---|---|---|
| Create auction form submit | `create_auction` | item_name, min_bid, end_block | AuctionReceipt record |
| Place bid form submit | `place_bid` | auction_id, amount, salt | Bid record |
| Click "Reveal Bid" | `reveal_bid` | Bid record from wallet | Updated Bid record |
| Click "Claim Prize" | `claim_winner` | Bid record | Auction settled |
| Click "Reclaim Bid" | `reclaim_bid` | Bid record | Bid consumed |

### 7.3 Constants to Add in `app/lib/aleo.ts`

```typescript
export const SILENTBID_PROGRAM_ID = "silentbid.aleo";
export const SILENTBID_FEE = 150_000; // microcredits
```

---

## 8. Implementation Order

### Phase 1: Contract (Day 1)
1. Write `program-silentbid/src/main.leo` with all transitions
2. `leo build` - fix compilation errors
3. `leo run` - test each transition locally
4. Deploy to testnet
5. Verify deployment via API

### Phase 2: Wallet Migration (Day 1)
1. Install `@provablehq` packages
2. Update `WalletProvider.tsx` for Shield Wallet
3. Update all wallet utility files
4. Update existing pages (bio, credits, greeting) for new API
5. Test: wallet connects, existing transactions still work

### Phase 3: Frontend - Auction Pages (Day 2)
1. Add `SILENTBID_PROGRAM_ID` to constants
2. Add `getMappingValue()` to aleo-client
3. Build `/auctions` page (list + create)
4. Build `/auctions/[id]` page (bid + reveal + claim)
5. Build `/my-bids` page (record viewer)
6. Add navigation links

### Phase 4: Polish & Test (Day 2)
1. End-to-end flow: create → bid → reveal → settle
2. Error handling for all wallet interactions
3. Loading states for proof generation (30-60s)
4. Mobile responsive check
5. Edge cases: expired auctions, no bids, single bid

---

## 9. Submission Checklist (from criteria.md)

- [ ] **Functional frontend** deployed and testable
- [ ] **Non-trivial Leo code** on testnet (silentbid.aleo with commit-reveal logic)
- [ ] **Shield Wallet** integrated (mandatory Rule 4)
- [ ] **credits.aleo** used for bid payments (mandatory Rule 4)
- [ ] **GitHub repo** with README
- [ ] **Architecture overview** (this document)
- [ ] **Privacy model explanation** (Section 3.4 above)
- [ ] **Project overview** with PMF/GTM
- [ ] **Working demo** with core features

---

## 10. Risk Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| Leo finalize block complexity | Medium | Start with simple version, add features iteratively |
| Shield Wallet adapter breaking changes | Low | Keep Leo Wallet as fallback adapter |
| Proof generation too slow | High | Add prominent loading UI, consider delegated proving |
| Testnet downtime | Low | Test early, have local `leo run` demos as backup |
| credits.aleo integration issues | Medium | Test transfer_public flow independently first |
| Field encoding overflow | Low | Keep strings under 25 chars, validate on frontend |
| Breaking existing pages during migration | Medium | Test bio/credits/greeting after every wallet change |

---

## 11. File Tree After Implementation

```
Aleo-Scaffold/
├── app/
│   ├── auctions/
│   │   ├── page.tsx                    ← NEW: auction list + create
│   │   └── [id]/
│   │       └── page.tsx                ← NEW: single auction view
│   ├── my-bids/
│   │   └── page.tsx                    ← NEW: user's bid records
│   ├── components/
│   │   ├── Navigation.tsx              ← MODIFIED: add auction nav links
│   │   ├── auction/
│   │   │   ├── AuctionCard.tsx         ← NEW
│   │   │   ├── BidForm.tsx             ← NEW
│   │   │   ├── RevealButton.tsx        ← NEW
│   │   │   └── AuctionStatus.tsx       ← NEW
│   │   └── explorer/
│   │       └── LineChart.tsx           (unchanged)
│   ├── lib/
│   │   ├── aleo.ts                     ← MODIFIED: add SILENTBID constants
│   │   ├── aleo-client.ts             ← MODIFIED: add getMappingValue()
│   │   ├── aleo-v2.ts                 (unchanged)
│   │   └── silentbid.ts               ← NEW: auction-specific helpers
│   ├── wallet/
│   │   ├── WalletProvider.tsx          ← MODIFIED: Shield Wallet
│   │   ├── ClientWalletProvider.tsx    ← MODIFIED: import paths
│   │   ├── WalletButton.tsx           ← MODIFIED: import paths
│   │   └── utils/
│   │       ├── RequestTransaction.tsx  ← MODIFIED: new TX API
│   │       └── *.tsx                   ← MODIFIED: import paths
│   ├── bio/page.tsx                    ← MODIFIED: publicKey → address
│   ├── credits/page.tsx               ← MODIFIED: publicKey → address
│   ├── greeting/page.tsx              ← MODIFIED: publicKey → address
│   ├── explorer/page.tsx              (unchanged)
│   ├── debug/page.tsx                 (unchanged)
│   └── docs/page.tsx                  (unchanged)
├── program/                            (unchanged - onchainbio.aleo)
├── program-greeting/                   (unchanged - greeting.aleo)
├── program-silentbid/                  ← NEW
│   ├── src/
│   │   └── main.leo                   ← NEW: auction contract
│   ├── build/                         ← generated by leo build
│   ├── program.json                   ← NEW
│   ├── deploy.sh                      ← NEW
│   └── README.md                      ← NEW
├── package.json                       ← MODIFIED: new deps + deploy script
├── plan.md                            ← THIS FILE
└── criteria.md                        (unchanged)
```

---

## 12. Scoring Strategy

| Category (Weight) | How SilentBid Scores | Target |
|---|---|---|
| **Privacy Usage (40%)** | Core product IS privacy. Sealed bids are the #1 ZK use case. Commit-reveal with encrypted records. Bid amounts + identities hidden during auction. | 35-40/40 |
| **Technical Implementation (20%)** | Async finalize, mapping state, record consumption, commitment hashing, credits integration, Shield Wallet. Non-trivial Leo. | 15-18/20 |
| **User Experience (20%)** | Clean auction cards, bid forms, status indicators, loading states for proof gen, mobile responsive. Built on existing polished scaffold. | 14-17/20 |
| **Practicality (10%)** | Sealed-bid auctions used in: procurement, NFTs, ad slots, real estate, spectrum licenses. Direct real-world analog. | 7-9/10 |
| **Novelty (10%)** | No established private auction protocol on Aleo. Combines DeFi (credits) + Privacy (sealed bids) + Governance (fair process). | 7-8/10 |

**Projected total: 78-92 / 100**
