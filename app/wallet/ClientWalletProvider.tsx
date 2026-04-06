"use client";

import React, { ReactNode } from "react";
import { WalletProvider } from "./WalletProvider";

interface ClientWalletProviderProps {
  children: ReactNode;
}

// This is a stable wrapper component to prevent re-renders
export function ClientWalletProvider({ children }: ClientWalletProviderProps) {
  return <WalletProvider>{children}</WalletProvider>;
}
