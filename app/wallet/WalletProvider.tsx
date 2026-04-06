"use client";

import React, { FC, useMemo, ReactNode } from "react";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider, WalletModal, useWalletModal } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";

// Default styles that can be overridden by your app
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

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
    () => [
      new LeoWalletAdapter({
        appName: "Aleo Demo App",
      }),
    ],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect={false}
      onError={(error) => {
        console.error("Wallet provider error:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        console.error("Error details:", {
          errorName: error?.constructor?.name,
          errorMessage: error?.message,
        });
      }}
    >
      <WalletModalProvider>
        {children}
        <WalletModalWithContainer />
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};
