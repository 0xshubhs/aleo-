#!/bin/bash

# Leo Installation Script for macOS
# This script installs Leo using the official Aleo installer

echo "Installing Leo..."
echo ""

# Method 1: Try the official Aleo installer
if command -v curl &> /dev/null; then
    echo "Attempting to install via Aleo installer..."
    curl -L https://get.aleo.org/install | bash
    
    # Source the profile to update PATH
    if [ -f ~/.zshrc ]; then
        source ~/.zshrc
    elif [ -f ~/.bash_profile ]; then
        source ~/.bash_profile
    fi
    
    # Check if leo is now available
    if command -v leo &> /dev/null; then
        echo "✅ Leo installed successfully!"
        leo --version
        exit 0
    fi
fi

# Method 2: Install via cargo (if Method 1 fails)
echo ""
echo "Attempting to install via Cargo (this may take a while)..."
if command -v cargo &> /dev/null; then
    # Try installing from crates.io if available
    cargo install leo-lang || {
        echo "⚠️  Cargo install failed. You may need to build from source."
        echo ""
        echo "To build from source, run:"
        echo "  git clone https://github.com/AleoHQ/leo.git"
        echo "  cd leo"
        echo "  cargo install --path ."
    }
else
    echo "❌ Cargo not found. Please install Rust first:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

echo ""
echo "After installation, make sure to:"
echo "1. Restart your terminal, or"
echo "2. Run: source ~/.zshrc (or source ~/.bash_profile)"
echo ""
echo "Then verify installation with: leo --version"
