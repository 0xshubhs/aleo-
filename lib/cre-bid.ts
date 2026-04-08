// Aleo version - bid commitments are handled by Leo's BHP256 hash
// This file is a stub to satisfy imports from copied Ethereum components
// In Aleo, commitments are computed on-chain via the Leo program

export function computeBidCommitment() {
  // Not needed on Aleo - Leo program handles this
  return ""
}

export function buildBidTypedData() {
  // Not needed on Aleo - no EIP-712, bids are ZK records
  return {}
}
