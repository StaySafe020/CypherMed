use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Emergency access to medical records (break-glass scenario)
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

#[event]
pub struct EmergencyAccessEvent {
    pub patient: Pubkey,
    pub record: Pubkey,
    pub responder: Pubkey,
    pub timestamp: i64,
    pub justification: String,
}
