# Deployment Guide

This guide will help you deploy your Aleo program to the testnet.

## Prerequisites

1. **Leo CLI installed** - See [Installation Guide](./installation.md)
2. **Private Key** - You need an Aleo private key with testnet credits
3. **Program Built** - Your program must compile successfully

## Getting Testnet Credits

Before deploying, you need testnet credits. You can get them from:
- [Aleo Faucet](https://faucet.aleo.org/)
- [Aleo Discord](https://discord.aleo.org/)

## Deployment Steps

### 1. Build Your Program

First, make sure your program compiles:

```bash
cd program
LEO_DISABLE_UPDATE_CHECK=1 leo build
```

### 2. Deploy to Testnet

Deploy using the deploy script:

```bash
cd program
./deploy.sh YOUR_PRIVATE_KEY
```

Or deploy manually:

```bash
LEO_DISABLE_UPDATE_CHECK=1 leo deploy \
  --private-key YOUR_PRIVATE_KEY \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --yes \
  --broadcast
```

### 3. Verify Deployment

After deployment, you'll receive:
- **Transaction ID**: Use this to track your deployment
- **Program Address**: Your program's on-chain identifier

Check your deployment on the [Aleo Explorer](https://testnet.explorer.provable.com/)

## Deployment Script

The `deploy.sh` script automates the deployment process:

```bash
#!/bin/bash
# Usage: ./deploy.sh <your_private_key>

PRIVATE_KEY=$1
LEO_DISABLE_UPDATE_CHECK=1 leo deploy \
  --private-key "$PRIVATE_KEY" \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --yes \
  --broadcast
```

## Common Issues

### Insufficient Credits
- **Error**: "Your public balance is insufficient"
- **Solution**: Get more testnet credits from the faucet

### Program Already Exists
- **Error**: "The program already exists on the network"
- **Solution**: Use `leo upgrade` instead of `leo deploy`, or change the program name

### Network Connection Issues
- **Error**: "Failed to connect to endpoint"
- **Solution**: Check your internet connection and verify the endpoint URL

## Post-Deployment

After successful deployment:

1. **Update your frontend** with the new program address
2. **Test your program** using the Debug page
3. **Share your program** address with others

## Example Deployment

```bash
# Navigate to program directory
cd program

# Build the program
LEO_DISABLE_UPDATE_CHECK=1 leo build

# Deploy (replace with your private key)
LEO_DISABLE_UPDATE_CHECK=1 leo deploy \
  --private-key "APrivateKey1zkp..." \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --yes \
  --broadcast
```

## Resources

- [Aleo Documentation](https://developer.aleo.org/)
- [Leo Language Guide](https://developer.aleo.org/leo/language)
- [Testnet Explorer](https://testnet.explorer.provable.com/)
