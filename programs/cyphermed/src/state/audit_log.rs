use anchor_lang::prelude::*;
use super::{Role, RecordType};

/// Audit Log Entry - immutable record of all access events
#[account]
pub struct AuditLog {
    /// Patient whose record was accessed
    pub patient: Pubkey,
    
    /// The medical record that was accessed
    pub record: Pubkey,
    
    /// Who attempted/performed the access
    pub accessor: Pubkey,
    
    /// Role of the accessor
    pub accessor_role: Role,
    
    /// Type of action performed
    pub action: AccessAction,
    
    /// Type of record accessed
    pub record_type: RecordType,
    
    /// Timestamp of the access
    pub timestamp: i64,
    
    /// Was the access attempt successful?
    pub success: bool,
    
    /// Reason for failure (if unsuccessful)
    pub failure_reason: Option<String>,
    
    /// Was this an emergency access?
    pub is_emergency: bool,
    
    /// Emergency justification (if is_emergency = true)
    pub emergency_justification: Option<String>,
    
    /// IP address or client identifier (optional)
    pub client_info: Option<String>,
    
    /// Additional context
    pub metadata: Option<String>,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl AuditLog {
    /// Space required for AuditLog account
    pub const LEN: usize = 8 + // discriminator
        32 + // patient
        32 + // record
        32 + // accessor
        (1 + 1) + // accessor_role
        (1 + 1) + // action (enum)
        (1 + 1) + // record_type
        8 + // timestamp
        1 + // success
        (1 + 4 + 100) + // failure_reason
        1 + // is_emergency
        (1 + 4 + 200) + // emergency_justification
        (1 + 4 + 50) + // client_info
        (1 + 4 + 100) + // metadata
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AccessAction {
    View,
    Create,
    Modify,
    Delete,
    GrantAccess,
    RevokeAccess,
    EmergencyAccess,
}
