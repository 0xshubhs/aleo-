"use client";

import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import React, { FC, useCallback } from "react";

interface RequestTransactionHistoryProps {
  program?: string;
  onHistoryReceived?: (transactions: any[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export const RequestTransactionHistory: FC<RequestTransactionHistoryProps> = ({
  program = "credits.aleo",
  onHistoryReceived,
  className = "",
  children,
}) => {
  const { publicKey, requestTransactionHistory } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    if (requestTransactionHistory) {
      const transactions = await requestTransactionHistory(program);
      console.log("Transactions: " + transactions);
      
      if (onHistoryReceived) {
        onHistoryReceived(transactions);
      }
    }
  }, [publicKey, requestTransactionHistory, program, onHistoryReceived]);

  return (
    <button
      onClick={onClick}
      disabled={!publicKey || !requestTransactionHistory}
      className={className}
    >
      {children || "Request Transaction History"}
    </button>
  );
};
