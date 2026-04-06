"use client";

import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import React, { FC, useCallback } from "react";

interface RequestRecordPlaintextsProps {
  program?: string;
  onRecordsReceived?: (records: any[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export const RequestRecordPlaintexts: FC<RequestRecordPlaintextsProps> = ({
  program = "credits.aleo",
  onRecordsReceived,
  className = "",
  children,
}) => {
  const { publicKey, requestRecordPlaintexts } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    if (requestRecordPlaintexts) {
      const records = await requestRecordPlaintexts(program);
      console.log("Records: " + records);
      
      if (onRecordsReceived) {
        onRecordsReceived(records);
      }
    }
  }, [publicKey, requestRecordPlaintexts, program, onRecordsReceived]);

  return (
    <button
      onClick={onClick}
      disabled={!publicKey || !requestRecordPlaintexts}
      className={className}
    >
      {children || "Request Records Plaintexts"}
    </button>
  );
};
