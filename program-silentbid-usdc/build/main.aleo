program silentbid_usdc.aleo;

mapping balances:
    key as address.public;
    value as u64.public;

function mint_public:
    input r0 as u64.private;
    async mint_public self.caller r0 into r1;
    output r1 as silentbid_usdc.aleo/mint_public.future;

finalize mint_public:
    input r0 as address.public;
    input r1 as u64.public;
    get.or_use balances[r0] 0u64 into r2;
    add r2 r1 into r3;
    set r3 into balances[r0];

function transfer_public:
    input r0 as address.private;
    input r1 as u64.private;
    async transfer_public self.caller r1 r0 into r2;
    output r2 as silentbid_usdc.aleo/transfer_public.future;

finalize transfer_public:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as address.public;
    get.or_use balances[r0] 0u64 into r3;
    gte r3 r1 into r4;
    assert.eq r4 true;
    sub r3 r1 into r5;
    set r5 into balances[r0];
    get.or_use balances[r2] 0u64 into r6;
    add r6 r1 into r7;
    set r7 into balances[r2];

function transfer_public_as_signer:
    input r0 as address.private;
    input r1 as u64.private;
    async transfer_public_as_signer self.signer r1 r0 into r2;
    output r2 as silentbid_usdc.aleo/transfer_public_as_signer.future;

finalize transfer_public_as_signer:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as address.public;
    get.or_use balances[r0] 0u64 into r3;
    gte r3 r1 into r4;
    assert.eq r4 true;
    sub r3 r1 into r5;
    set r5 into balances[r0];
    get.or_use balances[r2] 0u64 into r6;
    add r6 r1 into r7;
    set r7 into balances[r2];

constructor:
    assert.eq edition 0u16;
