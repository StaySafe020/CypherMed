use anchor_lang::prelude::*;

/// Patient account - represents a patient in the system
#[account]
pub struct Patient {
    /// Patient's wallet public key (owner)
    pub authority: Pubkey,
    
    /// Patient's name (can be encrypted hash or pseudonym)
    pub name: String,
    
    /// Date of birth as Unix timestamp
    pub date_of_birth: i64,
    
    /// Account creation timestamp
    pub created_at: i64,
    
    /// Last updated timestamp
    pub updated_at: i64,
    
    /// Total number of medical records
    pub record_count: u64,
    
    /// Total number of access grants given
    pub access_grant_count: u64,
    
    /// Is the account active?
    pub is_active: bool,
    
    /// Emergency contact wallet (optional)
    pub emergency_contact: Option<Pubkey>,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl Patient {
    /// Space required for Patient account
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        (4 + 50) + // name (String with max 50 chars)
        8 + // date_of_birth
        8 + // created_at
        8 + // updated_at
        8 + // record_count
        8 + // access_grant_count
        1 + // is_active
        (1 + 32) + // emergency_contact (Option<Pubkey>)
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Role {
    Patient,
    Doctor,
    Hospital,
    Insurer,
    EmergencyResponder,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RecordType {
    GeneralMedical,
    Prescription,
    LabResult,
    VisitSummary,
    ImmunizationRecord,
    Imaging,
    Emergency,
}
