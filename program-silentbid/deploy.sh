#!/bin/bash

# Deploy script for silentbid_v1.aleo to testnet
PRIVATE_KEY="$1"
if [ -z "$PRIVATE_KEY" ]; then
    if [ -f "../.env" ]; then
        set -a; source "../.env"; set +a
        PRIVATE_KEY="$ALEO_PRIVATE_KEY"
    fi
fi
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: Private key required. Set ALEO_PRIVATE_KEY in .env or pass as argument"
    exit 1
fi

# Fix key prefix if needed
if [ "${PRIVATE_KEY#PrivateKey1zkp}" != "$PRIVATE_KEY" ] && [ "${PRIVATE_KEY#APrivateKey1zkp}" = "$PRIVATE_KEY" ]; then
    PRIVATE_KEY="A${PRIVATE_KEY}"
fi

echo "Building silentbid_v1.aleo..."
leo build
if [ $? -ne 0 ]; then echo "Build failed."; exit 1; fi

echo "Deploying silentbid_v1.aleo to testnet..."
export LEO_DISABLE_UPDATE_CHECK=1
leo deploy --private-key "$PRIVATE_KEY" --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" --yes --broadcast

if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed."
    exit 1
fi
