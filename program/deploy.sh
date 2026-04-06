#!/bin/bash

# Deploy script for onchainbio.aleo to testnet
# Usage: ./deploy.sh <your_private_key>

if [ -z "$1" ]; then
    echo "Error: Private key is required"
    echo "Usage: ./deploy.sh <your_private_key>"
    exit 1
fi

PRIVATE_KEY=$1

echo "🚀 Deploying onchainbio.aleo to testnet..."
echo ""

# Set the private key and deploy
LEO_DISABLE_UPDATE_CHECK=1 leo deploy --private-key "$PRIVATE_KEY" --network testnet

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "Your program is now live on testnet!"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
