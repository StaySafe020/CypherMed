use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;
use crate::utils::*;

/// Create a new medical record
pub fn create_record(
    ctx: Context<CreateRecord>,
    record_id: String,
    record_type: RecordType,
    data_hash: String,
    storage_cid: Option<String>,
    metadata: Option<String>,
) -> Result<()> {
    // Validate record_id length
    require!(
        validate_string_length(&record_id, 64),
        CypherMedError::RecordIdTooLong
    );

    let patient = &mut ctx.accounts.patient;
    let record = &mut ctx.accounts.record;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Check if provider is authorized (either the patient or has access grant)
    let is_patient = ctx.accounts.provider.key() == patient.authority;
    
    if !is_patient {
        let access_grant = &ctx.accounts.access_grant.as_ref()
            .ok_or(CypherMedError::AccessDenied)?;
        
        require!(access_grant.is_active, CypherMedError::AccessGrantRevoked);
        require!(
            !is_grant_expired(access_grant.expires_at, clock.unix_timestamp),
            CypherMedError::AccessGrantExpired
        );
        require!(access_grant.can_create, CypherMedError::AccessDenied);
        require!(
            access_grant.allowed_record_types.contains(&record_type),
            CypherMedError::AccessDenied
        );
    }

    record.patient = patient.key();
    record.created_by = ctx.accounts.provider.key();
    record.record_type = record_type;
    record.record_id = record_id;
    record.data_hash = data_hash;
    record.storage_cid = storage_cid;
    record.created_at = clock.unix_timestamp;
    record.modified_at = clock.unix_timestamp;
    record.last_accessed = clock.unix_timestamp;
    record.access_count = 0;
    record.is_active = true;
    record.metadata = metadata;
    record.bump = ctx.bumps.record;

    // Update patient record count
    patient.record_count = patient.record_count.checked_add(1).unwrap();
    patient.updated_at = clock.unix_timestamp;

    // Log the creation in audit log
    let audit = &mut ctx.accounts.audit_log;
    audit.patient = patient.key();
    audit.record = record.key();
    audit.accessor = ctx.accounts.provider.key();
    audit.accessor_role = if is_patient { Role::Patient } else { 
        ctx.accounts.access_grant.as_ref().unwrap().role 
    };
    audit.action = AccessAction::Create;
    audit.record_type = record_type;
    audit.timestamp = clock.unix_timestamp;
    audit.success = true;
    audit.failure_reason = None;
    audit.is_emergency = false;
    audit.emergency_justification = None;
    audit.client_info = None;
    audit.metadata = Some("Record created".to_string());
    audit.bump = ctx.bumps.audit_log;

    msg!("Medical record created: {} for patient: {}", record.key(), patient.key());
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(record_id: String)]
pub struct CreateRecord<'info> {
    #[account(
        mut,
        seeds = [b"patient", patient.authority.as_ref()],
        bump = patient.bump,
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        init,
        payer = provider,
        space = MedicalRecord::LEN,
        seeds = [b"record", patient.key().as_ref(), record_id.as_bytes()],
        bump
    )]
    pub record: Account<'info, MedicalRecord>,

    /// Optional access grant (required if provider is not the patient)
    #[account(
        seeds = [b"access_grant", patient.key().as_ref(), provider.key().as_ref()],
        bump,
    )]
    pub access_grant: Option<Account<'info, AccessGrant>>,

    #[account(
        init,
        payer = provider,
        space = AuditLog::LEN,
        seeds = [
            b"audit", 
            record.key().as_ref(), 
            provider.key().as_ref(), 
            b"create",
            &patient.record_count.to_le_bytes()
        ],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,

    #[account(mut)]
    pub provider: Signer<'info>,

    pub system_program: Program<'info, System>,
}
