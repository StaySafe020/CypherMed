use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Revoke access from a healthcare provider
pub fn revoke_access(ctx: Context<RevokeAccess>) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let access_grant = &mut ctx.accounts.access_grant;
    let clock = Clock::get()?;

    // Verify the grant belongs to this patient
    require!(
        access_grant.patient == patient.key(),
        CypherMedError::CannotRevokeGrant
    );

    // Check if already revoked
    require!(
        access_grant.is_active,
        CypherMedError::AccessGrantRevoked
    );

    // Revoke the access
    access_grant.is_active = false;
    access_grant.revoked_by = Some(ctx.accounts.authority.key());
    access_grant.revoked_at = Some(clock.unix_timestamp);

    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Access revoked from provider: {} by patient: {}",
        access_grant.provider,
        patient.key()
    );
    
    Ok(())
}

#[derive(Accounts)]
pub struct RevokeAccess<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        mut,
        seeds = [b"access_grant", patient.key().as_ref(), access_grant.provider.as_ref()],
        bump = access_grant.bump,
    )]
    pub access_grant: Account<'info, AccessGrant>,

    #[account(mut)]
    pub authority: Signer<'info>,
}
