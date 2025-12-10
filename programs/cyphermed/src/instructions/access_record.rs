use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;
use crate::utils::*;

/// Access (view) a medical record and create audit log
pub fn access_record(
    ctx: Context<AccessRecord>,
    client_info: Option<String>,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let record = &mut ctx.accounts.record;
    let clock = Clock::get()?;

    // Verify patient and record are active
    require!(patient.is_active, CypherMedError::PatientInactive);
    require!(record.is_active, CypherMedError::RecordInactive);

    // Check if accessor is authorized
    let is_patient = ctx.accounts.accessor.key() == patient.authority;
    let mut accessor_role = Role::Patient;
    let mut success = true;
    let mut failure_reason = None;

    if !is_patient {
        match &ctx.accounts.access_grant {
            Some(grant) => {
                if !grant.is_active {
                    success = false;
                    failure_reason = Some("Access grant is not active".to_string());
                } else if is_grant_expired(grant.expires_at, clock.unix_timestamp) {
                    success = false;
                    failure_reason = Some("Access grant has expired".to_string());
                } else if !grant.can_view {
                    success = false;
                    failure_reason = Some("No view permission".to_string());
                } else if !grant.allowed_record_types.contains(&record.record_type) {
                    success = false;
                    failure_reason = Some("Record type not allowed".to_string());
                } else {
                    accessor_role = grant.role;
                }
            }
            None => {
                success = false;
                failure_reason = Some("No access grant found".to_string());
            }
        }
    }

    // If access was successful, update record statistics
    if success {
        record.last_accessed = clock.unix_timestamp;
        record.access_count = record.access_count.checked_add(1).unwrap();
    }

    // Create audit log entry (always log, even failures)
    let audit = &mut ctx.accounts.audit_log;
    audit.patient = patient.key();
    audit.record = record.key();
    audit.accessor = ctx.accounts.accessor.key();
    audit.accessor_role = accessor_role;
    audit.action = AccessAction::View;
    audit.record_type = record.record_type;
    audit.timestamp = clock.unix_timestamp;
    audit.success = success;
    audit.failure_reason = failure_reason.clone();
    audit.is_emergency = false;
    audit.emergency_justification = None;
    audit.client_info = client_info;
    audit.metadata = Some(format!("Record access attempt by {:?}", accessor_role));
    audit.bump = ctx.bumps.audit_log;

    if !success {
        msg!("Access denied: {}", failure_reason.unwrap_or_default());
        return err!(CypherMedError::AccessDenied);
    }

    msg!(
        "Record {} accessed by {} (role: {:?})",
        record.key(),
        ctx.accounts.accessor.key(),
        accessor_role
    );
    
    Ok(())
}

#[derive(Accounts)]
pub struct AccessRecord<'info> {
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

    /// Optional access grant (required if accessor is not the patient)
    #[account(
        seeds = [b"access_grant", patient.key().as_ref(), accessor.key().as_ref()],
        bump,
    )]
    pub access_grant: Option<Account<'info, AccessGrant>>,

    #[account(
        init,
        payer = accessor,
        space = AuditLog::LEN,
        seeds = [
            b"audit", 
            record.key().as_ref(), 
            accessor.key().as_ref(), 
            b"access",
            &record.access_count.to_le_bytes()
        ],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,

    #[account(mut)]
    pub accessor: Signer<'info>,

    pub system_program: Program<'info, System>,
}
