use anchor_lang::prelude::*;

/// Patient account - represents a patient in the system
/// 
/// Privacy Model:
/// - `authority` is the wallet that controls this account (used for signing, never shared publicly)
/// - `patient_id_hash` is a SHA-256 hash of (wallet + salt) — this is the portable ID 
///    hospitals use to look up a patient. Cannot be reversed to find the wallet.
/// - `identity_hash` is a hash of real-world identity (name + DOB + national ID) — 
///    used to verify same person across hospitals without exposing raw data.
/// 
/// Think of it like:
///   wallet = your private key to the file cabinet
///   patient_id_hash = your hospital file number (safe to share)
///   identity_hash = proof of identity (verifiable but private)
#[account]
pub struct Patient {
    /// Patient's wallet public key (owner/signer — never shared as lookup)
    pub authority: Pubkey,

    /// Privacy-preserving patient ID: SHA-256(wallet_address + patient_salt)
    /// This is the universal ID hospitals use to reference the patient.
    /// Portable across any hospital/country. Cannot be reversed to find the wallet.
    pub patient_id_hash: String,

    /// Identity verification hash: SHA-256(full_name + date_of_birth + national_id + salt)
    /// Used to verify same person across different hospitals without exposing raw data.
    /// Two hospitals can compare this hash to confirm it's the same patient.
    pub identity_hash: String,
    
    /// Patient's name (encrypted or pseudonym — never stored in plaintext on-chain)
    pub name: String,
    
    /// Date of birth as Unix timestamp
    pub date_of_birth: i64,
    
    /// Account creation timestamp
    pub created_at: i64,
    
    /// Last updated timestamp
    pub updated_at: i64,
    
    /// Total number of medical records
    pub record_count: u64,
    
    /// Total number of access grants given
    pub access_grant_count: u64,
    
    /// Is the account active?
    pub is_active: bool,
    
    /// Emergency contact wallet (optional)
    pub emergency_contact: Option<Pubkey>,
    
    /// Country code (ISO 3166-1 alpha-2, e.g., "NG", "US", "GB")
    /// For regional compliance (HIPAA, NDPR, GDPR)
    pub country_code: String,

    /// Bump seed for PDA
    pub bump: u8,
}

impl Patient {
    /// Space required for Patient account
    pub const LEN: usize = 8 + // discriminator
        32 +                     // authority
        (4 + 64) +             // patient_id_hash (SHA-256 hex = 64 chars)
        (4 + 64) +             // identity_hash (SHA-256 hex = 64 chars)
        (4 + 50) +             // name (String with max 50 chars)
        8 +                     // date_of_birth
        8 +                     // created_at
        8 +                     // updated_at
        8 +                     // record_count
        8 +                     // access_grant_count
        1 +                     // is_active
        (1 + 32) +             // emergency_contact (Option<Pubkey>)
        (4 + 2) +              // country_code (2-char ISO code)
        1;                      // bump

    pub const MAX_NAME_LEN: usize = 50;
    pub const MAX_HASH_LEN: usize = 64;
    pub const MAX_COUNTRY_CODE_LEN: usize = 2;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Role {
    /// The patient themselves
    Patient,
    /// Licensed physician / doctor
    Doctor,
    /// Hospital institution
    Hospital,
    /// Insurance provider
    Insurer,
    /// Emergency responder (paramedic, EMT)
    EmergencyResponder,
    /// Nurse
    Nurse,
    /// Laboratory technician
    LabTechnician,
    /// Pharmacist
    Pharmacist,
    /// Radiologist
    Radiologist,
    /// Specialist (surgeon, cardiologist, etc.)
    Specialist,
    /// Mental health professional
    MentalHealth,
    /// Dentist
    Dentist,
    /// Administrator (hospital admin, records clerk)
    Administrator,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RecordType {
    // === Core Medical Records ===
    /// General medical history, diagnoses, treatments
    GeneralMedical,
    /// Medication prescriptions
    Prescription,
    /// Blood work, urinalysis, biopsy, cultures
    LabResult,
    /// Doctor's consultation notes
    VisitSummary,
    /// Vaccination history
    ImmunizationRecord,
    /// X-ray, MRI, CT scan, ultrasound
    Imaging,
    /// Emergency room records
    Emergency,

    // === Hospital Operations ===
    /// Hospital admission record
    Admission,
    /// Hospital discharge summary
    Discharge,
    /// Surgical procedure report
    Surgery,
    /// Pathology / biopsy report
    Pathology,
    /// Radiology report (interpretation of imaging)
    RadiologyReport,
    /// Vital signs (blood pressure, heart rate, temperature, etc.)
    VitalSigns,
    /// Nursing care notes
    NursingNotes,
    /// Doctor's progress notes
    ProgressNotes,
    /// Procedure report (non-surgical)
    ProcedureReport,
    /// Patient transfer between departments/hospitals
    TransferRecord,
    /// Referral to specialist or another facility
    Referral,

    // === Specialized Care ===
    /// Maternity / obstetric records
    Maternity,
    /// Mental health / psychiatric evaluation
    MentalHealth,
    /// Dental records
    Dental,
    /// Rehabilitation / physical therapy
    Rehabilitation,
    /// Allergy documentation
    Allergy,

    // === Administrative ===
    /// Patient consent forms (signed)
    ConsentForm,
    /// Insurance claim documentation
    InsuranceClaim,
    /// Billing / payment records
    Billing,
    /// Birth certificate / registration
    BirthCertificate,
    /// Death certificate
    DeathCertificate,
}
