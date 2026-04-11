// SilentBid test USDC — minimal public token
//
// Open faucet semantics: anyone can mint any amount to themselves via `mint_public`.
// NOT for production. Designed purely as a test payment token for silentbid_v2.aleo,
// with transfer signatures that match credits.aleo so the auction program can drop it in.

program silentbid_usdc.aleo {

    mapping balances: address => u64;

    @noupgrade
    constructor() {}

    // Open mint — caller gets `amount` credited to their balance.
    fn mint_public(amount: u64) -> Final {
        let caller: address = self.caller;
        return final {
            let cur: u64 = balances.get_or_use(caller, 0u64);
            balances.set(caller, cur + amount);
        };
    }

    // Transfer from self.caller (the immediate caller, which may be a program).
    // Used for program-initiated transfers like refunds from silentbid_v2.aleo.
    fn transfer_public(receiver: address, amount: u64) -> Final {
        let sender: address = self.caller;
        return final {
            let bal: u64 = balances.get_or_use(sender, 0u64);
            assert(bal >= amount);
            balances.set(sender, bal - amount);
            let rb: u64 = balances.get_or_use(receiver, 0u64);
            balances.set(receiver, rb + amount);
        };
    }

    // Transfer from self.signer (the original EOA, not any intermediate program).
    // Used for deposits where we want the actual user's balance debited even when
    // silentbid_v2.aleo is the immediate caller.
    fn transfer_public_as_signer(receiver: address, amount: u64) -> Final {
        let signer: address = self.signer;
        return final {
            let bal: u64 = balances.get_or_use(signer, 0u64);
            assert(bal >= amount);
            balances.set(signer, bal - amount);
            let rb: u64 = balances.get_or_use(receiver, 0u64);
            balances.set(receiver, rb + amount);
        };
    }
}
