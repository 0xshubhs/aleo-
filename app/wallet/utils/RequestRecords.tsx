"use client";

import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import React, { FC, useCallback } from "react";

interface RequestRecordsProps {
  program?: string;
  onRecordsReceived?: (records: string[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export const RequestRecords: FC<RequestRecordsProps> = ({
  program = "credits.aleo",
  onRecordsReceived,
  className = "",
  children,
}) => {
  const { publicKey, requestRecords } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    if (requestRecords) {
      const records = await requestRecords(program);
      console.log("Records: " + records);
      
      if (onRecordsReceived) {
        onRecordsReceived(records);
      }
    }
  }, [publicKey, requestRecords, program, onRecordsReceived]);

  return (
    <button onClick={onClick} disabled={!publicKey || !requestRecords} className={className}>
      {children || "Request Records"}
    </button>
  );
};
