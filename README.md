# Aleo-Scaffold

A modern, open-source toolkit for building decentralized applications on the Aleo blockchain. Designed to streamline the process of creating and deploying Leo programs with beautiful, privacy-first user interfaces.

## Live Deployment

### onchainbio.aleo

| Resource | Link |
|----------|------|
| **Program ID** | `onchainbio.aleo` |
| **Network** | Testnet |
| **Status** | Deployed |
| **Transaction** | [`at1zq7k39c76wyqspwzs55lqdj5znzhdhjkv3p09wttn45l9r5j3vrs8ng3j7`](https://testnet.explorer.provable.com/transaction/at1zq7k39c76wyqspwzs55lqdj5znzhdhjkv3p09wttn45l9r5j3vrs8ng3j7) |
| **Program Explorer** | [View on Provable](https://testnet.explorer.provable.com/program/onchainbio.aleo) |

### greeting.aleo

| Resource | Link |
|----------|------|
| **Program ID** | `greeting.aleo` |
| **Network** | Testnet |
| **Status** | Deployed |
| **Deployment Transaction** | [`at1yhkkxfum97x58ua6rxzdtn2asmtzq7l7p29q5qtmfsqv0l0pwqxqkcryts`](https://testnet.explorer.provable.com/transaction/at1yhkkxfum97x58ua6rxzdtn2asmtzq7l7p29q5qtmfsqv0l0pwqxqkcryts) |
| **Program Explorer** | [View on Provable](https://testnet.explorer.provable.com/program/greeting.aleo) |

## Project status (for reviewers)

- **Done:** Page is no longer blocked by an invisible modal; the wallet modal overlay is fixed so you can interact with the Bio form and the rest of the app.
- **Done:** Bio page buttons are wired to the Aleo network:
  - **Register Bio** submits a real transaction to `onchainbio.aleo` (`register_bio` transition) via the Leo Wallet.
  - **Fetch my records** / **View my Bio records** call the wallet’s `requestRecords` for `onchainbio.aleo` so you can see your own records.
- **Note:** The current Leo program does not expose a public view/mapping for looking up other users’ bios; only the record owner can decrypt their data. A future version could add a `bio_exists` mapping and view for discovery.
- **Planned (Wave 2+):** Update-bio flow (consuming an existing record), better docs for new developers, and more Debug console examples.

## Features

- **Zero-Knowledge Privacy** - All user data is private by default using Aleo's ZK proofs
- **OnChain Bio System** - Decentralized profile storage where users own their data
- **Wallet Integration** - Seamless Leo Wallet connection with TestnetBeta support
- **Debug Console** - Built-in tools to test and interact with your Leo programs
- **Hot Reload** - Frontend adapts automatically as you edit Leo programs
- **Modern Stack** - Next.js 14, TypeScript, Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+
- Leo CLI ([Installation Guide](https://developer.aleo.org/leo/installation))
- Leo Wallet browser extension

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Programs & routes

| Route | Program | Description |
|-------|---------|-------------|
| `/bio` | `onchainbio.aleo` | Register and fetch private bio profiles |
| `/credits` | `credits.aleo` | View credit records, send public transfers |
| `/greeting` | `greeting.aleo` | Call the `greet` transition (deploy from `program-greeting/`) |
| `/debug` | — | Debug console for Leo programs |
| `/docs` | — | Documentation viewer |

- **onchainbio.aleo** – Custom program in `program/`; deploy with `program/deploy.sh`.
- **credits.aleo** – Native Aleo credits program (no deploy; use from any app).
- **greeting.aleo** – Demo program in `program-greeting/`; deploy with `npm run deploy:greeting`. Program ID after deploy: `greeting.aleo`.

## Project Structure

```
├── app/
│   ├── page.tsx           # Home
│   ├── bio/page.tsx       # onchainbio.aleo – Bio
│   ├── credits/page.tsx   # credits.aleo – Records & transfer_public
│   ├── greeting/page.tsx  # greeting.aleo – greet transition
│   ├── debug/page.tsx     # Debug console
│   ├── docs/page.tsx      # Docs
│   ├── lib/aleo.ts        # Field encoding, program IDs
│   ├── components/
│   └── wallet/
├── program/               # onchainbio.aleo
│   ├── src/main.leo
│   ├── build/
│   └── deploy.sh
├── program-greeting/      # greeting.aleo
│   ├── src/main.leo
│   ├── deploy.sh
│   └── README.md
└── docs/
```

## OnChainBio Program

The `onchainbio.aleo` program implements a decentralized profile system:

### Record Structure

```leo
record BioProfile:
    owner as address.private;
    name as field.private;
    bio as field.private;
    created_at_block as u64.private;
    updated_at_block as u64.private;
```

### Functions

| Function | Description |
|----------|-------------|
| `register_bio` | Create a new bio profile |
| `update_bio` | Update existing profile (owner only) |
| `get_bio` | Retrieve profile details (owner only) |
| `view_bio` | Check if bio exists for an address |

## Development Workflow

### Edit Leo Programs

```bash
cd program
# Edit src/main.leo
leo build
```

### Deploy to Testnet

```bash
cd program
leo deploy --broadcast --yes
```

### Frontend Development

The frontend at `app/` automatically connects to your deployed program. Use the Debug page to test transactions before building UI.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Smart Contracts | Leo / Aleo |
| Privacy | Zero-Knowledge Proofs |
| Wallet | Leo Wallet Adapter |

## For new developers

This scaffold aims to make Aleo onboarding easier. Things that help:

- **Docs** – See `/docs` in the app and the `docs/` folder for hooks and helpers.
- **Debug page** – Use the Debug console to try program execution and inspect state.
- **Bio flow** – Connect Leo Wallet, register a bio (real transaction), then fetch your records to see the full flow.
- **Program** – `program/src/main.leo` is the single program; build with `leo build`, deploy with `program/deploy.sh`.

## Resources

- [Aleo Developer Docs](https://developer.aleo.org/)
- [Leo Language Guide](https://developer.aleo.org/leo/)
- [Aleo Testnet Explorer](https://testnet.explorer.provable.com/)

## License

MIT
