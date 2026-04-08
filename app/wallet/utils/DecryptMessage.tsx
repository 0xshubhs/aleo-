"use client";

import { WalletNotConnectedError } from "@provablehq/aleo-wallet-adaptor-core";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
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
  const { address, decrypt } = useWallet();

  const onClick = useCallback(async () => {
    if (!address) throw new WalletNotConnectedError();
    if (decrypt) {
      const decryptedPayload = await decrypt(cipherText);

      if (onDecrypted) {
        onDecrypted(decryptedPayload);
      } else {
        alert("Decrypted payload: " + decryptedPayload);
      }
    }
  }, [address, decrypt, cipherText, onDecrypted]);

  return (
    <button onClick={onClick} disabled={!address || !decrypt} className={className}>
      {children || "Decrypt message"}
    </button>
  );
};
