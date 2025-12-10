use anchor_lang::prelude::*;
use super::RecordType;

/// Medical Record Metadata - stored on-chain
#[account]
pub struct MedicalRecord {
    /// Patient who owns this record
    pub patient: Pubkey,
    
    /// Healthcare provider who created the record
    pub created_by: Pubkey,
    
    /// Type of medical record
    pub record_type: RecordType,
    
    /// Unique record ID (can be used to fetch from off-chain DB)
    pub record_id: String,
    
    /// Hash of the encrypted off-chain data (for integrity verification)
    pub data_hash: String,
    
    /// IPFS/Arweave CID for distributed storage (optional)
    pub storage_cid: Option<String>,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Last modified timestamp
    pub modified_at: i64,
    
    /// Last accessed timestamp
    pub last_accessed: i64,
    
    /// Number of times this record has been accessed
    pub access_count: u64,
    
    /// Is this record active or archived?
    pub is_active: bool,
    
    /// Additional metadata (optional)
    pub metadata: Option<String>,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl MedicalRecord {
    /// Space required for MedicalRecord account
    pub const LEN: usize = 8 + // discriminator
        32 + // patient
        32 + // created_by
        (1 + 1) + // record_type (enum)
        (4 + 64) + // record_id (String max 64 chars)
        (4 + 64) + // data_hash (String max 64 chars)
        (1 + 4 + 100) + // storage_cid (Option<String> max 100 chars)
        8 + // created_at
        8 + // modified_at
        8 + // last_accessed
        8 + // access_count
        1 + // is_active
        (1 + 4 + 200) + // metadata (Option<String> max 200 chars)
        1; // bump
}
