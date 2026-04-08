"use client";

import { WalletNotConnectedError } from "@provablehq/aleo-wallet-adaptor-core";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import React, { FC, useCallback } from "react";

interface DeployProgramProps {
  program: string;
  fee?: number;
  onDeployed?: (transactionId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const DeployProgram: FC<DeployProgramProps> = ({
  program,
  fee = 4_835_000,
  onDeployed,
  className = "",
  children,
}) => {
  const { address, executeDeployment } = useWallet();

  const onClick = useCallback(async () => {
    if (!address) throw new WalletNotConnectedError();

    if (executeDeployment) {
      const result = await executeDeployment({
        program,
        address,
        priorityFee: fee,
        privateFee: false,
      });

      const transactionId = result?.transactionId || "";

      if (onDeployed) {
        onDeployed(transactionId);
      }
    }
  }, [address, executeDeployment, program, fee, onDeployed]);

  return (
    <button onClick={onClick} disabled={!address || !executeDeployment} className={className}>
      {children || "Deploy Program"}
    </button>
  );
};
