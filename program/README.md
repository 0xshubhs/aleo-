# OnChainBio Leo Program

This is the Leo program for OnChainBio - a decentralized profile system that stores user bio information on the Aleo blockchain.

## Program Overview

The `onchainbio.aleo` program implements a decentralized bio/profile system where:

- **User Profiles**: Each user can register and update their bio information
- **Privacy-First**: Bio data is stored privately on-chain
- **Ownership**: Users own and control their bio data
- **Immutable History**: All bio updates are recorded on-chain

## Program Structure

### Record: `BioProfile`

The core data structure representing a user's bio profile:

```leo
record BioProfile:
    owner as address.private;
    name as field.private;
    bio as field.private;
    created_at_block as u64.private;
    updated_at_block as u64.private;
```

### Functions

1. **`register_bio`**: Registers a new bio profile for a user
   - Creates a new `BioProfile` record
   - Sets the owner, name, bio, and timestamps

2. **`update_bio`**: Updates an existing bio profile
   - Only the owner can update their bio
   - Updates the name, bio, and updated_at_block timestamp

3. **`get_bio`**: Retrieves bio profile details
   - Only the owner can access their bio details
   - Returns all profile metadata

4. **`view_bio`**: Public view function to check if a bio exists
   - Can be called by anyone
   - Returns whether a bio exists for a given address

## Installation

### Installing Leo

Before building the program, you need to install Leo. Here are the installation methods:

#### Method 1: Official Aleo Installer (Recommended)

```bash
curl -L https://get.aleo.org/install | bash
```

After installation, restart your terminal or run:
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

#### Method 2: Build from Source

If the installer doesn't work, you can build Leo from source:

```bash
# Make sure you have Rust installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and build Leo
git clone https://github.com/AleoHQ/leo.git
cd leo
cargo install --path .
```

#### Verify Installation

Check if Leo is installed correctly:

```bash
leo --version
```

For more details, visit the [official Leo installation guide](https://developer.aleo.org/leo/installation).

## Building the Program

### Build the program:

```bash
leo build
```

### Run tests (if you add test files):

```bash
leo test
```

### Deploy the program:

```bash
leo deploy --broadcast --yes
```

## Deployment

The program `onchainbio.aleo` has been deployed to Aleo Testnet.

**Program Address:** `onchainbio.aleo`

**Deployment Transaction:** [View on Explorer](https://testnet.explorer.provable.com/transaction/at1zq7k39c76wyqspwzs55lqdj5znzhdhjkv3p09wttn45l9r5j3vrs8ng3j7)

**Program Page:** [View Program](https://testnet.explorer.provable.com/program/onchainbio.aleo)

**Network:** Testnet  
**Status:** ✅ Deployed and Confirmed  
**Transaction ID:** `at1zq7k39c76wyqspwzs55lqdj5znzhdhjkv3p09wttn45l9r5j3vrs8ng3j7`

## Usage

### Registering a Bio

After deploying the program, you can register a bio using the `register_bio` function:

```bash
leo run register_bio \
  <name> \
  <bio> \
  <current_block>
```

### Updating a Bio

To update an existing bio:

```bash
leo run update_bio \
  <bio_record> \
  <new_name> \
  <new_bio> \
  <current_block>
```

### Viewing a Bio

To check if a bio exists for an address:

```bash
leo run view_bio \
  <address>
```

## Security Considerations

1. **Privacy**: All record data is private by default in Aleo. Only the owner can decrypt and view their bio data.

2. **Ownership**: Bio records are owned by the address that created them. Ownership is enforced at the blockchain level.

3. **Immutability**: Once recorded on-chain, bio updates create new records, maintaining a history of changes.

## Development

This program is designed to work with the my-app frontend application, which handles:
- Wallet connection
- Transaction submission
- Bio data fetching and display
- User interface for bio management

## License

MIT
