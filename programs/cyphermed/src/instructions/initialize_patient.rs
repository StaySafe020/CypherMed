use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;
use crate::utils::*;

/// Initialize a new patient account
pub fn initialize_patient(
    ctx: Context<InitializePatient>,
    name: String,
    date_of_birth: i64,
    emergency_contact: Option<Pubkey>,
) -> Result<()> {
    // Validate name length
    require!(
        validate_string_length(&name, 50),
        CypherMedError::NameTooLong
    );

    let patient = &mut ctx.accounts.patient;
    let clock = Clock::get()?;

    patient.authority = ctx.accounts.authority.key();
    patient.name = name;
    patient.date_of_birth = date_of_birth;
    patient.created_at = clock.unix_timestamp;
    patient.updated_at = clock.unix_timestamp;
    patient.record_count = 0;
    patient.access_grant_count = 0;
    patient.is_active = true;
    patient.emergency_contact = emergency_contact;
    patient.bump = ctx.bumps.patient;

    msg!("Patient account initialized for: {}", patient.authority);
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializePatient<'info> {
    #[account(
        init,
        payer = authority,
        space = Patient::LEN,
        seeds = [b"patient", authority.key().as_ref()],
        bump
    )]
    pub patient: Account<'info, Patient>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
