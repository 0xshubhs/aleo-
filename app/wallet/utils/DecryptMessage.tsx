"use client";

import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import React, { FC, useCallback } from "react";

interface DecryptMessageProps {
  cipherText: string;
  onDecrypted?: (decryptedPayload: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const DecryptMessage: FC<DecryptMessageProps> = ({
  cipherText,
  onDecrypted,
  className = "",
  children,
}) => {
  const { publicKey, decrypt } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    if (decrypt) {
      const decryptedPayload = await decrypt(cipherText);
      
      if (onDecrypted) {
        onDecrypted(decryptedPayload);
      } else {
        alert("Decrypted payload: " + decryptedPayload);
      }
    }
  }, [publicKey, decrypt, cipherText, onDecrypted]);

  return (
    <button onClick={onClick} disabled={!publicKey || !decrypt} className={className}>
      {children || "Decrypt message"}
    </button>
  );
};
