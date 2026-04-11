import silentbid_usdc.aleo;
program test_silentbid_usdc.aleo;

function test_mint:
    call silentbid_usdc.aleo/mint_public 100u64 into r0;
    async test_mint r0 into r1;
    output r1 as test_silentbid_usdc.aleo/test_mint.future;

finalize test_mint:
    input r0 as silentbid_usdc.aleo/mint_public.future;
    await r0;

function test_mint_then_transfer:
    call silentbid_usdc.aleo/mint_public 100u64 into r0;
    call silentbid_usdc.aleo/transfer_public aleo1jkhlte69auf8r2zf44g93wl9teyuw9kn0w2dlan3546j2rmjvs9s76z6wp 10u64 into r1;
    async test_mint_then_transfer r0 r1 into r2;
    output r2 as test_silentbid_usdc.aleo/test_mint_then_transfer.future;

finalize test_mint_then_transfer:
    input r0 as silentbid_usdc.aleo/mint_public.future;
    input r1 as silentbid_usdc.aleo/transfer_public.future;
    await r0;
    await r1;

function test_transfer_overdraft_fails:
    call silentbid_usdc.aleo/mint_public 50u64 into r0;
    call silentbid_usdc.aleo/transfer_public aleo1jkhlte69auf8r2zf44g93wl9teyuw9kn0w2dlan3546j2rmjvs9s76z6wp 1000u64 into r1;
    async test_transfer_overdraft_fails r0 r1 into r2;
    output r2 as test_silentbid_usdc.aleo/test_transfer_overdraft_fails.future;

finalize test_transfer_overdraft_fails:
    input r0 as silentbid_usdc.aleo/mint_public.future;
    input r1 as silentbid_usdc.aleo/transfer_public.future;
    await r0;
    await r1;

constructor:
    assert.eq edition 0u16;
