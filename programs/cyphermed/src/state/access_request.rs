use anchor_lang::prelude::*;
use super::Role;

/// Access Request - when a provider requests access from a patient
#[account]
pub struct AccessRequest {
    /// Patient whose access is being requested
    pub patient: Pubkey,
    
    /// Provider requesting access (doctor/hospital)
    pub requester: Pubkey,
    
    /// Role of the requester
    pub requester_role: Role,
    
    /// Optional: Reason for access request (visible to patient if provided)
    pub reason: Option<String>,
    
    /// Request creation timestamp
    pub requested_at: i64,
    
    /// Expiration timestamp (default 2 days from creation)
    pub expires_at: i64,
    
    /// Current status of the request
    pub status: RequestStatus,
    
    /// If approved, when was it approved
    pub responded_at: Option<i64>,
    
    /// Who responded (should be patient)
    pub responded_by: Option<Pubkey>,
    
    /// If denied, optional reason
    pub denial_reason: Option<String>,
    
    /// Notification sent flag
    pub notification_sent: bool,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl AccessRequest {
    /// Space required for AccessRequest account
    pub const LEN: usize = 8 + // discriminator
        32 + // patient
        32 + // requester
        (1 + 1) + // requester_role (enum)
        (1 + 4 + 200) + // reason (Option<String> max 200 chars)
        8 + // requested_at
        8 + // expires_at
        (1 + 1) + // status (enum)
        (1 + 8) + // responded_at
        (1 + 32) + // responded_by
        (1 + 4 + 200) + // denial_reason (Option<String>)
        1 + // notification_sent
        1; // bump
        
    /// Default expiration period: 2 days in seconds
    pub const DEFAULT_EXPIRATION_SECONDS: i64 = 2 * 24 * 60 * 60; // 172,800 seconds
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RequestStatus {
    Pending,
    Approved,
    Denied,
    Expired,
}
