use anchor_lang::prelude::*;
use super::{Role, RecordType};

/// Access Grant - defines who can access what
#[account]
pub struct AccessGrant {
    /// Patient who granted access
    pub patient: Pubkey,
    
    /// Healthcare provider receiving access
    pub provider: Pubkey,
    
    /// Role of the provider
    pub role: Role,
    
    /// Types of records this grant allows access to
    pub allowed_record_types: Vec<RecordType>,
    
    /// Grant creation timestamp
    pub granted_at: i64,
    
    /// Optional expiration timestamp (None = no expiration)
    pub expires_at: Option<i64>,
    
    /// Is this grant currently active?
    pub is_active: bool,
    
    /// Can the provider create new records?
    pub can_create: bool,
    
    /// Can the provider modify existing records?
    pub can_modify: bool,
    
    /// Can the provider view records?
    pub can_view: bool,
    
    /// Reason for access grant (optional)
    pub reason: Option<String>,
    
    /// Who revoked this grant (if revoked)
    pub revoked_by: Option<Pubkey>,
    
    /// Revocation timestamp
    pub revoked_at: Option<i64>,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl AccessGrant {
    /// Space required for AccessGrant account
    pub const LEN: usize = 8 + // discriminator
        32 + // patient
        32 + // provider
        (1 + 1) + // role (enum)
        (4 + 5 * (1 + 1)) + // allowed_record_types (Vec with max 5 types)
        8 + // granted_at
        (1 + 8) + // expires_at
        1 + // is_active
        1 + // can_create
        1 + // can_modify
        1 + // can_view
        (1 + 4 + 100) + // reason (Option<String> max 100 chars)
        (1 + 32) + // revoked_by
        (1 + 8) + // revoked_at
        1; // bump
}
