use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Emergency access to medical records (break-glass scenario)
/// Enhanced with severity levels, time-limited access, and emergency profile retrieval
pub fn emergency_access(
    ctx: Context<EmergencyAccess>,
    justification: String,
    client_info: Option<String>,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let record = &mut ctx.accounts.record;
    let clock = Clock::get()?;

    // Require justification for emergency access
    require!(
        !justification.is_empty(),
        CypherMedError::EmergencyJustificationRequired
    );

    // Validate justification length
    require!(
        justification.len() <= 500,
        CypherMedError::EmergencyJustificationTooLong
    );

    // Validate client_info length if provided
    if let Some(ref info) = client_info {
        require!(
            info.len() <= 200,
            CypherMedError::MetadataTooLong
        );
    }

    // Verify patient and record are active
    require!(patient.is_active, CypherMedError::PatientInactive);
    require!(record.is_active, CypherMedError::RecordInactive);

    // Update record access statistics
    record.last_accessed = clock.unix_timestamp;
    record.access_count = record.access_count.checked_add(1).unwrap();

    // Create audit log entry for emergency access
    let audit = &mut ctx.accounts.audit_log;
    audit.patient = patient.key();
    audit.record = record.key();
    audit.accessor = ctx.accounts.emergency_responder.key();
    audit.accessor_role = Role::EmergencyResponder;
    audit.action = AccessAction::EmergencyAccess;
    audit.record_type = record.record_type;
    audit.timestamp = clock.unix_timestamp;
    audit.success = true;
    audit.failure_reason = None;
    audit.is_emergency = true;
    audit.emergency_justification = Some(justification.clone());
    audit.client_info = client_info;
    audit.metadata = Some("EMERGENCY ACCESS - Break-glass protocol activated".to_string());
    audit.bump = ctx.bumps.audit_log;

    msg!(
        "⚠️ EMERGENCY ACCESS: Record {} accessed by {} | Reason: {}",
        record.key(),
        ctx.accounts.emergency_responder.key(),
        justification
    );
    
    // Emit event for real-time monitoring
    emit!(EmergencyAccessEvent {
        patient: patient.key(),
        record: record.key(),
        responder: ctx.accounts.emergency_responder.key(),
        timestamp: clock.unix_timestamp,
        justification,
    });
    
    Ok(())
}

/// Enhanced emergency access with severity classification and emergency profile
pub fn emergency_access_with_profile(
    ctx: Context<EmergencyAccessWithProfile>,
    justification: String,
    severity: EmergencySeverity,
    client_info: Option<String>,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let record = &mut ctx.accounts.record;
    let emergency_profile = &ctx.accounts.emergency_profile;
    let clock = Clock::get()?;

    // Require justification
    require!(
        !justification.is_empty(),
        CypherMedError::EmergencyJustificationRequired
    );

    // Validate justification length
    require!(
        justification.len() <= 500,
        CypherMedError::EmergencyJustificationTooLong
    );

    // Validate client_info length
    if let Some(ref info) = client_info {
        require!(
            info.len() <= 200,
            CypherMedError::MetadataTooLong
        );
    }

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);
    require!(record.is_active, CypherMedError::RecordInactive);

    // Update record access
    record.last_accessed = clock.unix_timestamp;
    record.access_count = record.access_count.checked_add(1).unwrap();

    // Create audit log
    let audit = &mut ctx.accounts.audit_log;
    audit.patient = patient.key();
    audit.record = record.key();
    audit.accessor = ctx.accounts.emergency_responder.key();
    audit.accessor_role = Role::EmergencyResponder;
    audit.action = AccessAction::EmergencyAccess;
    audit.record_type = record.record_type;
    audit.timestamp = clock.unix_timestamp;
    audit.success = true;
    audit.failure_reason = None;
    audit.is_emergency = true;
    audit.emergency_justification = Some(justification.clone());
    audit.client_info = client_info;
    audit.metadata = Some(format!(
        "EMERGENCY ACCESS [Severity: {:?}] - Break-glass with profile | Blood: {} | Allergies: {} | DNR: {}",
        severity,
        emergency_profile.blood_type.as_deref().unwrap_or("Unknown"),
        emergency_profile.allergies.as_deref().unwrap_or("None"),
        if emergency_profile.dnr_status { "YES" } else { "NO" }
    ));
    audit.bump = ctx.bumps.audit_log;

    msg!(
        "⚠️ EMERGENCY ACCESS [Severity: {:?}]: Record {} accessed by {} | Blood: {} | Allergies: {} | DNR: {}",
        severity,
        record.key(),
        ctx.accounts.emergency_responder.key(),
        emergency_profile.blood_type.as_deref().unwrap_or("Unknown"),
        emergency_profile.allergies.as_deref().unwrap_or("None"),
        if emergency_profile.dnr_status { "YES" } else { "NO" }
    );

    emit!(EmergencyAccessWithProfileEvent {
        patient: patient.key(),
        record: record.key(),
        responder: ctx.accounts.emergency_responder.key(),
        timestamp: clock.unix_timestamp,
        severity,
        justification,
        blood_type: emergency_profile.blood_type.clone(),
        allergies: emergency_profile.allergies.clone(),
        dnr_status: emergency_profile.dnr_status,
        emergency_contact: patient.emergency_contact,
        primary_physician: emergency_profile.primary_physician,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct EmergencyAccess<'info> {
    #[account(
        seeds = [b"patient", patient.authority.as_ref()],
        bump = patient.bump,
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        mut,
        seeds = [b"record", patient.key().as_ref(), record.record_id.as_bytes()],
        bump = record.bump,
    )]
    pub record: Account<'info, MedicalRecord>,

    #[account(
        init,
        payer = emergency_responder,
        space = AuditLog::LEN,
        seeds = [
            b"audit", 
            record.key().as_ref(), 
            emergency_responder.key().as_ref(), 
            b"emergency",
            &record.access_count.to_le_bytes()
        ],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,

    #[account(mut)]
    pub emergency_responder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyAccessWithProfile<'info> {
    #[account(
        seeds = [b"patient", patient.authority.as_ref()],
        bump = patient.bump,
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        mut,
        seeds = [b"record", patient.key().as_ref(), record.record_id.as_bytes()],
        bump = record.bump,
    )]
    pub record: Account<'info, MedicalRecord>,

    #[account(
        seeds = [b"emergency_profile", patient.key().as_ref()],
        bump = emergency_profile.bump,
    )]
    pub emergency_profile: Account<'info, EmergencyProfile>,

    #[account(
        init,
        payer = emergency_responder,
        space = AuditLog::LEN,
        seeds = [
            b"audit", 
            record.key().as_ref(), 
            emergency_responder.key().as_ref(), 
            b"emergency_profile",
            &record.access_count.to_le_bytes()
        ],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,

    #[account(mut)]
    pub emergency_responder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct EmergencyAccessEvent {
    pub patient: Pubkey,
    pub record: Pubkey,
    pub responder: Pubkey,
    pub timestamp: i64,
    pub justification: String,
}

#[event]
pub struct EmergencyAccessWithProfileEvent {
    pub patient: Pubkey,
    pub record: Pubkey,
    pub responder: Pubkey,
    pub timestamp: i64,
    pub severity: EmergencySeverity,
    pub justification: String,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub dnr_status: bool,
    pub emergency_contact: Option<Pubkey>,
    pub primary_physician: Option<Pubkey>,
}
