#!/bin/bash
# Deploy greeting.aleo to testnet
# Usage: ./deploy.sh [your_private_key]
# If no key is passed, uses ALEO_PRIVATE_KEY from ../.env or .env

PRIVATE_KEY="$1"
if [ -z "$PRIVATE_KEY" ]; then
    if [ -f "../.env" ]; then
        set -a
        source "../.env"
        set +a
        PRIVATE_KEY="$ALEO_PRIVATE_KEY"
    fi
    if [ -f ".env" ]; then
        set -a
        source ".env"
        set +a
        [ -z "$PRIVATE_KEY" ] && PRIVATE_KEY="$ALEO_PRIVATE_KEY"
    fi
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: Private key is required. Set ALEO_PRIVATE_KEY in .env or pass it: ./deploy.sh <key>"
    exit 1
fi

# Leo deploy expects APrivateKey1zkp... format; if key starts with PrivateKey1zkp, add A prefix
if [ "${PRIVATE_KEY#PrivateKey1zkp}" != "$PRIVATE_KEY" ] && [ "${PRIVATE_KEY#APrivateKey1zkp}" = "$PRIVATE_KEY" ]; then
    PRIVATE_KEY="A${PRIVATE_KEY}"
fi

echo "Building greeting.aleo..."
leo build
if [ $? -ne 0 ]; then
    echo "Build failed."
    exit 1
fi

echo "Deploying greeting.aleo to testnet..."
export LEO_DISABLE_UPDATE_CHECK=1
leo deploy --private-key "$PRIVATE_KEY" --network "${NETWORK:-testnet}" --endpoint "https://api.explorer.provable.com/v1" --yes --broadcast

if [ $? -eq 0 ]; then
    echo "Deployment successful! Use the /greeting page to call the greet transition."
else
    echo "Deployment failed."
    exit 1
fi
