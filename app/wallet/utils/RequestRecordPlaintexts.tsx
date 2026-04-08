"use client";

import { WalletNotConnectedError } from "@provablehq/aleo-wallet-adaptor-core";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
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
  const { address, requestRecords } = useWallet();

  const onClick = useCallback(async () => {
    if (!address) throw new WalletNotConnectedError();
    if (requestRecords) {
      // Request records with plaintext included
      const records = await requestRecords(program, true);
      console.log("Records: " + records);

      if (onRecordsReceived) {
        onRecordsReceived(records as any[]);
      }
    }
  }, [address, requestRecords, program, onRecordsReceived]);

  return (
    <button
      onClick={onClick}
      disabled={!address || !requestRecords}
      className={className}
    >
      {children || "Request Records Plaintexts"}
    </button>
  );
};
