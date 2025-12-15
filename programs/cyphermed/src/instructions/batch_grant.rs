use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Batch grant access to multiple providers at once
pub fn batch_grant_access(
    ctx: Context<BatchGrantAccess>,
    providers: Vec<Pubkey>,
    roles: Vec<Role>,
    allowed_record_types: Vec<RecordType>,
    expires_at: Option<i64>,
    _can_create: bool,
    _can_modify: bool,
    _can_view: bool,
    _reason: Option<String>,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Validate inputs
    require!(!providers.is_empty(), CypherMedError::NoProvidersSpecified);
    require!(providers.len() <= 10, CypherMedError::TooManyProviders);
    require!(providers.len() == roles.len(), CypherMedError::ProviderRoleMismatch);
    require!(
        !allowed_record_types.is_empty(),
        CypherMedError::NoRecordTypesSpecified
    );

    // Validate expiration time if provided
    if let Some(expiry) = expires_at {
        require!(
            expiry > clock.unix_timestamp,
            CypherMedError::InvalidExpirationTime
        );
    }

    // This instruction creates accounts via remaining_accounts
    // Each access_grant PDA must be passed in remaining_accounts
    let remaining = &ctx.remaining_accounts;
    require!(
        remaining.len() == providers.len(),
        CypherMedError::InvalidRemainingAccounts
    );

    msg!(
        "Batch granting access to {} providers for patient {}",
        providers.len(),
        patient.key()
    );

    // Note: Actual account initialization must be done via CPI or
    // multiple transactions. This is a simplified version that
    // validates inputs and emits an event for off-chain processing.
    
    // In production, you'd either:
    // 1. Use remaining_accounts to init each AccessGrant
    // 2. Or require frontend to make multiple grant_access calls
    
    emit!(BatchAccessGrantedEvent {
        patient: patient.key(),
        providers: providers.clone(),
        roles: roles.clone(),
        record_types: allowed_record_types.clone(),
        granted_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    patient.updated_at = clock.unix_timestamp;
    
    Ok(())
}

#[derive(Accounts)]
pub struct BatchGrantAccess<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct BatchAccessGrantedEvent {
    pub patient: Pubkey,
    pub providers: Vec<Pubkey>,
    pub roles: Vec<Role>,
    pub record_types: Vec<RecordType>,
    pub granted_by: Pubkey,
    pub timestamp: i64,
}
