"use client";

import React, { FC, useCallback } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useWalletModal } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { Network } from "@provablehq/aleo-types";

export const WalletButton: FC = () => {
  const { address, disconnect, connecting, wallet, connected, connect, selectWallet, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = useCallback(async () => {
    if (address) {
      try {
        await disconnect();
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
      }
    } else {
      setVisible(true);
    }
  }, [address, disconnect, setVisible]);

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className="border border-accent/60 px-4 py-2 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
    >
      {connecting
        ? "Connecting..."
        : address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "Connect Wallet"}
    </button>
  );
};
