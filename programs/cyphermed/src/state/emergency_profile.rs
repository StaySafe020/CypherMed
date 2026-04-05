use anchor_lang::prelude::*;

/// Emergency Profile - critical medical info accessible during emergencies
/// This is the data first responders see during break-glass access
#[account]
pub struct EmergencyProfile {
    /// Patient who owns this profile
    pub patient: Pubkey,

    /// Blood type (e.g., "A+", "O-", "AB+")
    pub blood_type: Option<String>,

    /// Known allergies (comma-separated, e.g., "Penicillin, Latex, Peanuts")
    pub allergies: Option<String>,

    /// Current medications (comma-separated)
    pub current_medications: Option<String>,

    /// Chronic conditions (comma-separated, e.g., "Diabetes Type 2, Asthma")
    pub chronic_conditions: Option<String>,

    /// Emergency instructions (e.g., "Patient has pacemaker - no MRI")
    pub emergency_instructions: Option<String>,

    /// Organ donor status
    pub is_organ_donor: bool,

    /// DNR (Do Not Resuscitate) status
    pub dnr_status: bool,

    /// Primary physician wallet (for emergency contact)
    pub primary_physician: Option<Pubkey>,

    /// Insurance provider info hash (points to off-chain data)
    pub insurance_info_hash: Option<String>,

    /// Last updated timestamp
    pub updated_at: i64,

    /// Bump seed for PDA
    pub bump: u8,
}

impl EmergencyProfile {
    pub const LEN: usize = 8 +  // discriminator
        32 +                      // patient
        (1 + 4 + 10) +           // blood_type (Option<String> max 10)
        (1 + 4 + 200) +          // allergies (Option<String> max 200)
        (1 + 4 + 200) +          // current_medications (Option<String> max 200)
        (1 + 4 + 200) +          // chronic_conditions (Option<String> max 200)
        (1 + 4 + 300) +          // emergency_instructions (Option<String> max 300)
        1 +                       // is_organ_donor
        1 +                       // dnr_status
        (1 + 32) +               // primary_physician (Option<Pubkey>)
        (1 + 4 + 64) +           // insurance_info_hash (Option<String> max 64)
        8 +                       // updated_at
        1;                        // bump

    pub const MAX_BLOOD_TYPE_LEN: usize = 10;
    pub const MAX_ALLERGIES_LEN: usize = 200;
    pub const MAX_MEDICATIONS_LEN: usize = 200;
    pub const MAX_CONDITIONS_LEN: usize = 200;
    pub const MAX_INSTRUCTIONS_LEN: usize = 300;
    pub const MAX_INSURANCE_HASH_LEN: usize = 64;
}

/// Emergency severity classification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EmergencySeverity {
    /// Life-threatening - immediate access required
    Critical,
    /// Serious but not immediately life-threatening
    Urgent,
    /// Standard emergency - can wait briefly
    Standard,
}
