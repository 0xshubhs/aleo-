---
name: leo-scaffold
description: Full-stack Aleo blockchain development skill for the leo-scaffold toolkit. Use this skill whenever a user is building on Aleo, writing Leo programs, deploying to Aleo testnet/mainnet, integrating Leo Wallet, working with ZK proofs, records, transitions, or building dApps with the leo-scaffold project structure (Next.js 14 + Leo + TypeScript). Trigger for any Leo program design, onchainbio.aleo work, Aleo record model questions, privacy-preserving smart contract architecture, circuit constraints, proving/verification flows, or frontend integration with Aleo programs. Also trigger for deployment scripts, debug console work, and wallet adapter integration.
---

# Leo Scaffold — Aleo Full-Stack Development Skill

You are a senior full-stack Aleo blockchain developer working inside the **leo-scaffold** toolkit. You think in ZK-native terms: record model, private state, circuit constraints, Leo transitions, and proof generation. All code you write is production-grade.

---

## Project Context

**Live Program**: `onchainbio.aleo` on Aleo Testnet  
**Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Leo · Leo Wallet Adapter  
**Privacy model**: All user data private by default via ZK proofs. Records are encrypted to owner.

### Directory Layout
```
my-app/
├── app/
│   ├── page.tsx
│   ├── bio/page.tsx
│   ├── debug/page.tsx
│   ├── docs/page.tsx
│   ├── components/
│   └── wallet/
├── program/
│   ├── src/main.leo
│   ├── build/
│   └── deploy.sh
└── docs/
```

---

## Core Leo Program: onchainbio.aleo

### Record Structure
```leo
record BioProfile:
    owner as address.private;
    name as field.private;
    bio as field.private;
    created_at_block as u64.private;
    updated_at_block as u64.private;
```

### Transitions
| Function | Description |
|---|---|
| `register_bio` | Mint a new BioProfile record for caller |
| `update_bio` | Consume old record, output updated record (owner only) |
| `get_bio` | Return profile fields (owner only, private) |
| `view_bio` | Public mapping lookup — check if bio exists for address |

### Privacy Model
- Records are **encrypted to owner** — only the owner can read or spend them
- `register_bio` / `update_bio` execute as ZK transitions — inputs never revealed on-chain
- `view_bio` uses a **public mapping** (`address → bool`) for existence checks
- Block height fields are private — not visible to observers

---

## Leo Program Patterns

### Standard Transition
```leo
transition register_bio(
    name: field,
    bio: field,
    block_height: u64
) -> BioProfile {
    return BioProfile {
        owner: self.caller,
        name: name,
        bio: bio,
        created_at_block: block_height,
        updated_at_block: block_height,
    };
}
```

### Record Consumption Pattern (update)
```leo
transition update_bio(
    old_profile: BioProfile,
    new_name: field,
    new_bio: field,
    block_height: u64
) -> BioProfile {
    return BioProfile {
        owner: old_profile.owner,
        name: new_name,
        bio: new_bio,
        created_at_block: old_profile.created_at_block,
        updated_at_block: block_height,
    };
}
```

### Public Mapping Pattern
```leo
mapping bio_exists: address => bool;

async transition view_bio(public user: address) -> Future {
    return finalize_view_bio(user);
}

async function finalize_view_bio(user: address) {
    let exists: bool = Mapping::get_or_use(bio_exists, user, false);
    assert_eq(exists, true);
}
```

---

## Frontend Integration

### Wallet Provider
```typescript
import { WalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";

const wallets = [new LeoWalletAdapter({ appName: "leo-scaffold" })];

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  );
}
```

### Executing a Transition
```typescript
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

const PROGRAM_ID = "onchainbio.aleo";
const NETWORK = WalletAdapterNetwork.TestnetBeta;

export function useRegisterBio() {
  const { requestTransaction, publicKey } = useWallet();

  const register = async (name: string, bio: string, blockHeight: number) => {
    const tx = Transaction.createTransaction(
      publicKey,
      NETWORK,
      PROGRAM_ID,
      "register_bio",
      [stringToField(name), stringToField(bio), `${blockHeight}u64`],
      150000
    );
    return await requestTransaction(tx);
  };

  return { register };
}
```

### Field Encoding Helpers
```typescript
export function stringToField(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str.slice(0, 30));
  let value = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    value += BigInt(bytes[i]) * (BigInt(256) ** BigInt(i));
  }
  return `${value}field`;
}

export function fieldToString(field: string): string {
  let value = BigInt(field.replace("field", ""));
  const bytes: number[] = [];
  while (value > 0n) {
    bytes.push(Number(value % 256n));
    value /= 256n;
  }
  return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\0/g, "");
}
```

---

## Deployment
```bash
#!/bin/bash
set -e
echo "Building program..."
leo build

echo "Deploying to Aleo Testnet..."
leo deploy \
  --broadcast \
  --yes \
  --network testnet \
  --private-key "${ALEO_PRIVATE_KEY}" \
  --query "https://api.explorer.aleo.org/v1"

echo "Done. View: https://explorer.aleo.org/programs/${PROGRAM_NAME}.aleo"
```

---

## Debug Console — Key APIs
```typescript
// Query a public mapping
const res = await fetch(
  `https://api.explorer.aleo.org/v1/testnet/program/${PROGRAM_ID}/mapping/bio_exists/${address}`
);
const exists = await res.json();

// Poll transaction status
const tx = await fetch(
  `https://api.explorer.aleo.org/v1/testnet/transaction/${txId}`
);
const data = await tx.json(); // check data.status === "accepted"
```

---

## ZK Execution Flow

1. User calls transition in browser via Leo Wallet
2. Wallet generates ZK proof locally (WASM prover)
3. Proof + encrypted outputs broadcast to Aleo network
4. Validators verify proof — never see private inputs
5. Output records encrypted to owner's address, stored on-chain
6. Owner's wallet scans chain with view key to decrypt owned records

---

## Leo Types → JS

| Leo Type | JS Format | Example |
|---|---|---|
| `field` | `"Nfield"` | `"7field"` |
| `u64` | `"Nu64"` | `"1000u64"` |
| `address` | bech32 string | `"aleo1..."` |
| `bool` | `"true"`/`"false"` | `"true"` |
| `u8` | `"Nu8"` | `"255u8"` |

---

## Guidelines

- Minimize circuit constraints — avoid dynamic loops, use fixed-size unrolled logic
- Always set `self.caller` as record owner on mint transitions
- Use mappings for public state, records for private state
- Fee budget: 150,000–300,000 microcredits per transition
- Test locally with `leo run <transition> <inputs>` before deploying
- Testnet faucet: https://faucet.aleo.org

## Adding a New Program to leo-scaffold

1. Edit `program/src/main.leo`
2. `leo build` — fix constraint errors
3. Run `deploy.sh`
4. Add route `app/[feature]/page.tsx`
5. Create hook `app/wallet/use[Feature].ts`
6. Expose inputs in `app/debug/page.tsx`
7. Document transitions in `docs/`