use anchor_lang::prelude::*;

/// Check if an access grant has expired
pub fn is_grant_expired(expires_at: Option<i64>, current_time: i64) -> bool {
    if let Some(expiration) = expires_at {
        current_time > expiration
    } else {
        false
    }
}

/// Check if a timestamp is valid (not in the future)
pub fn is_valid_timestamp(timestamp: i64, current_time: i64) -> bool {
    timestamp <= current_time
}

/// Generate a unique seed for PDAs
pub fn generate_seed(prefix: &str, key: &Pubkey) -> Vec<u8> {
    let mut seed = prefix.as_bytes().to_vec();
    seed.extend_from_slice(key.as_ref());
    seed
}

/// Validate string length
pub fn validate_string_length(s: &str, max_length: usize) -> bool {
    s.len() <= max_length
}
