use anchor_lang::prelude::*;

/// Consent Delegate - allows a guardian/delegate to manage patient records
/// Used for minors (parents manage until age 18) or incapacitated patients
#[account]
pub struct ConsentDelegate {
    /// Patient whose consent is being delegated
    pub patient: Pubkey,

    /// Delegate wallet (guardian, parent, legal representative)
    pub delegate: Pubkey,

    /// Relationship to patient
    pub relationship: DelegateRelationship,

    /// Can the delegate grant access to providers on behalf of patient?
    pub can_grant_access: bool,

    /// Can the delegate revoke access from providers?
    pub can_revoke_access: bool,

    /// Can the delegate approve access requests?
    pub can_approve_requests: bool,

    /// Can the delegate create records?
    pub can_create_records: bool,

    /// Can the delegate view records?
    pub can_view_records: bool,

    /// When this delegation was created
    pub created_at: i64,

    /// When this delegation expires (None = until manually revoked or age 18)
    pub expires_at: Option<i64>,

    /// Is this delegation currently active?
    pub is_active: bool,

    /// Revoked by (if revoked)
    pub revoked_by: Option<Pubkey>,

    /// Revocation timestamp
    pub revoked_at: Option<i64>,

    /// Reason for delegation (e.g., "Legal guardian of minor")
    pub reason: Option<String>,

    /// Bump seed for PDA
    pub bump: u8,
}

impl ConsentDelegate {
    pub const LEN: usize = 8 +  // discriminator
        32 +                      // patient
        32 +                      // delegate
        (1 + 1) +                // relationship (enum)
        1 +                       // can_grant_access
        1 +                       // can_revoke_access
        1 +                       // can_approve_requests
        1 +                       // can_create_records
        1 +                       // can_view_records
        8 +                       // created_at
        (1 + 8) +               // expires_at (Option<i64>)
        1 +                       // is_active
        (1 + 32) +              // revoked_by (Option<Pubkey>)
        (1 + 8) +               // revoked_at (Option<i64>)
        (1 + 4 + 200) +         // reason (Option<String> max 200)
        1;                        // bump
}

/// Relationship type between delegate and patient
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DelegateRelationship {
    /// Parent of a minor
    Parent,
    /// Legal guardian
    LegalGuardian,
    /// Spouse or domestic partner
    Spouse,
    /// Power of attorney holder
    PowerOfAttorney,
    /// Court-appointed conservator
    Conservator,
    /// Other authorized representative
    Other,
}
