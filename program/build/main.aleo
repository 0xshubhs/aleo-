program onchainbio.aleo;

record BioProfile:
    owner as address.private;
    name as field.private;
    bio as field.private;
    created_at_block as u64.private;
    updated_at_block as u64.private;

function register_bio:
    input r0 as field.private;
    input r1 as field.private;
    input r2 as u64.private;
    cast self.caller r0 r1 r2 r2 into r3 as BioProfile.record;
    output r3 as BioProfile.record;

function update_bio:
    input r0 as BioProfile.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u64.private;
    assert.eq r0.owner self.caller;
    cast r0.owner r1 r2 r0.created_at_block r3 into r4 as BioProfile.record;
    output r4 as BioProfile.record;

function get_bio:
    input r0 as BioProfile.record;
    assert.eq r0.owner self.caller;
    output r0.owner as address.private;
    output r0.name as field.private;
    output r0.bio as field.private;
    output r0.created_at_block as u64.private;
    output r0.updated_at_block as u64.private;

constructor:
    assert.eq edition 0u16;
