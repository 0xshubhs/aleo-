"use client";

import { WalletNotConnectedError } from "@provablehq/aleo-wallet-adaptor-core";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import React, { FC, useCallback } from "react";

interface RequestTransactionProps {
  program: string;
  functionName: string;
  inputs: string[];
  fee?: number;
  onTransactionSent?: (transactionId: string) => void;
  onStatusReceived?: (status: any) => void;
  onViewKeysReceived?: (viewKeys: any) => void;
  className?: string;
  children?: React.ReactNode;
}

export const RequestTransaction: FC<RequestTransactionProps> = ({
  program,
  functionName,
  inputs,
  fee = 150_000,
  onTransactionSent,
  onStatusReceived,
  onViewKeysReceived,
  className = "",
  children,
}) => {
  const { address, executeTransaction, transactionStatus, transitionViewKeys } = useWallet();

  const onClick = useCallback(async () => {
    if (!address) throw new WalletNotConnectedError();

    if (executeTransaction) {
      const result = await executeTransaction({
        program,
        function: functionName,
        inputs,
        fee,
      });

      const transactionId = result?.transactionId || "";

      if (onTransactionSent) {
        onTransactionSent(transactionId);
      }

      if (transactionStatus && onStatusReceived && transactionId) {
        const status = await transactionStatus(transactionId);
        onStatusReceived(status);
      }

      if (transitionViewKeys && onViewKeysReceived && transactionId) {
        const viewKeys = await transitionViewKeys(transactionId);
        onViewKeysReceived(viewKeys);
      }
    }
  }, [
    address,
    executeTransaction,
    transactionStatus,
    transitionViewKeys,
    program,
    functionName,
    inputs,
    fee,
    onTransactionSent,
    onStatusReceived,
    onViewKeysReceived,
  ]);

  return (
    <button onClick={onClick} disabled={!address || !executeTransaction} className={className}>
      {children || "Request Transaction"}
    </button>
  );
};
