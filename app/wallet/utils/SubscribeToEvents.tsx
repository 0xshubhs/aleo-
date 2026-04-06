"use client";

import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import React, { FC, useEffect, useRef, ReactNode } from "react";

interface SubscribeToEventsProps {
  onAccountChange?: () => void;
  children?: ReactNode;
}

export const SubscribeToEvents: FC<SubscribeToEventsProps> = ({
  onAccountChange,
  children,
}) => {
  const { wallet, publicKey } = useWallet();
  const previousPublicKey = useRef<string | null>(null);

  // Watch for publicKey changes to detect account changes
  useEffect(() => {
    if (previousPublicKey.current !== null && previousPublicKey.current !== publicKey) {
      // Handle account change
      if (onAccountChange) {
        onAccountChange();
      }
      console.log("Account changed from", previousPublicKey.current, "to", publicKey);
    }
    previousPublicKey.current = publicKey || null;
  }, [publicKey, onAccountChange]);

  // Listen to connect/disconnect events from the adapter
  useEffect(() => {
    if (wallet?.adapter) {
      const handleConnect = () => {
        console.log("Wallet connected");
      };

      const handleDisconnect = () => {
        console.log("Wallet disconnected");
      };

      const handleError = (error: Error) => {
        console.error("Wallet error:", error);
      };

      // Listen to standard adapter events
      wallet.adapter.on("connect", handleConnect);
      wallet.adapter.on("disconnect", handleDisconnect);
      wallet.adapter.on("error", handleError);

      // Cleanup
      return () => {
        wallet.adapter.off("connect", handleConnect);
        wallet.adapter.off("disconnect", handleDisconnect);
        wallet.adapter.off("error", handleError);
      };
    }
  }, [wallet]);

  return <>{children}</>;
};
