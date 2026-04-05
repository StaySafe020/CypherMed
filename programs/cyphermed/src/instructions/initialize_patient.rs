use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;
use crate::utils::*;

/// Initialize a new patient account with privacy-preserving identifiers
pub fn initialize_patient(
    ctx: Context<InitializePatient>,
    name: String,
    date_of_birth: i64,
    patient_id_hash: String,
    identity_hash: String,
    country_code: String,
    emergency_contact: Option<Pubkey>,
) -> Result<()> {
    // Validate name length
    require!(
        validate_string_length(&name, Patient::MAX_NAME_LEN),
        CypherMedError::NameTooLong
    );

    // Validate patient_id_hash (SHA-256 hex = 64 chars)
    require!(
        validate_string_length(&patient_id_hash, Patient::MAX_HASH_LEN),
        CypherMedError::PatientIdHashTooLong
    );
    require!(
        !patient_id_hash.is_empty(),
        CypherMedError::PatientIdHashRequired
    );

    // Validate identity_hash
    require!(
        validate_string_length(&identity_hash, Patient::MAX_HASH_LEN),
        CypherMedError::IdentityHashTooLong
    );
    require!(
        !identity_hash.is_empty(),
        CypherMedError::IdentityHashRequired
    );

    // Validate country code (2-char ISO)
    require!(
        validate_string_length(&country_code, Patient::MAX_COUNTRY_CODE_LEN),
        CypherMedError::CountryCodeTooLong
    );
    require!(
        !country_code.is_empty(),
        CypherMedError::CountryCodeRequired
    );

    let patient = &mut ctx.accounts.patient;
    let clock = Clock::get()?;

    patient.authority = ctx.accounts.authority.key();
    patient.patient_id_hash = patient_id_hash;
    patient.identity_hash = identity_hash;
    patient.name = name;
    patient.date_of_birth = date_of_birth;
    patient.created_at = clock.unix_timestamp;
    patient.updated_at = clock.unix_timestamp;
    patient.record_count = 0;
    patient.access_grant_count = 0;
    patient.is_active = true;
    patient.emergency_contact = emergency_contact;
    patient.country_code = country_code;
    patient.bump = ctx.bumps.patient;

    msg!("Patient account initialized: {}", patient.patient_id_hash);
    
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
