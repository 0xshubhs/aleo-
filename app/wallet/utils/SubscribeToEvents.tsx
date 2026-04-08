"use client";

import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import React, { FC, useEffect, useRef, ReactNode } from "react";

interface SubscribeToEventsProps {
  onAccountChange?: () => void;
  children?: ReactNode;
}

export const SubscribeToEvents: FC<SubscribeToEventsProps> = ({
  onAccountChange,
  children,
}) => {
  const { wallet, address } = useWallet();
  const previousAddress = useRef<string | null>(null);

  useEffect(() => {
    if (previousAddress.current !== null && previousAddress.current !== address) {
      if (onAccountChange) {
        onAccountChange();
      }
      console.log("Account changed from", previousAddress.current, "to", address);
    }
    previousAddress.current = address || null;
  }, [address, onAccountChange]);

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

      wallet.adapter.on("connect", handleConnect);
      wallet.adapter.on("disconnect", handleDisconnect);
      wallet.adapter.on("error", handleError);

      return () => {
        wallet.adapter.off("connect", handleConnect);
        wallet.adapter.off("disconnect", handleDisconnect);
        wallet.adapter.off("error", handleError);
      };
    }
  }, [wallet]);

  return <>{children}</>;
};
