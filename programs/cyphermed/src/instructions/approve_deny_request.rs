use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Approve an access request and create access grant
pub fn approve_access_request(
    ctx: Context<ApproveAccessRequest>,
    allowed_record_types: Vec<RecordType>,
    grant_expiration: Option<i64>,
    can_create: bool,
    can_modify: bool,
    can_view: bool,
) -> Result<()> {
    let patient = &mut ctx.accounts.patient;
    let access_request = &mut ctx.accounts.access_request;
    let access_grant = &mut ctx.accounts.access_grant;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Verify request belongs to this patient
    require!(
        access_request.patient == patient.key(),
        CypherMedError::Unauthorized
    );

    // Verify request is still pending
    require!(
        access_request.status == RequestStatus::Pending,
        CypherMedError::RequestAlreadyResponded
    );

    // Check if request has expired
    require!(
        clock.unix_timestamp <= access_request.expires_at,
        CypherMedError::RequestExpired
    );

    // Validate record types
    require!(
        !allowed_record_types.is_empty(),
        CypherMedError::NoRecordTypesSpecified
    );
    require!(
        allowed_record_types.len() <= 7,
        CypherMedError::TooManyRecordTypes
    );

    // Validate grant expiration if provided
    if let Some(exp) = grant_expiration {
        require!(
            exp > clock.unix_timestamp,
            CypherMedError::InvalidExpirationTime
        );
    }

    // Update access request status
    access_request.status = RequestStatus::Approved;
    access_request.responded_at = Some(clock.unix_timestamp);
    access_request.responded_by = Some(ctx.accounts.authority.key());

    // Create the access grant
    access_grant.patient = patient.key();
    access_grant.provider = access_request.requester;
    access_grant.role = access_request.requester_role;
    access_grant.allowed_record_types = allowed_record_types;
    access_grant.granted_at = clock.unix_timestamp;
    access_grant.expires_at = grant_expiration;
    access_grant.is_active = true;
    access_grant.can_create = can_create;
    access_grant.can_modify = can_modify;
    access_grant.can_view = can_view;
    access_grant.reason = access_request.reason.clone();
    access_grant.revoked_by = None;
    access_grant.revoked_at = None;
    access_grant.bump = ctx.bumps.access_grant;

    // Update patient stats
    patient.access_grant_count = patient.access_grant_count.checked_add(1).unwrap();
    patient.updated_at = clock.unix_timestamp;

    msg!(
        "Access request approved: {} granted access to patient {}",
        access_request.requester,
        patient.key()
    );
    
    emit!(AccessRequestApprovedEvent {
        request: access_request.key(),
        patient: patient.key(),
        provider: access_request.requester,
        access_grant: access_grant.key(),
    });
    
    Ok(())
}

/// Deny an access request
pub fn deny_access_request(
    ctx: Context<DenyAccessRequest>,
    denial_reason: Option<String>,
) -> Result<()> {
    let access_request = &mut ctx.accounts.access_request;
    let patient = &ctx.accounts.patient;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Verify request belongs to this patient
    require!(
        access_request.patient == patient.key(),
        CypherMedError::Unauthorized
    );

    // Verify request is still pending
    require!(
        access_request.status == RequestStatus::Pending,
        CypherMedError::RequestAlreadyResponded
    );

    // Validate denial reason length if provided
    if let Some(ref r) = denial_reason {
        require!(
            r.len() <= 200,
            CypherMedError::ReasonTooLong
        );
    }

    // Update access request status
    access_request.status = RequestStatus::Denied;
    access_request.responded_at = Some(clock.unix_timestamp);
    access_request.responded_by = Some(ctx.accounts.authority.key());
    access_request.denial_reason = denial_reason.clone();

    msg!(
        "Access request denied: {} denied access to patient {}",
        access_request.requester,
        patient.key()
    );
    
    emit!(AccessRequestDeniedEvent {
        request: access_request.key(),
        patient: patient.key(),
        requester: access_request.requester,
        reason: denial_reason,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct ApproveAccessRequest<'info> {
    #[account(
        mut,
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        mut,
        seeds = [
            b"access_request",
            patient.key().as_ref(),
            access_request.requester.as_ref(),
        ],
        bump = access_request.bump,
    )]
    pub access_request: Account<'info, AccessRequest>,

    #[account(
        init,
        payer = authority,
        space = AccessGrant::LEN,
        seeds = [b"access_grant", patient.key().as_ref(), access_request.requester.as_ref()],
        bump
    )]
    pub access_grant: Account<'info, AccessGrant>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DenyAccessRequest<'info> {
    #[account(
        seeds = [b"patient", authority.key().as_ref()],
        bump = patient.bump,
        has_one = authority @ CypherMedError::Unauthorized
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        mut,
        seeds = [
            b"access_request",
            patient.key().as_ref(),
            access_request.requester.as_ref(),
        ],
        bump = access_request.bump,
    )]
    pub access_request: Account<'info, AccessRequest>,

    pub authority: Signer<'info>,
}

#[event]
pub struct AccessRequestApprovedEvent {
    pub request: Pubkey,
    pub patient: Pubkey,
    pub provider: Pubkey,
    pub access_grant: Pubkey,
}

#[event]
pub struct AccessRequestDeniedEvent {
    pub request: Pubkey,
    pub patient: Pubkey,
    pub requester: Pubkey,
    pub reason: Option<String>,
}
