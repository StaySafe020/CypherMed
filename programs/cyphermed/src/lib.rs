use anchor_lang::prelude::*;

declare_id!("34LxHEYnuRTy2dif922hNttBbrPNQ6pj7pThyCxwxUrL");

pub mod state;
pub mod instructions;
pub mod errors;
pub mod utils;

use instructions::*;
use state::*;

#[program]
pub mod cyphermed {
    use super::*;

    /// Initialize a new patient account
    pub fn initialize_patient(
        ctx: Context<InitializePatient>,
        name: String,
        date_of_birth: i64,
        emergency_contact: Option<Pubkey>,
    ) -> Result<()> {
        instructions::initialize_patient(ctx, name, date_of_birth, emergency_contact)
    }

    /// Create a new medical record
    pub fn create_record(
        ctx: Context<CreateRecord>,
        record_id: String,
        record_type: RecordType,
        data_hash: String,
        storage_cid: Option<String>,
        metadata: Option<String>,
    ) -> Result<()> {
        instructions::create_record(ctx, record_id, record_type, data_hash, storage_cid, metadata)
    }

    /// Grant access to a healthcare provider
    pub fn grant_access(
        ctx: Context<GrantAccess>,
        role: Role,
        allowed_record_types: Vec<RecordType>,
        expires_at: Option<i64>,
        can_create: bool,
        can_modify: bool,
        can_view: bool,
        reason: Option<String>,
    ) -> Result<()> {
        instructions::grant_access(
            ctx,
            role,
            allowed_record_types,
            expires_at,
            can_create,
            can_modify,
            can_view,
            reason,
        )
    }

    /// Revoke access from a healthcare provider
    pub fn revoke_access(ctx: Context<RevokeAccess>) -> Result<()> {
        instructions::revoke_access(ctx)
    }

    /// Access (view) a medical record
    pub fn access_record(
        ctx: Context<AccessRecord>,
        client_info: Option<String>,
    ) -> Result<()> {
        instructions::access_record(ctx, client_info)
    }

    /// Emergency access to medical records (break-glass)
    pub fn emergency_access(
        ctx: Context<EmergencyAccess>,
        justification: String,
        client_info: Option<String>,
    ) -> Result<()> {
        instructions::emergency_access(ctx, justification, client_info)
    }

    /// Request access to patient records
    pub fn request_access(
        ctx: Context<RequestAccess>,
        requester_role: Role,
        reason: Option<String>,
        custom_expiration: Option<i64>,
    ) -> Result<()> {
        instructions::request_access(ctx, requester_role, reason, custom_expiration)
    }

    /// Approve an access request
    pub fn approve_access_request(
        ctx: Context<ApproveAccessRequest>,
        allowed_record_types: Vec<RecordType>,
        grant_expiration: Option<i64>,
        can_create: bool,
        can_modify: bool,
        can_view: bool,
    ) -> Result<()> {
        instructions::approve_access_request(
            ctx,
            allowed_record_types,
            grant_expiration,
            can_create,
            can_modify,
            can_view,
        )
    }

    /// Deny an access request
    pub fn deny_access_request(
        ctx: Context<DenyAccessRequest>,
        denial_reason: Option<String>,
    ) -> Result<()> {
        instructions::deny_access_request(ctx, denial_reason)
    }

    /// Update an existing medical record
    pub fn update_record(
        ctx: Context<UpdateRecord>,
        new_data_hash: Option<String>,
        new_metadata: Option<String>,
        update_note: String,
    ) -> Result<()> {
        instructions::update_record(ctx, new_data_hash, new_metadata, update_note)
    }

    /// Soft delete a medical record
    pub fn delete_record(
        ctx: Context<DeleteRecord>,
        deletion_reason: String,
    ) -> Result<()> {
        instructions::delete_record(ctx, deletion_reason)
    }

    /// Batch grant access to multiple providers
    pub fn batch_grant_access(
        ctx: Context<BatchGrantAccess>,
        providers: Vec<Pubkey>,
        roles: Vec<Role>,
        allowed_record_types: Vec<RecordType>,
        expires_at: Option<i64>,
        can_create: bool,
        can_modify: bool,
        can_view: bool,
        reason: Option<String>,
    ) -> Result<()> {
        instructions::batch_grant_access(
            ctx,
            providers,
            roles,
            allowed_record_types,
            expires_at,
            can_create,
            can_modify,
            can_view,
            reason,
        )
    }

    /// Update patient account information
    pub fn update_patient(
        ctx: Context<UpdatePatient>,
        emergency_contact: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_patient(ctx, emergency_contact)
    }

    /// Deactivate patient account
    pub fn deactivate_patient(ctx: Context<DeactivatePatient>) -> Result<()> {
        instructions::deactivate_patient(ctx)
    }

    /// Reactivate patient account
    pub fn reactivate_patient(ctx: Context<ReactivatePatient>) -> Result<()> {
        instructions::reactivate_patient(ctx)
    }
}
