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
}
