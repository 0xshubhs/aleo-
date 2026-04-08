"use client";

import { WalletNotConnectedError } from "@provablehq/aleo-wallet-adaptor-core";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
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
  const { address, requestTransactionHistory } = useWallet();

  const onClick = useCallback(async () => {
    if (!address) throw new WalletNotConnectedError();
    if (requestTransactionHistory) {
      const result = await requestTransactionHistory(program);
      console.log("Transactions: " + JSON.stringify(result));

      if (onHistoryReceived) {
        onHistoryReceived(result?.transactions || []);
      }
    }
  }, [address, requestTransactionHistory, program, onHistoryReceived]);

  return (
    <button
      onClick={onClick}
      disabled={!address || !requestTransactionHistory}
      className={className}
    >
      {children || "Request Transaction History"}
    </button>
  );
};
