// Tests for silentbid_usdc.aleo.
// Each @test transition runs on its own fresh simulated ledger, so tests that
// need a balance must mint within the same test body.

import silentbid_usdc.aleo;

program test_silentbid_usdc.aleo {

    @noupgrade
    constructor() {}

    // Happy path: mint credits this test program's balance.
    @test
    fn test_mint() -> Final {
        let f: Final = silentbid_usdc.aleo::mint_public(100u64);
        return final { Final::run(f); };
    }

    // Mint, then spend part of it — both calls must succeed.
    @test
    fn test_mint_then_transfer() -> Final {
        let recv: address = aleo1jkhlte69auf8r2zf44g93wl9teyuw9kn0w2dlan3546j2rmjvs9s76z6wp;
        let f1: Final = silentbid_usdc.aleo::mint_public(100u64);
        let f2: Final = silentbid_usdc.aleo::transfer_public(recv, 10u64);
        return final {
            Final::run(f1);
            Final::run(f2);
        };
    }

    // Transferring more than the balance must fail assert(bal >= amount).
    @test
    @should_fail
    fn test_transfer_overdraft_fails() -> Final {
        let recv: address = aleo1jkhlte69auf8r2zf44g93wl9teyuw9kn0w2dlan3546j2rmjvs9s76z6wp;
        let f1: Final = silentbid_usdc.aleo::mint_public(50u64);
        let f2: Final = silentbid_usdc.aleo::transfer_public(recv, 1000u64);
        return final {
            Final::run(f1);
            Final::run(f2);
        };
    }
}
