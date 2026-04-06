# greeting.aleo

Minimal Leo program for the Aleo Scaffold. Single transition: `greet(message: field) -> (field)`.

## Build

```bash
cd program-greeting
leo build
```

## Deploy to testnet

```bash
./deploy.sh <your_private_key>
```

Then use the app’s **/greeting** page to call the `greet` transition.
