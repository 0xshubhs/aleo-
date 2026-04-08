"use client";

import { WalletNotConnectedError } from "@provablehq/aleo-wallet-adaptor-core";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
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
  const { address, signMessage } = useWallet();

  const onClick = useCallback(async () => {
    if (!address) throw new WalletNotConnectedError();

    if (signMessage) {
      const bytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(bytes);
      const signature = signatureBytes ? new TextDecoder().decode(signatureBytes) : "";

      if (onSigned) {
        onSigned(signature);
      } else {
        alert("Signed message: " + signature);
      }
    }
  }, [address, signMessage, message, onSigned]);

  return (
    <button onClick={onClick} disabled={!address} className={className}>
      {children || "Sign message"}
    </button>
  );
};
