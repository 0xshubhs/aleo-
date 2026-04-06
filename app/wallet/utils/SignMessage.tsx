"use client";

import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import React, { FC, useCallback } from "react";

interface SignMessageProps {
  message?: string;
  onSigned?: (signature: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const SignMessage: FC<SignMessageProps> = ({
  message = "a message to sign",
  onSigned,
  className = "",
  children,
}) => {
  const { wallet, publicKey } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();

    const bytes = new TextEncoder().encode(message);
    const signatureBytes = await (
      wallet?.adapter as LeoWalletAdapter
    ).signMessage(bytes);
    const signature = new TextDecoder().decode(signatureBytes);
    
    if (onSigned) {
      onSigned(signature);
    } else {
      alert("Signed message: " + signature);
    }
  }, [wallet, publicKey, message, onSigned]);

  return (
    <button onClick={onClick} disabled={!publicKey} className={className}>
      {children || "Sign message"}
    </button>
  );
};
