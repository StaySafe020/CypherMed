use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CypherMedError;

/// Request access to patient records
pub fn request_access(
    ctx: Context<RequestAccess>,
    requester_role: Role,
    reason: Option<String>,
    custom_expiration: Option<i64>,
) -> Result<()> {
    let patient = &ctx.accounts.patient;
    let access_request = &mut ctx.accounts.access_request;
    let clock = Clock::get()?;

    // Verify patient is active
    require!(patient.is_active, CypherMedError::PatientInactive);

    // Cannot request access to yourself
    require!(
        patient.authority != ctx.accounts.requester.key(),
        CypherMedError::CannotRequestAccessToSelf
    );

    // Validate reason length if provided
    if let Some(ref r) = reason {
        require!(
            r.len() <= 200,
            CypherMedError::ReasonTooLong
        );
    }

    // Calculate expiration (custom or default 2 days)
    let expires_at = if let Some(exp) = custom_expiration {
        require!(
            exp > clock.unix_timestamp,
            CypherMedError::InvalidExpirationTime
        );
        require!(
            exp <= clock.unix_timestamp + (7 * 24 * 60 * 60), // Max 7 days
            CypherMedError::ExpirationTooLong
        );
        exp
    } else {
        clock.unix_timestamp + AccessRequest::DEFAULT_EXPIRATION_SECONDS
    };

    // Initialize the access request
    access_request.patient = patient.key();
    access_request.requester = ctx.accounts.requester.key();
    access_request.requester_role = requester_role;
    access_request.reason = reason.clone();
    access_request.requested_at = clock.unix_timestamp;
    access_request.expires_at = expires_at;
    access_request.status = RequestStatus::Pending;
    access_request.responded_at = None;
    access_request.responded_by = None;
    access_request.denial_reason = None;
    access_request.notification_sent = false; // Frontend will handle sending notification
    access_request.bump = ctx.bumps.access_request;

    msg!(
        "Access request created: {} requesting access to patient {}",
        ctx.accounts.requester.key(),
        patient.key()
    );
    
    // Emit event for notification system
    emit!(AccessRequestCreatedEvent {
        request: access_request.key(),
        patient: patient.key(),
        requester: ctx.accounts.requester.key(),
        reason: reason,
        expires_at,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct RequestAccess<'info> {
    #[account(
        seeds = [b"patient", patient.authority.as_ref()],
        bump = patient.bump,
    )]
    pub patient: Account<'info, Patient>,

    #[account(
        init,
        payer = requester,
        space = AccessRequest::LEN,
        seeds = [
            b"access_request",
            patient.key().as_ref(),
            requester.key().as_ref(),
        ],
        bump
    )]
    pub access_request: Account<'info, AccessRequest>,

    #[account(mut)]
    pub requester: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AccessRequestCreatedEvent {
    pub request: Pubkey,
    pub patient: Pubkey,
    pub requester: Pubkey,
    pub reason: Option<String>,
    pub expires_at: i64,
}
