## What it does

SilentBid is a private sealed-bid auction protocol on Aleo. Bidders place encrypted bids hidden inside ZK records — nobody, not even the auctioneer, can see bid amounts until the reveal phase. A BHP256 commitment hash is posted on-chain as a binding promise, while the actual amount stays encrypted in the bidder's wallet. Every bidder escrows the same max_bid in test USDC, so transfer amounts leak zero information. After bidding closes, bidders reveal on-chain (proving their commitment matches), the highest bid wins, and payouts are claimed trustlessly. The full lifecycle — create, bid, reveal, settle, claim — runs entirely on-chain with no off-chain auctioneer.

## The problem it solves

On-chain auctions on transparent chains are broken. On Ethereum, bids are visible in the mempool — enabling front-running, bid sniping, and strategic underbidding. Sealed-bid auctions require bid secrecy, but EVM transparency defeats this entirely. Existing workarounds all compromise: commit-reveal on Ethereum still leaks info through deposit amounts, off-chain auctioneers reintroduce trusted third parties, and Chainlink CRE relies on oracle trust assumptions. SilentBid on Aleo eliminates all compromises — privacy is native to the VM. Bid amounts live in private records, commitments are verified with ZK proofs, and uniform escrow prevents metadata leakage. No trusted party, no off-chain infra, no MEV.

## Challenges I ran into

Leo 4.0 syntax had breaking changes with sparse documentation — `transition` became `fn`, `async function` became `final {}`, and `block.height` changed from u64 to u32, causing silent overflow bugs. Designing uniform escrow was the biggest architectural challenge: our first version leaked bid amounts through deposit sizes, so we redesigned to have every bidder deposit max_bid, requiring four separate claim transitions. Cross-program USDC calls needed careful handling of `transfer_public_as_signer` vs `transfer_public` semantics. Aleo mappings aren't enumerable, so we built multi-layer auction discovery (on-chain sequential IDs, server registry, localStorage, manual entry). Shield Wallet's proof generation takes 30-60 seconds per transaction — we built extensive loading states to handle this. Field encoding for item names was tricky due to the ~31 byte limit per field element. BHP256 commitment matching between TypeScript and Leo required careful serialization debugging.

## Technologies I used

Leo 4.0 (Aleo smart contracts), BHP256 commitments, Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Radix UI, @provablehq/sdk, Shield Wallet + Leo Wallet (@provablehq/aleo-wallet-adaptor-react), Framer Motion, GSAP, Recharts, Sonner, Bun

## How we built it

We started from our Ethereum sealed-bid auction (Solidity + Chainlink CRE) and reimagined it for Aleo's privacy-native model. Phase 1: We replaced CRE's off-chain bid processing with Leo private records — a Bid record encrypted to the bidder holds the amount, while only a BHP256 hash goes on-chain. Phase 2: We iterated through three contract versions. V1 used credits escrow but leaked bid amounts. V2 introduced uniform max_bid escrow with test USDC and four claim transitions (creator payment, winner overpay refund, loser refund, non-revealer forfeit). V3 added on-chain auction discovery mappings. Phase 3: We built a test USDC token with open mint and `transfer_public_as_signer` for user-authorized deposits. Phase 4: Migrated the frontend — Wagmi hooks to Provable adapters, contract reads to mapping fetches, event indexing to private record fetching via `requestRecords()`. Phase 5: Built multi-layer auction discovery since Aleo lacks subgraph-style indexing. Phase 6: Polished UX with phase-aware action panels, transaction polling, animated loading states, and in-app USDC minting.

## What we learned

Privacy changes architecture, not just encryption. On Ethereum we bolted privacy onto a transparent chain with CRE. On Aleo, privacy is the starting point — leading to fundamentally simpler, stronger designs. Metadata leakage matters as much as data leakage: encrypting bids is pointless if deposit amounts reveal them, which drove our uniform escrow pattern. Leo's strict type system (u32 vs u64, explicit record ownership) initially frustrated us but caught real bugs. UX is the true frontier for ZK apps — 45-second proof generation requires first-class loading UX, not just correct cryptography. Cross-program composability on Aleo is powerful but the signer/caller distinction for transfers requires careful understanding. Decentralized data discovery is an underappreciated hard problem — without events or indexers, we built our own multi-layer solution.

## What's next for SilentBid

Vickrey (second-price) auctions where the winner pays the second-highest bid. NFT/asset delivery integration as Aleo token standards mature. Credits.aleo integration for mainnet deployment with real value. Multi-item combinatorial auctions for batch bidding. Fully decentralized auction discovery replacing the server registry. Proof generation optimization via WebGPU acceleration and delegated proving. Mobile wallet support as the Aleo mobile ecosystem develops. Post-settlement analytics dashboard for market insights.

---

## Updates in this Wave

Contract upgrade from silentbid_v2 to silentbid_v3: V2 had a major limitation — no way to enumerate auctions on-chain. Users needed the exact auction ID to interact, which broke discoverability entirely. V3 solves this by adding auction_count and auction_ids mappings that track every created auction with a sequential index, allowing the frontend to scan from 0 to auction_count and fetch all auctions without relying on an external indexer. This was a non-trivial contract change that required restructuring the create_auction finalize block to maintain the index atomically alongside auction creation.

Deployed both silentbid_v3.aleo and silentbid_usdc.aleo to Aleo Testnet. The USDC program is a custom test token with three functions: mint_public (open faucet so anyone can get test tokens), transfer_public (for refunds from the auction contract back to users), and transfer_public_as_signer (critical for escrow deposits — debits from the user's balance, not the calling program's balance). Getting the signer vs caller distinction right in cross-program calls was one of the trickiest parts of the integration.

Shield Wallet integration now covers the full auction lifecycle. All 8 transitions — create_auction, place_bid, reveal_bid, settle_auction, claim_creator_payment, claim_winner_overpay, claim_loser_refund, forfeit_nonrevealer — work through executeTransaction() with properly serialized field/address/u64 inputs. Record fetching for the My Bids page uses requestRecords() filtered by the silentbid_v3 program ID.

Built a multi-layer auction discovery system to handle Aleo's lack of event indexing: primary layer is on-chain sequential scan via the V3 mappings, backed by a server-side registry API (/api/auctions) for reliability, localStorage caching for fast page loads, and manual ID entry as ultimate fallback. Frontend now has auction status filtering (Active/Revealing/Settled) computed from real-time block height comparison against each auction's end_block and grace_block.

Polished the bid flow: auto-generated cryptographic salts, client-side BHP256 commitment computation matching the on-chain verification, transaction status polling with animated loading states for the 30-60 second proof generation window, and in-app USDC minting button so new users can get tokens without leaving the auction page. Next up: full end-to-end claim flow testing and credits.aleo integration.

---

## Wave Plans

### Wave 6 — Core hardening + privacy upgrades

- Credits.aleo integration replacing test USDC with native Aleo credits for real-value escrow
- End-to-end testnet testing of the full auction lifecycle (create → bid → reveal → settle → claim)
- Private group auctions — ZK set membership proofs to restrict bidding to an allowlist without revealing the list on-chain
- Forfeit non-revealer UI so creators can sweep abandoned escrow from the frontend
- Auction templates — presets for common use cases (NFT drop, procurement, timed sale)
- Bid count display during bidding phase (shows participation without leaking amounts)
- Auction sharing via URL with embedded auction IDs + QR code generation
- Proof generation UX improvements — progress indicators, estimated wait times, retry handling
- Bug fixes from testnet: commitment matching edge cases, field encoding for long item names, wallet reconnection

### Wave 7 — Advanced auction modes + reputation

- Vickrey (second-price) auction mode — winner pays second-highest bid, track top two bids during reveal, updated settlement logic
- Private bidder identity on reveal — ZK proof reveals bid amount but keeps bidder address hidden until claim
- Timelocked reveals — block height + randomness to shuffle reveal order, eliminating last-revealer advantage
- NFT/asset delivery integration — creator locks asset at creation, winner receives at settlement
- Private reputation system — bidders build ZK-provable scores based on reveal rate and payment history, without exposing auction history
- Recursive auctions — winner of auction A gets provable priority access to auction B
- Multi-item combinatorial auctions for batch bidding
- Fully decentralized auction discovery replacing the server registry
- Mobile-responsive redesign + mobile wallet support
- Post-settlement analytics dashboard (bid-to-ask ratios, participation rates, settlement prices)
