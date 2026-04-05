use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Create or initialize an emergency profile for a patient
/// This stores critical medical info accessible during break-glass emergencies
pub fn create_emergency_profile(
    ctx: Context<CreateEmergencyProfile>,
    blood_type: Option<String>,
    allergies: Option<String>,
    current_medications: Option<String>,
    chronic_conditions: Option<String>,
    emergency_instructions: Option<String>,
    is_organ_donor: bool,
    dnr_status: bool,
    primary_physician: Option<Pubkey>,
    insurance_info_hash: Option<String>,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let profile = &mut ctx.accounts.emergency_profile;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Validate field lengths
    if let Some(ref bt) = blood_type {
        require!(
            bt.len() <= EmergencyProfile::MAX_BLOOD_TYPE_LEN,
            CypherMedError::BloodTypeTooLong
        );
    }
    if let Some(ref a) = allergies {
        require!(
            a.len() <= EmergencyProfile::MAX_ALLERGIES_LEN,
            CypherMedError::AllergiesTooLong
        );
    }
    if let Some(ref m) = current_medications {
        require!(
            m.len() <= EmergencyProfile::MAX_MEDICATIONS_LEN,
            CypherMedError::MedicationsTooLong
        );
    }
    if let Some(ref c) = chronic_conditions {
        require!(
            c.len() <= EmergencyProfile::MAX_CONDITIONS_LEN,
            CypherMedError::ConditionsTooLong
        );
    }
    if let Some(ref e) = emergency_instructions {
        require!(
            e.len() <= EmergencyProfile::MAX_INSTRUCTIONS_LEN,
            CypherMedError::InstructionsTooLong
        );
    }
    if let Some(ref h) = insurance_info_hash {
        require!(
            h.len() <= EmergencyProfile::MAX_INSURANCE_HASH_LEN,
            CypherMedError::DataHashTooLong
        );
    }

    profile.patient = patient.key();
    profile.blood_type = blood_type;
    profile.allergies = allergies;
    profile.current_medications = current_medications;
    profile.chronic_conditions = chronic_conditions;
    profile.emergency_instructions = emergency_instructions;
    profile.is_organ_donor = is_organ_donor;
    profile.dnr_status = dnr_status;
    profile.primary_physician = primary_physician;
    profile.insurance_info_hash = insurance_info_hash;
    profile.updated_at = clock.unix_timestamp;
    profile.bump = ctx.bumps.emergency_profile;

    msg!(
        "Emergency profile created for patient: {}",
        patient.key()
    );

    emit!(EmergencyProfileCreatedEvent {
        patient: patient.key(),
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
        has_allergies: profile.allergies.is_some(),
        has_medications: profile.current_medications.is_some(),
        dnr_status,
    });

    Ok(())
}

/// Update an existing emergency profile
pub fn update_emergency_profile(
    ctx: Context<UpdateEmergencyProfile>,
    blood_type: Option<String>,
    allergies: Option<String>,
    current_medications: Option<String>,
    chronic_conditions: Option<String>,
    emergency_instructions: Option<String>,
    is_organ_donor: Option<bool>,
    dnr_status: Option<bool>,
    primary_physician: Option<Pubkey>,
    insurance_info_hash: Option<String>,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let profile = &mut ctx.accounts.emergency_profile;
    let clock = Clock::get()?;

    require!(patient.is_active, CypherMedError::PatientInactive);

    // Validate and update fields if provided
    if let Some(ref bt) = blood_type {
        require!(
            bt.len() <= EmergencyProfile::MAX_BLOOD_TYPE_LEN,
            CypherMedError::BloodTypeTooLong
        );
        profile.blood_type = Some(bt.clone());
    }
    if let Some(ref a) = allergies {
        require!(
            a.len() <= EmergencyProfile::MAX_ALLERGIES_LEN,
            CypherMedError::AllergiesTooLong
        );
        profile.allergies = Some(a.clone());
    }
    if let Some(ref m) = current_medications {
        require!(
            m.len() <= EmergencyProfile::MAX_MEDICATIONS_LEN,
            CypherMedError::MedicationsTooLong
        );
        profile.current_medications = Some(m.clone());
    }
    if let Some(ref c) = chronic_conditions {
        require!(
            c.len() <= EmergencyProfile::MAX_CONDITIONS_LEN,
            CypherMedError::ConditionsTooLong
        );
        profile.chronic_conditions = Some(c.clone());
    }
    if let Some(ref e) = emergency_instructions {
        require!(
            e.len() <= EmergencyProfile::MAX_INSTRUCTIONS_LEN,
            CypherMedError::InstructionsTooLong
        );
        profile.emergency_instructions = Some(e.clone());
    }
    if let Some(ref h) = insurance_info_hash {
        require!(
            h.len() <= EmergencyProfile::MAX_INSURANCE_HASH_LEN,
            CypherMedError::DataHashTooLong
        );
        profile.insurance_info_hash = Some(h.clone());
    }
    if let Some(donor) = is_organ_donor {
        profile.is_organ_donor = donor;
    }
    if let Some(dnr) = dnr_status {
        profile.dnr_status = dnr;
    }
    if primary_physician.is_some() {
        profile.primary_physician = primary_physician;
    }

    profile.updated_at = clock.unix_timestamp;

    msg!(
        "Emergency profile updated for patient: {}",
        patient.key()
    );

    emit!(EmergencyProfileUpdatedEvent {
        patient: patient.key(),
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreateEmergencyProfile<'info> {
    #[account(
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        init,
        payer = authority,
        space = EmergencyProfile::LEN,
        seeds = [b"emergency_profile", patient.key().as_ref()],
        bump
    )]
    pub emergency_profile: Account<'info, EmergencyProfile>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateEmergencyProfile<'info> {
    #[account(
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        mut,
        seeds = [b"emergency_profile", patient.key().as_ref()],
        bump = emergency_profile.bump,
    )]
    pub emergency_profile: Account<'info, EmergencyProfile>,

    pub authority: Signer<'info>,
}

#[event]
pub struct EmergencyProfileCreatedEvent {
    pub patient: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
    pub has_allergies: bool,
    pub has_medications: bool,
    pub dnr_status: bool,
}

#[event]
pub struct EmergencyProfileUpdatedEvent {
    pub patient: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}
