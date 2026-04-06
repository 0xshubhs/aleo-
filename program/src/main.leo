// The 'onchainbio.aleo' program.
// OnChainBio - Decentralized Profile Bio Program
// This program allows users to store and manage their bio information on-chain

program onchainbio.aleo {
    // Bio Profile Record
    // This record represents a user's bio profile stored on-chain
    record BioProfile {
        owner: address,
        name: field,
        bio: field,
        created_at_block: u64,
        updated_at_block: u64,
    }

    // Constructor for program deployment
    // @noupgrade prevents the program from being upgraded after deployment
    @noupgrade
    async constructor() {}

    // Transition function to register a new bio profile
    // Creates a new BioProfile record for the caller
    transition register_bio(
        name: field,
        bio: field,
        current_block: u64,
    ) -> BioProfile {
        // Create the bio profile record
        return BioProfile {
            owner: self.caller,
            name: name,
            bio: bio,
            created_at_block: current_block,
            updated_at_block: current_block,
        };
    }

    // Transition function to update an existing bio profile
    // Only the owner can update their bio
    transition update_bio(
        bio_record: BioProfile,
        new_name: field,
        new_bio: field,
        current_block: u64,
    ) -> BioProfile {
        // Verify that the caller is the owner
        assert_eq(bio_record.owner, self.caller);
        
        // Update the bio profile
        return BioProfile {
            owner: bio_record.owner,
            name: new_name,
            bio: new_bio,
            created_at_block: bio_record.created_at_block,
            updated_at_block: current_block,
        };
    }

    // Transition function to get bio profile details
    // Only the owner can access their bio details
    transition get_bio(
        bio_record: BioProfile,
    ) -> (address, field, field, u64, u64) {
        // Verify that the caller is the owner
        assert_eq(bio_record.owner, self.caller);
        
        // Return all bio profile details
        return (
            bio_record.owner,
            bio_record.name,
            bio_record.bio,
            bio_record.created_at_block,
            bio_record.updated_at_block,
        );
    }

}
