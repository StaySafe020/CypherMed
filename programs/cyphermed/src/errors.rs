use anchor_lang::prelude::*;

#[error_code]
pub enum CypherMedError {
    #[msg("Unauthorized: You don't have permission to perform this action")]
    Unauthorized,
    
    #[msg("Patient account not found")]
    PatientNotFound,
    
    #[msg("Medical record not found")]
    RecordNotFound,
    
    #[msg("Access grant not found")]
    AccessGrantNotFound,
    
    #[msg("Access denied: No valid access grant exists")]
    AccessDenied,
    
    #[msg("Access grant has expired")]
    AccessGrantExpired,
    
    #[msg("Invalid role for this operation")]
    InvalidRole,
    
    #[msg("Invalid record type")]
    InvalidRecordType,
    
    #[msg("Patient account is inactive")]
    PatientInactive,
    
    #[msg("Record is inactive or archived")]
    RecordInactive,
    
    #[msg("Access grant is already revoked")]
    AccessGrantRevoked,
    
    #[msg("Cannot revoke access grant that doesn't belong to you")]
    CannotRevokeGrant,
    
    #[msg("Emergency access requires justification")]
    EmergencyJustificationRequired,
    
    #[msg("Name is too long (max 50 characters)")]
    NameTooLong,
    
    #[msg("Record ID is too long (max 64 characters)")]
    RecordIdTooLong,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    
    #[msg("Cannot grant access to yourself")]
    CannotGrantAccessToSelf,
    
    #[msg("Maximum number of record types exceeded")]
    TooManyRecordTypes,
    
    #[msg("At least one record type must be specified")]
    NoRecordTypesSpecified,
    
    #[msg("Invalid expiration time (must be in the future)")]
    InvalidExpirationTime,
}
