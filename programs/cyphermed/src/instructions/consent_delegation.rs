use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Delegate consent management to a guardian/representative
/// Used for minors (parents manage until age 18) or incapacitated patients
pub fn delegate_consent(
    ctx: Context<DelegateConsent>,
    relationship: DelegateRelationship,
    can_grant_access: bool,
    can_revoke_access: bool,
    can_approve_requests: bool,
    can_create_records: bool,
    can_view_records: bool,
    expires_at: Option<i64>,
    reason: Option<String>,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let delegate_account = &mut ctx.accounts.consent_delegate;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Cannot delegate to yourself
    require!(
        patient.authority != ctx.accounts.delegate.key(),
        CypherMedError::CannotDelegateToSelf
    );

    // At least one permission must be granted
    require!(
        can_grant_access || can_revoke_access || can_approve_requests || 
        can_create_records || can_view_records,
        CypherMedError::NoDelegatePermissions
    );

    // Validate expiration if provided
    if let Some(exp) = expires_at {
        require!(
            exp > clock.unix_timestamp,
            CypherMedError::InvalidExpirationTime
        );
    }

    // Validate reason length if provided
    if let Some(ref r) = reason {
        require!(
            r.len() <= 200,
            CypherMedError::ReasonTooLong
        );
    }

    delegate_account.patient = patient.key();
    delegate_account.delegate = ctx.accounts.delegate.key();
    delegate_account.relationship = relationship;
    delegate_account.can_grant_access = can_grant_access;
    delegate_account.can_revoke_access = can_revoke_access;
    delegate_account.can_approve_requests = can_approve_requests;
    delegate_account.can_create_records = can_create_records;
    delegate_account.can_view_records = can_view_records;
    delegate_account.created_at = clock.unix_timestamp;
    delegate_account.expires_at = expires_at;
    delegate_account.is_active = true;
    delegate_account.revoked_by = None;
    delegate_account.revoked_at = None;
    delegate_account.reason = reason.clone();
    delegate_account.bump = ctx.bumps.consent_delegate;

    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Consent delegated: Patient {} -> Delegate {} (Relationship: {:?})",
        patient.key(),
        ctx.accounts.delegate.key(),
        relationship
    );

    emit!(ConsentDelegatedEvent {
        patient: patient.key(),
        delegate: ctx.accounts.delegate.key(),
        relationship,
        timestamp: clock.unix_timestamp,
        expires_at,
        reason,
    });

    Ok(())
}

/// Revoke a consent delegation
pub fn revoke_delegation(
    ctx: Context<RevokeDelegation>,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let delegate_account = &mut ctx.accounts.consent_delegate;
    let clock = Clock::get()?;

    // Verify the delegation belongs to this patient
    require!(
        delegate_account.patient == patient.key(),
        CypherMedError::Unauthorized
    );

    // Must be active to revoke
    require!(
        delegate_account.is_active,
        CypherMedError::DelegationAlreadyRevoked
    );

    delegate_account.is_active = false;
    delegate_account.revoked_by = Some(ctx.accounts.authority.key());
    delegate_account.revoked_at = Some(clock.unix_timestamp);

    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Consent delegation revoked: Patient {} revoked delegate {}",
        patient.key(),
        delegate_account.delegate
    );

    emit!(DelegationRevokedEvent {
        patient: patient.key(),
        delegate: delegate_account.delegate,
        revoked_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct DelegateConsent<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        init,
        payer = authority,
        space = ConsentDelegate::LEN,
        seeds = [b"consent_delegate", patient.key().as_ref(), delegate.key().as_ref()],
        bump
    )]
    pub consent_delegate: Account<'info, ConsentDelegate>,

    /// CHECK: The delegate receiving consent management powers
    pub delegate: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeDelegation<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        mut,
        seeds = [
            b"consent_delegate", 
            patient.key().as_ref(), 
            consent_delegate.delegate.as_ref()
        ],
        bump = consent_delegate.bump,
    )]
    pub consent_delegate: Account<'info, ConsentDelegate>,

    pub authority: Signer<'info>,
}

#[event]
pub struct ConsentDelegatedEvent {
    pub patient: Pubkey,
    pub delegate: Pubkey,
    pub relationship: DelegateRelationship,
    pub timestamp: i64,
    pub expires_at: Option<i64>,
    pub reason: Option<String>,
}

#[event]
pub struct DelegationRevokedEvent {
    pub patient: Pubkey,
    pub delegate: Pubkey,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}
