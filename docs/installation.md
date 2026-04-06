# Installation Guide

This guide will help you set up the Aleo Scaffold development environment.

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** (for Leo CLI)
- **Git**

## Step 1: Install Node.js Dependencies

```bash
cd my-app
npm install
```

## Step 2: Install Leo CLI

Leo is the programming language for Aleo. You need it to build and deploy programs.

### Option 1: Official Installer (Recommended)

```bash
curl -L https://get.aleo.org/install | bash
```

After installation, restart your terminal or run:
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

### Option 2: Build from Source

If the installer doesn't work:

```bash
# Install Rust if you don't have it
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and build Leo
git clone https://github.com/AleoHQ/leo.git
cd leo
cargo install --path .
```

### Verify Leo Installation

```bash
leo --version
```

You should see something like: `leo 3.x.x`

## Step 3: Set Up Your Development Environment

### Install Development Tools

```bash
# Install TypeScript globally (optional)
npm install -g typescript

# Install ESLint (optional)
npm install -g eslint
```

### Configure Your Editor

Recommended VS Code extensions:
- **TypeScript and JavaScript Language Features**
- **ESLint**
- **Prettier**

## Step 4: Get Testnet Credits

Before deploying, you need testnet credits:

1. Visit [Aleo Faucet](https://faucet.aleo.org/)
2. Or join [Aleo Discord](https://discord.aleo.org/) and request credits

## Step 5: Generate a Private Key

```bash
leo account new
```

Save your private key securely! You'll need it for deployment.

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

### Leo Command Not Found

If `leo` command is not found after installation:

1. Check if it's in your PATH:
   ```bash
   echo $PATH
   ```

2. Add to your shell profile:
   ```bash
   export PATH="$HOME/.cargo/bin:$PATH"
   ```

3. Restart your terminal

### Build Errors

If you get build errors:

1. Update Leo:
   ```bash
   leo update
   ```

2. Clear build cache:
   ```bash
   cd program
   rm -rf build
   leo build
   ```

### Network Issues

If you have network connection issues:

1. Check your internet connection
2. Verify the endpoint URL is correct
3. Try using a VPN if you're behind a firewall

## Next Steps

- Read the [Deployment Guide](./deployment.md)
- Check out the [Hooks Documentation](./hooks.md)
- Explore the [Helper Functions](./helpers.md)

## Resources

- [Aleo Documentation](https://developer.aleo.org/)
- [Leo Language Guide](https://developer.aleo.org/leo/language)
- [Aleo Discord](https://discord.aleo.org/)
- [Aleo GitHub](https://github.com/AleoHQ)
