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
    
    // New errors for Phase 1 features
    #[msg("Cannot request access to yourself")]
    CannotRequestAccessToSelf,
    
    #[msg("Reason is too long (max 200 characters)")]
    ReasonTooLong,
    
    #[msg("Expiration time is too long (max 7 days from now)")]
    ExpirationTooLong,
    
    #[msg("Access request has already been responded to")]
    RequestAlreadyResponded,
    
    #[msg("Access request has expired")]
    RequestExpired,
    
    #[msg("Update note is required")]
    UpdateNoteRequired,
    
    #[msg("Update note is too long (max 500 characters)")]
    UpdateNoteTooLong,
    
    #[msg("Data hash is too long (max 64 characters)")]
    DataHashTooLong,
    
    #[msg("Metadata is too long (max 200 characters)")]
    MetadataTooLong,
    
    #[msg("Deletion reason is required")]
    DeletionReasonRequired,
    
    #[msg("Deletion reason is too long (max 300 characters)")]
    DeletionReasonTooLong,
    
    #[msg("No providers specified for batch operation")]
    NoProvidersSpecified,
    
    #[msg("Too many providers (max 10 per batch)")]
    TooManyProviders,
    
    #[msg("Provider count and role count must match")]
    ProviderRoleMismatch,
    
    #[msg("Invalid remaining accounts")]
    InvalidRemainingAccounts,
    
    #[msg("Patient account is already active")]
    PatientAlreadyActive,

    // Emergency profile errors
    #[msg("Blood type is too long (max 10 characters)")]
    BloodTypeTooLong,
    
    #[msg("Allergies field is too long (max 200 characters)")]
    AllergiesTooLong,
    
    #[msg("Medications field is too long (max 200 characters)")]
    MedicationsTooLong,
    
    #[msg("Conditions field is too long (max 200 characters)")]
    ConditionsTooLong,
    
    #[msg("Emergency instructions too long (max 300 characters)")]
    InstructionsTooLong,
    
    #[msg("Emergency justification is too long (max 500 characters)")]
    EmergencyJustificationTooLong,

    // Consent delegation errors
    #[msg("Cannot delegate consent to yourself")]
    CannotDelegateToSelf,
    
    #[msg("At least one delegate permission must be granted")]
    NoDelegatePermissions,
    
    #[msg("Consent delegation has already been revoked")]
    DelegationAlreadyRevoked,
    
    #[msg("Consent delegation has expired")]
    DelegationExpired,
    
    #[msg("Consent delegation is not active")]
    DelegationInactive,

    // Additional security validations
    #[msg("Storage CID is too long (max 100 characters)")]
    StorageCidTooLong,
    
    #[msg("Client info is too long (max 200 characters)")]
    ClientInfoTooLong,

    // Patient identity errors
    #[msg("Patient ID hash is required")]
    PatientIdHashRequired,
    
    #[msg("Patient ID hash is too long (max 64 characters)")]
    PatientIdHashTooLong,
    
    #[msg("Identity hash is required")]
    IdentityHashRequired,
    
    #[msg("Identity hash is too long (max 64 characters)")]
    IdentityHashTooLong,
    
    #[msg("Country code is required")]
    CountryCodeRequired,
    
    #[msg("Country code is too long (max 2 characters)")]
    CountryCodeTooLong,
}
