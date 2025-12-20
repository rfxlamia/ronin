/// Security utilities for API key encryption
///
/// Provides AES-256-GCM encryption for secure storage of OpenRouter API keys
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use rand::Rng;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

/// Get or create encryption key file
pub fn get_or_create_key() -> Result<[u8; 32], String> {
    let app_data_dir = dirs::data_dir().ok_or("Failed to get app data directory")?;
    let key_dir = app_data_dir.join("ronin");
    let key_path = key_dir.join("secret.key");

    if key_path.exists() {
        // Load existing key
        let bytes =
            fs::read(&key_path).map_err(|e| format!("Failed to read encryption key: {}", e))?;
        if bytes.len() != 32 {
            return Err("Invalid key file size".to_string());
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&bytes);
        Ok(key)
    } else {
        // Generate new key
        fs::create_dir_all(&key_dir)
            .map_err(|e| format!("Failed to create key directory: {}", e))?;

        let key: [u8; 32] = rand::thread_rng().gen();

        // Write key file
        let mut file =
            fs::File::create(&key_path).map_err(|e| format!("Failed to create key file: {}", e))?;
        file.write_all(&key)
            .map_err(|e| format!("Failed to write key: {}", e))?;

        // Set permissions to 0600 (owner read/write only)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = fs::Permissions::from_mode(0o600);
            fs::set_permissions(&key_path, permissions)
                .map_err(|e| format!("Failed to set key file permissions: {}", e))?;
        }

        Ok(key)
    }
}

/// Encrypt API key using AES-256-GCM
pub fn encrypt_api_key(key: &str) -> Result<Vec<u8>, String> {
    let encryption_key = get_or_create_key()?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&encryption_key));

    // Generate random nonce
    let nonce_bytes: [u8; 12] = rand::thread_rng().gen();
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt
    let ciphertext = cipher
        .encrypt(nonce, key.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Decrypt API key using AES-256-GCM
pub fn decrypt_api_key(encrypted: &[u8]) -> Result<String, String> {
    if encrypted.len() < 12 {
        return Err("Invalid encrypted data".to_string());
    }

    let encryption_key = get_or_create_key()?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&encryption_key));

    // Extract nonce and ciphertext
    let (nonce_bytes, ciphertext) = encrypted.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    // Decrypt
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let original = "sk-or-v1-test-key-1234567890abcdef";
        let encrypted = encrypt_api_key(original).expect("Encryption should succeed");
        let decrypted = decrypt_api_key(&encrypted).expect("Decryption should succeed");
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_key_persists() {
        let key1 = get_or_create_key().expect("Should create/get key");
        let key2 = get_or_create_key().expect("Should get same key");
        assert_eq!(key1, key2, "Key should persist across calls");
    }

    #[test]
    fn test_invalid_encrypted_data() {
        let short_data = vec![1, 2, 3]; // Too short
        let result = decrypt_api_key(&short_data);
        assert!(result.is_err(), "Should reject invalid encrypted data");
    }

    #[test]
    fn test_different_plaintexts_different_ciphertexts() {
        let key1 = "sk-or-v1-first-key";
        let key2 = "sk-or-v1-second-key";

        let encrypted1 = encrypt_api_key(key1).expect("Encryption 1 should succeed");
        let encrypted2 = encrypt_api_key(key2).expect("Encryption 2 should succeed");

        assert_ne!(
            encrypted1, encrypted2,
            "Different keys should have different ciphertexts"
        );
    }
}
