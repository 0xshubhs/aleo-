"use client";

import React, { FC, useMemo, ReactNode } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider, WalletModal, useWalletModal } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { Network } from "@provablehq/aleo-types";

import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

/** Renders WalletModal only when visible so the overlay never blocks the page when closed. */
function WalletModalWithContainer() {
  const { visible } = useWalletModal();
  if (!visible) return null;
  return (
    <div id="wallet-modal-container">
      <WalletModal container="#wallet-modal-container" />
    </div>
  );
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const wallets = useMemo(
    () => {
      const list: Array<ShieldWalletAdapter | LeoWalletAdapter> = [new ShieldWalletAdapter()];
      // Only add Leo Wallet if Shield isn't available
      try { list.push(new LeoWalletAdapter()); } catch { /* skip */ }
      return list;
    },
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={Network.TESTNET}
      autoConnect={false}
      onError={(error) => {
        // Suppress "No address returned" — happens when Leo Wallet isn't ready
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("No address returned") || msg.includes("not ready")) {
          console.warn("[Wallet] Connection failed (wallet may not be installed or unlocked):", msg);
          return;
        }
        if (msg.includes("Configured network")) {
          console.warn("[Wallet] Network mismatch — switch your wallet to TESTNET and reconnect.");
          if (typeof window !== "undefined") {
            window.alert("Please switch your Aleo wallet network to TESTNET, then reconnect.");
          }
          return;
        }
        console.error("Wallet provider error:", msg);
      }}
    >
      <WalletModalProvider>
        {children}
        <WalletModalWithContainer />
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};
