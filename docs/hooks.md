# React Hooks for Aleo

This scaffold provides custom React hooks to interact with Aleo programs easily.

## Available Hooks

### useWallet

Connect and interact with Aleo wallets.

```typescript
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

const { publicKey, connect, disconnect, connected } = useWallet();
```

**Properties:**
- `publicKey`: Current connected wallet address
- `connect()`: Connect to wallet
- `disconnect()`: Disconnect wallet
- `connected`: Boolean indicating connection status
- `connecting`: Boolean indicating connection in progress

**Example:**
```typescript
const { publicKey, connect, disconnect, connected } = useWallet();

const handleConnect = async () => {
  try {
    await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet);
  } catch (error) {
    console.error("Connection failed:", error);
  }
};
```

### useRequestTransaction

Submit transactions to Aleo programs.

```typescript
import { useRequestTransaction } from "./wallet/utils/RequestTransaction";

const { requestTransaction, loading, error } = useRequestTransaction();
```

**Example:**
```typescript
const handleSubmit = async () => {
  const transaction = {
    program: "onchainbio.aleo",
    function: "register_bio",
    inputs: [name, bio, currentBlock]
  };
  
  const txId = await requestTransaction(transaction);
  console.log("Transaction ID:", txId);
};
```

### useRequestRecords

Fetch records from Aleo programs.

```typescript
import { useRequestRecords } from "./wallet/utils/RequestRecords";

const { requestRecords, loading, error } = useRequestRecords();
```

**Example:**
```typescript
const fetchBioRecords = async () => {
  const records = await requestRecords("onchainbio.aleo");
  console.log("Bio records:", records);
};
```

### useRequestRecordPlaintexts

Get decrypted record plaintexts.

```typescript
import { useRequestRecordPlaintexts } from "./wallet/utils/RequestRecordPlaintexts";

const { requestRecordPlaintexts, loading } = useRequestRecordPlaintexts();
```

**Example:**
```typescript
const getPlaintexts = async () => {
  const plaintexts = await requestRecordPlaintexts("onchainbio.aleo");
  console.log("Decrypted records:", plaintexts);
};
```

### useRequestTransactionHistory

Get transaction history for a program.

```typescript
import { useRequestTransactionHistory } from "./wallet/utils/RequestTransactionHistory";

const { requestTransactionHistory, loading } = useRequestTransactionHistory();
```

**Example:**
```typescript
const getHistory = async () => {
  const history = await requestTransactionHistory("onchainbio.aleo");
  console.log("Transaction history:", history);
};
```

### useDecryptMessage

Decrypt encrypted messages.

```typescript
import { useDecryptMessage } from "./wallet/utils/DecryptMessage";

const { decrypt, loading } = useDecryptMessage();
```

**Example:**
```typescript
const decryptData = async (ciphertext: string) => {
  const plaintext = await decrypt(ciphertext);
  console.log("Decrypted:", plaintext);
};
```

### useSignMessage

Sign messages with the connected wallet.

```typescript
import { useSignMessage } from "./wallet/utils/SignMessage";

const { signMessage, loading } = useSignMessage();
```

**Example:**
```typescript
const sign = async () => {
  const message = new TextEncoder().encode("Hello Aleo");
  const signature = await signMessage(message);
  console.log("Signature:", signature);
};
```

## Complete Example

```typescript
"use client";

import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useRequestTransaction } from "./wallet/utils/RequestTransaction";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export default function BioForm() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const { publicKey, connect, connected } = useWallet();
  const { requestTransaction, loading } = useRequestTransaction();

  const handleSubmit = async () => {
    if (!connected) {
      await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet);
      return;
    }

    const transaction = {
      program: "onchainbio.aleo",
      function: "register_bio",
      inputs: [name, bio, Date.now().toString()]
    };

    try {
      const txId = await requestTransaction(transaction);
      console.log("Transaction submitted:", txId);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Submitting..." : "Register Bio"}
      </button>
    </div>
  );
}
```

## Best Practices

1. **Always check wallet connection** before submitting transactions
2. **Handle errors gracefully** - wallet operations can fail
3. **Show loading states** - transactions take time
4. **Validate inputs** - ensure data is correct before submission
5. **Use TypeScript** - get type safety for all hooks

## Error Handling

All hooks return error states:

```typescript
const { requestTransaction, loading, error } = useRequestTransaction();

if (error) {
  console.error("Error:", error.message);
  // Show error to user
}
```

## Network Configuration

Always specify the network when connecting:

```typescript
await connect(
  DecryptPermission.UponRequest,
  WalletAdapterNetwork.Testnet  // or WalletAdapterNetwork.Mainnet
);
```
