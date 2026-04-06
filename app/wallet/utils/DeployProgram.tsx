"use client";

import {
  Deployment,
  WalletAdapterNetwork,
  WalletNotConnectedError,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import React, { FC, useCallback } from "react";

interface DeployProgramProps {
  program: string;
  fee?: number;
  network?: WalletAdapterNetwork;
  onDeployed?: (transactionId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const DeployProgram: FC<DeployProgramProps> = ({
  program,
  fee = 4_835_000,
  network = WalletAdapterNetwork.Testnet,
  onDeployed,
  className = "",
  children,
}) => {
  const { publicKey, requestDeploy } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();

    const aleoDeployment = new Deployment(publicKey, network, program, fee);

    if (requestDeploy) {
      // Returns a transaction Id, that can be used to check the status. Note this is not the on-chain transaction id
      const transactionId = await requestDeploy(aleoDeployment);
      
      if (onDeployed) {
        onDeployed(transactionId);
      }
    }
  }, [publicKey, requestDeploy, program, fee, network, onDeployed]);

  return (
    <button onClick={onClick} disabled={!publicKey || !requestDeploy} className={className}>
      {children || "Deploy Program"}
    </button>
  );
};
