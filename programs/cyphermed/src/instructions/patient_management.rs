use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Update patient account information
pub fn update_patient(
    ctx: Context<UpdatePatient>,
    emergency_contact: Option<Pubkey>,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Update emergency contact
    patient.emergency_contact = emergency_contact;
    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Patient {} updated emergency contact",
        patient.key()
    );
    
    Ok(())
}

/// Deactivate patient account (soft delete)
pub fn deactivate_patient(
    ctx: Context<DeactivatePatient>,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let clock = Clock::get()?;

    // Must be active to deactivate
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Deactivate account
    patient.is_active = false;
    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Patient {} account deactivated",
        patient.key()
    );
    
    emit!(PatientDeactivatedEvent {
        patient: patient.key(),
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Reactivate a deactivated patient account
pub fn reactivate_patient(
    ctx: Context<ReactivatePatient>,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let clock = Clock::get()?;

    // Must be inactive to reactivate
    require!(!patient.is_active, CypherMedError::PatientAlreadyActive);

    // Reactivate account
    patient.is_active = true;
    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Patient {} account reactivated",
        patient.key()
    );
    
    emit!(PatientReactivatedEvent {
        patient: patient.key(),
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePatient<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivatePatient<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReactivatePatient<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    pub authority: Signer<'info>,
}

#[event]
pub struct PatientDeactivatedEvent {
    pub patient: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PatientReactivatedEvent {
    pub patient: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}
