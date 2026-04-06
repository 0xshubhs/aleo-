"use client";

import React, { FC, useCallback, useEffect } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useWalletModal } from "@demox-labs/aleo-wallet-adapter-reactui";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export const WalletButton: FC = () => {
  const { publicKey, disconnect, connecting, wallet, connected, connect, select, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  // Log wallet state for debugging
  useEffect(() => {
    console.log("Wallet state:", {
      publicKey,
      connecting,
      connected,
      wallet: wallet?.adapter?.name,
      readyState: wallet?.adapter?.readyState,
    });
  }, [publicKey, connecting, connected, wallet]);

  const handleClick = useCallback(async () => {
    if (publicKey) {
      try {
        await disconnect();
        console.log("Wallet disconnected successfully.");
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
      }
    } else {
      if (wallet?.adapter && wallet.adapter.readyState === "Installed") {
        console.log("Wallet detected, attempting direct connection");
        try {
          const leoWallet = wallets.find((w) => w.adapter.name === "Leo Wallet");
          if (leoWallet) {
            await select(leoWallet.adapter.name);
            await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.TestnetBeta);
          } else {
            console.log("Leo Wallet not found, opening modal");
            setVisible(true);
          }
        } catch (error) {
          console.error("Direct connection failed, opening modal:", error);
          setVisible(true);
        }
      } else {
        console.log("Wallet not installed or ready, opening modal.");
        setVisible(true);
      }
    }
  }, [publicKey, disconnect, setVisible, wallet, connect, select, wallets]);

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80 transition-colors font-medium font-serif disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {connecting
        ? "Connecting..."
        : publicKey
        ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
        : "Connect Wallet"}
    </button>
  );
};
