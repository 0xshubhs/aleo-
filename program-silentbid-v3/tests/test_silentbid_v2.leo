// silentbid_v2 unit tests are disabled due to a Leo 4.0.0 compiler bug.
//
// `leo test` panics during the type-checking pass on silentbid_v2's external call
// to silentbid_usdc.aleo::transfer_public_as_signer:
//
//   thread 'main' panicked at leo-passes-4.0.0/src/type_checking/ast.rs:1169:17
//   Finalization not found: silentbid_usdc.aleo::transfer_public_as_signer
//
// The harness fails to resolve the finalize-function of the transitive network
// dependency. This happens even when the tests themselves don't reference those
// functions — silentbid_v2.aleo is re-analyzed as a whole when tests compile.
//
// silentbid_v2 is exercised end-to-end on live testnet instead — see README.md
// and program-silentbid/test-state.md for the create → bid → reveal → settle flow
// against the deployed program. The USDC escrow transfer is verified on-chain
// (program escrow address holds max_bid after place_bid; bidder balance decreases
// by the same amount).

program test_silentbid_v2.aleo {
    @noupgrade
    constructor() {}

    // Placeholder — Leo requires test programs to be valid modules.
    @test
    fn test_placeholder() {
        assert(1u32 == 1u32);
    }
}
