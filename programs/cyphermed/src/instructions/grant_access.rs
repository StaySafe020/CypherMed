use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Grant access to a healthcare provider
pub fn grant_access(
    ctx: Context<GrantAccess>,
    role: Role,
    allowed_record_types: Vec<RecordType>,
    expires_at: Option<i64>,
    can_create: bool,
    can_modify: bool,
    can_view: bool,
    reason: Option<String>,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let access_grant = &mut ctx.accounts.access_grant;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Cannot grant access to yourself
    require!(
        patient.authority != ctx.accounts.provider.key(),
        CypherMedError::CannotGrantAccessToSelf
    );

    // Validate record types
    require!(
        !allowed_record_types.is_empty(),
        CypherMedError::NoRecordTypesSpecified
    );
    require!(
        allowed_record_types.len() <= 7, // Max all record types
        CypherMedError::TooManyRecordTypes
    );

    // Validate expiration time if provided
    if let Some(expiry) = expires_at {
        require!(
            expiry > clock.unix_timestamp,
            CypherMedError::InvalidExpirationTime
        );
    }

    access_grant.patient = patient.key();
    access_grant.provider = ctx.accounts.provider.key();
    access_grant.role = role;
    access_grant.allowed_record_types = allowed_record_types;
    access_grant.granted_at = clock.unix_timestamp;
    access_grant.expires_at = expires_at;
    access_grant.is_active = true;
    access_grant.can_create = can_create;
    access_grant.can_modify = can_modify;
    access_grant.can_view = can_view;
    access_grant.reason = reason;
    access_grant.revoked_by = None;
    access_grant.revoked_at = None;
    access_grant.bump = ctx.bumps.access_grant;

    // Update patient access grant count
    patient.access_grant_count = patient.access_grant_count.checked_add(1).unwrap();
    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Access granted to provider: {} by patient: {} with role: {:?}",
        ctx.accounts.provider.key(),
        patient.key(),
        role
    );
    
    Ok(())
}

#[derive(Accounts)]
pub struct GrantAccess<'info> {
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
        space = AccessGrant::LEN,
        seeds = [b"access_grant", patient.key().as_ref(), provider.key().as_ref()],
        bump
    )]
    pub access_grant: Account<'info, AccessGrant>,

    /// CHECK: The provider receiving access (verified in seeds)
    pub provider: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
