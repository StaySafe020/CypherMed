use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Update an existing medical record
pub fn update_record(
    ctx: Context<UpdateRecord>,
    new_data_hash: Option<String>,
    new_metadata: Option<String>,
    update_note: String,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let record = &mut ctx.accounts.record;
    let clock = Clock::get()?;

    // Verify patient and record are active
    require!(patient.is_active, CypherMedError::PatientInactive);
    require!(record.is_active, CypherMedError::RecordInactive);

    // Check authorization: only creator or patient can update
    let is_patient = ctx.accounts.updater.key() == patient.authority;
    let is_creator = ctx.accounts.updater.key() == record.created_by;

    // If not patient or creator, check for modify permission via access grant
    if !is_patient && !is_creator {
        let access_grant = ctx.accounts.access_grant.as_ref()
            .ok_or(CypherMedError::AccessDenied)?;
        
        require!(access_grant.is_active, CypherMedError::AccessGrantRevoked);
        require!(
            !crate::utils::is_grant_expired(access_grant.expires_at, clock.unix_timestamp),
            CypherMedError::AccessGrantExpired
        );
        require!(access_grant.can_modify, CypherMedError::AccessDenied);
    }

    // Validate update note
    require!(!update_note.is_empty(), CypherMedError::UpdateNoteRequired);
    require!(update_note.len() <= 500, CypherMedError::UpdateNoteTooLong);

    // Update record fields if provided
    if let Some(hash) = new_data_hash {
        require!(hash.len() <= 64, CypherMedError::DataHashTooLong);
        record.data_hash = hash;
    }

    if let Some(meta) = new_metadata {
        require!(meta.len() <= 200, CypherMedError::MetadataTooLong);
        record.metadata = Some(meta);
    }

    // Update timestamp
    record.modified_at = clock.unix_timestamp;

    // Create audit log for the update
    let audit = &mut ctx.accounts.audit_log;
    audit.patient = patient.key();
    audit.record = record.key();
    audit.accessor = ctx.accounts.updater.key();
    audit.accessor_role = if is_patient {
        Role::Patient
    } else if let Some(grant) = &ctx.accounts.access_grant {
        grant.role
    } else {
        // Creator (doctor/hospital)
        Role::Doctor // Default, could be passed as param
    };
    audit.action = AccessAction::Modify;
    audit.record_type = record.record_type;
    audit.timestamp = clock.unix_timestamp;
    audit.success = true;
    audit.failure_reason = None;
    audit.is_emergency = false;
    audit.emergency_justification = None;
    audit.client_info = None;
    audit.metadata = Some(format!("Update: {}", update_note));
    audit.bump = ctx.bumps.audit_log;

    msg!(
        "Record {} updated by {}. Note: {}",
        record.key(),
        ctx.accounts.updater.key(),
        update_note
    );
    
    emit!(RecordUpdatedEvent {
        record: record.key(),
        patient: patient.key(),
        updater: ctx.accounts.updater.key(),
        update_note,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Soft delete a medical record
pub fn delete_record(
    ctx: Context<DeleteRecord>,
    deletion_reason: String,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let record = &mut ctx.accounts.record;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Record must be active to delete
    require!(record.is_active, CypherMedError::RecordInactive);

    // Only creator or patient can delete
    let is_patient = ctx.accounts.deleter.key() == patient.authority;
    let is_creator = ctx.accounts.deleter.key() == record.created_by;

    require!(
        is_patient || is_creator,
        CypherMedError::Unauthorized
    );

    // Validate deletion reason
    require!(!deletion_reason.is_empty(), CypherMedError::DeletionReasonRequired);
    require!(deletion_reason.len() <= 300, CypherMedError::DeletionReasonTooLong);

    // Soft delete - mark as inactive
    record.is_active = false;
    record.modified_at = clock.unix_timestamp;

    // Create audit log for deletion
    let audit = &mut ctx.accounts.audit_log;
    audit.patient = patient.key();
    audit.record = record.key();
    audit.accessor = ctx.accounts.deleter.key();
    audit.accessor_role = if is_patient { Role::Patient } else { Role::Doctor };
    audit.action = AccessAction::Delete;
    audit.record_type = record.record_type;
    audit.timestamp = clock.unix_timestamp;
    audit.success = true;
    audit.failure_reason = None;
    audit.is_emergency = false;
    audit.emergency_justification = None;
    audit.client_info = None;
    audit.metadata = Some(format!("Deleted: {}", deletion_reason));
    audit.bump = ctx.bumps.audit_log;

    msg!(
        "Record {} soft-deleted by {}. Reason: {}",
        record.key(),
        ctx.accounts.deleter.key(),
        deletion_reason
    );
    
    emit!(RecordDeletedEvent {
        record: record.key(),
        patient: patient.key(),
        deleter: ctx.accounts.deleter.key(),
        reason: deletion_reason,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateRecord<'info> {
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

    /// Optional access grant (if updater is not patient or creator)
    #[account(
        seeds = [b"access_grant", patient.key().as_ref(), updater.key().as_ref()],
        bump,
    )]
    pub access_grant: Option<Account<'info, AccessGrant>>,

    #[account(
        init,
        payer = updater,
        space = AuditLog::LEN,
        seeds = [
            b"audit",
            record.key().as_ref(),
            updater.key().as_ref(),
            b"modify",
            &record.access_count.to_le_bytes()
        ],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,

    #[account(mut)]
    pub updater: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteRecord<'info> {
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
        payer = deleter,
        space = AuditLog::LEN,
        seeds = [
            b"audit",
            record.key().as_ref(),
            deleter.key().as_ref(),
            b"delete",
            &record.access_count.to_le_bytes()
        ],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,

    #[account(mut)]
    pub deleter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct RecordUpdatedEvent {
    pub record: Pubkey,
    pub patient: Pubkey,
    pub updater: Pubkey,
    pub update_note: String,
    pub timestamp: i64,
}

#[event]
pub struct RecordDeletedEvent {
    pub record: Pubkey,
    pub patient: Pubkey,
    pub deleter: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}
