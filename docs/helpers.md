# Helper Functions and Utilities

This document describes the helper functions and utilities available in the scaffold.

## Wallet Utilities

### RequestTransaction

Submit a transaction to an Aleo program.

**Location:** `app/wallet/utils/RequestTransaction.tsx`

**Usage:**
```typescript
import { useRequestTransaction } from "./wallet/utils/RequestTransaction";

const { requestTransaction, loading, error } = useRequestTransaction();

const txId = await requestTransaction({
  program: "onchainbio.aleo",
  function: "register_bio",
  inputs: ["Alice", "Developer", "12345"]
});
```

### RequestRecords

Fetch encrypted records from a program.

**Location:** `app/wallet/utils/RequestRecords.tsx`

**Usage:**
```typescript
import { useRequestRecords } from "./wallet/utils/RequestRecords";

const { requestRecords, loading } = useRequestRecords();

const records = await requestRecords("onchainbio.aleo");
```

### RequestRecordPlaintexts

Get decrypted record plaintexts.

**Location:** `app/wallet/utils/RequestRecordPlaintexts.tsx`

**Usage:**
```typescript
import { useRequestRecordPlaintexts } from "./wallet/utils/RequestRecordPlaintexts";

const { requestRecordPlaintexts, loading } = useRequestRecordPlaintexts();

const plaintexts = await requestRecordPlaintexts("onchainbio.aleo");
```

### RequestTransactionHistory

Get transaction history for a program.

**Location:** `app/wallet/utils/RequestTransactionHistory.tsx`

**Usage:**
```typescript
import { useRequestTransactionHistory } from "./wallet/utils/RequestTransactionHistory";

const { requestTransactionHistory, loading } = useRequestTransactionHistory();

const history = await requestTransactionHistory("onchainbio.aleo");
```

### DecryptMessage

Decrypt encrypted messages.

**Location:** `app/wallet/utils/DecryptMessage.tsx`

**Usage:**
```typescript
import { useDecryptMessage } from "./wallet/utils/DecryptMessage";

const { decrypt, loading } = useDecryptMessage();

const plaintext = await decrypt(ciphertext, tpk, programId, functionName);
```

### SignMessage

Sign messages with the wallet.

**Location:** `app/wallet/utils/SignMessage.tsx`

**Usage:**
```typescript
import { useSignMessage } from "./wallet/utils/SignMessage";

const { signMessage, loading } = useSignMessage();

const message = new TextEncoder().encode("Hello Aleo");
const signature = await signMessage(message);
```

### DeployProgram

Deploy a new program to the network.

**Location:** `app/wallet/utils/DeployProgram.tsx`

**Usage:**
```typescript
import { useDeployProgram } from "./wallet/utils/DeployProgram";

const { deployProgram, loading } = useDeployProgram();

const txId = await deployProgram({
  program: programCode,
  fee: 1000000
});
```

## Common Patterns

### Formatting Addresses

```typescript
const formatAddress = (address: string, length: number = 4) => {
  if (!address) return "";
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};

// Usage
const shortAddress = formatAddress(publicKey, 4); // "aleo1...xyz"
```

### Converting Field to String

```typescript
const fieldToString = (field: string): string => {
  // Remove field suffix if present
  return field.replace(/field$/, "");
};
```

### Handling Transaction Errors

```typescript
const handleTransaction = async () => {
  try {
    const txId = await requestTransaction(transaction);
    console.log("Success:", txId);
    // Show success message
  } catch (error: any) {
    if (error.message.includes("User rejected")) {
      // User cancelled
      console.log("Transaction cancelled");
    } else if (error.message.includes("Insufficient")) {
      // Not enough credits
      console.error("Insufficient balance");
    } else {
      // Other error
      console.error("Transaction failed:", error);
    }
  }
};
```

### Loading States

```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performAction();
  } finally {
    setLoading(false);
  }
};

return (
  <button onClick={handleAction} disabled={loading}>
    {loading ? "Processing..." : "Submit"}
  </button>
);
```

## Type Definitions

### AleoTransaction

```typescript
interface AleoTransaction {
  program: string;
  function: string;
  inputs: string[];
}
```

### AleoDeployment

```typescript
interface AleoDeployment {
  program: string;
  fee: number;
}
```

## Best Practices

1. **Always handle errors** - Wallet operations can fail
2. **Show loading states** - Transactions take time
3. **Validate inputs** - Check data before submission
4. **Use TypeScript** - Get type safety
5. **Test on testnet** - Always test before mainnet

## Example: Complete Form Handler

```typescript
"use client";

import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useRequestTransaction } from "./wallet/utils/RequestTransaction";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export default function BioForm() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { publicKey, connect, connected } = useWallet();
  const { requestTransaction } = useRequestTransaction();

  const validate = () => {
    if (!name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!bio.trim()) {
      setError("Bio is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!validate()) return;

    if (!connected) {
      try {
        await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet);
        return; // Will retry after connection
      } catch (err: any) {
        setError("Failed to connect wallet");
        return;
      }
    }

    setLoading(true);
    try {
      const transaction = {
        program: "onchainbio.aleo",
        function: "register_bio",
        inputs: [name, bio, Date.now().toString()]
      };

      const txId = await requestTransaction(transaction);
      console.log("Transaction ID:", txId);
      
      // Reset form
      setName("");
      setBio("");
      
      // Show success message
      alert("Bio registered successfully!");
    } catch (err: any) {
      setError(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <textarea 
        value={bio} 
        onChange={(e) => setBio(e.target.value)}
        placeholder="Your bio"
      />
      <button 
        onClick={handleSubmit} 
        disabled={loading || !name || !bio}
      >
        {loading ? "Submitting..." : "Register Bio"}
      </button>
    </div>
  );
}
```
