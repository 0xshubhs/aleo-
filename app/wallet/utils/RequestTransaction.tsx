"use client";

import {
  Transaction,
  WalletAdapterNetwork,
  WalletNotConnectedError,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import React, { FC, useCallback } from "react";

interface RequestTransactionProps {
  program: string;
  functionName: string;
  inputs: string[];
  fee?: number;
  network?: WalletAdapterNetwork;
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
  fee = 35_000,
  network = WalletAdapterNetwork.Testnet,
  onTransactionSent,
  onStatusReceived,
  onViewKeysReceived,
  className = "",
  children,
}) => {
  const { publicKey, requestTransaction, transactionStatus, transitionViewKeys } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();

    const aleoTransaction = Transaction.createTransaction(
      publicKey,
      network,
      program,
      functionName,
      inputs,
      fee
    );

    if (requestTransaction) {
      // Returns a transaction Id, that can be used to check the status. Note this is not the on-chain transaction id
      const transactionId = await requestTransaction(aleoTransaction);
      
      if (onTransactionSent) {
        onTransactionSent(transactionId);
      }

      // Optional: Request the transaction status to check if the transaction has succeeded or failed
      // This can take some time to update and finalize on-chain so it's recommended to be polled in a loop
      if (transactionStatus && onStatusReceived) {
        const status = await transactionStatus(transactionId);
        onStatusReceived(status);
      }

      // Optional: Request the transition view keys for a specific transaction
      // This requires the on-chain history permission
      if (transitionViewKeys && onViewKeysReceived) {
        const viewKeys = await transitionViewKeys(transactionId);
        onViewKeysReceived(viewKeys);
      }
    }
  }, [
    publicKey,
    requestTransaction,
    transactionStatus,
    transitionViewKeys,
    program,
    functionName,
    inputs,
    fee,
    network,
    onTransactionSent,
    onStatusReceived,
    onViewKeysReceived,
  ]);

  return (
    <button onClick={onClick} disabled={!publicKey || !requestTransaction} className={className}>
      {children || "Request Transaction"}
    </button>
  );
};
