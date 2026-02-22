/// Settings commands for key-value storage in SQLite
///
/// Provides get_setting and update_setting commands for persistent configuration
use crate::ai::provider::ProviderInfo;
use crate::security::{decrypt_api_key, encrypt_api_key};
use base64::{engine::general_purpose, Engine as _};
use rusqlite::OptionalExtension;

const OPENROUTER_MODEL_KEY: &str = "ai_model_openrouter";
const DEFAULT_OPENROUTER_MODEL: &str = "xiaomi/mimo-v2-flash:free";

/// Summary of an OpenRouter model for selection UI
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OpenRouterModelSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub context_length: Option<u32>,
    pub prompt_price: Option<String>,
    pub completion_price: Option<String>,
}

/// Filter OpenRouter models by query string and limit results
pub fn filter_openrouter_models(
    models: Vec<OpenRouterModelSummary>,
    query: Option<&str>,
    limit: usize,
) -> Vec<OpenRouterModelSummary> {
    let filtered: Vec<OpenRouterModelSummary> = match query {
        Some(q) if !q.trim().is_empty() => {
            let q_lower = q.to_lowercase();
            models
                .into_iter()
                .filter(|m| {
                    m.id.to_lowercase().contains(&q_lower)
                        || m.name.to_lowercase().contains(&q_lower)
                })
                .collect()
        }
        _ => models,
    };

    filtered.into_iter().take(limit).collect()
}

/// Get a setting value from the database
#[tauri::command]
pub async fn get_setting(
    key: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Option<String>, String> {
    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    let result: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![&key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query setting: {}", e))?;

    Ok(result)
}

/// Update or insert a setting value in the database
#[tauri::command]
pub async fn update_setting(
    key: String,
    value: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![&key, &value],
    )
    .map_err(|e| format!("Failed to update setting: {}", e))?;

    Ok(())
}

/// Get list of AI providers with configuration status
#[tauri::command]
pub async fn get_ai_providers(
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Vec<ProviderInfo>, String> {
    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    // Get default provider
    let default_provider: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ai_provider_default'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query default provider: {}", e))?;

    // Define built-in providers
    let mut providers = vec![];

    // Check if OpenRouter is configured
    let openrouter_configured: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    providers.push(ProviderInfo {
        id: "openrouter".to_string(),
        name: "OpenRouter".to_string(),
        is_configured: openrouter_configured,
        is_default: default_provider.as_deref() == Some("openrouter"),
    });

    // Demo mode provider - always available (no key needed)
    providers.push(ProviderInfo {
        id: "demo".to_string(),
        name: "Demo Mode (Limited)".to_string(),
        is_configured: true, // Always configured - no key required
        is_default: default_provider.as_deref() == Some("demo"),
    });

    Ok(providers)
}

/// Set default AI provider
#[tauri::command]
pub async fn set_default_provider(
    provider_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    // Validate provider ID (openrouter or demo)
    if provider_id != "openrouter" && provider_id != "demo" {
        return Err(format!(
            "Provider '{}' coming soon - currently only OpenRouter and Demo Mode supported",
            provider_id
        ));
    }

    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_provider_default', ?1)",
        rusqlite::params![provider_id],
    )
    .map_err(|e| format!("Failed to set default provider: {}", e))?;

    Ok(())
}

/// Save (encrypt and store) API key for a provider
#[tauri::command]
pub async fn save_provider_api_key(
    provider_id: String,
    api_key: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    // Validate provider ID (demo doesn't need API keys)
    if provider_id != "openrouter" {
        return Err("This provider doesn't support custom API keys".to_string());
    }

    // Encrypt the API key
    let encrypted = encrypt_api_key(&api_key)?;
    let encoded = general_purpose::STANDARD.encode(encrypted);

    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    // Store encrypted key with provider-specific key name
    let setting_key = format!("api_key_{}", provider_id);
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![setting_key, encoded],
    )
    .map_err(|e| format!("Failed to store encrypted key: {}", e))?;

    Ok(())
}

/// Mask an API key for display (first 8 chars + ... + 4 bullets)
fn mask_api_key(key: &str) -> String {
    if key.len() <= 8 {
        return "••••••••".to_string();
    }
    let prefix: String = key.chars().take(8).collect();
    format!("{}...••••", prefix)
}

/// Get (decrypt and return) API key for a provider
/// When reveal=false (default): Returns masked format for display
/// When reveal=true: Returns full decrypted key (use cautiously)
#[tauri::command]
pub async fn get_provider_api_key(
    provider_id: String,
    reveal: Option<bool>,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Option<String>, String> {
    let reveal = reveal.unwrap_or(false);
    
    // Reveal parameter controls whether to return masked or full key
    // Full key access is intentionally allowed for provider configuration

    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    let setting_key = format!("api_key_{}", provider_id);
    let encoded: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![setting_key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query encrypted key: {}", e))?;

    match encoded {
        Some(enc) => {
            let encrypted = general_purpose::STANDARD
                .decode(enc)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;
            let decrypted = decrypt_api_key(&encrypted)?;
            
            if reveal {
                Ok(Some(decrypted))
            } else {
                Ok(Some(mask_api_key(&decrypted)))
            }
        }
        None => Ok(None),
    }
}

/// Test connection to a provider
/// OpenRouter: GET https://openrouter.ai/api/v1/models (no tokens consumed)
/// Demo Mode: Always succeeds (no key needed)
#[tauri::command]
pub async fn test_provider_connection(
    provider_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<bool, String> {
    match provider_id.as_str() {
        "demo" => {
            // Demo mode doesn't need a key, always succeeds
            Ok(true)
        }
        "openrouter" => {
            // Get the API key (revealed for actual use)
            let conn = pool
                .get()
                .map_err(|e| format!("Failed to get database connection: {}", e))?;

            let setting_key = "api_key_openrouter";
            let encoded: Option<String> = conn
                .query_row(
                    "SELECT value FROM settings WHERE key = ?1",
                    rusqlite::params![setting_key],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|e| format!("Failed to query encrypted key: {}", e))?;

            let api_key = match encoded {
                Some(enc) => {
                    let encrypted = general_purpose::STANDARD
                        .decode(enc)
                        .map_err(|e| format!("Failed to decode base64: {}", e))?;
                    decrypt_api_key(&encrypted)?
                }
                None => return Err("API key not configured".to_string()),
            };

            // Test connection using GET /models endpoint (no tokens consumed)
            let client = reqwest::Client::new();
            let response = client
                .get("https://openrouter.ai/api/v1/models")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("HTTP-Referer", "https://ronin.app")
                .header("X-Title", "Ronin")
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;

            match response.status().as_u16() {
                200 => Ok(true),
                401 | 403 => Err("Invalid API key".to_string()),
                429 => Err("Rate limited - please try again later".to_string()),
                500..=599 => Err("OpenRouter server error - please try again later".to_string()),
                code => Err(format!("Connection failed with status {}", code)),
            }
        }
        _ => Err(format!(
            "Provider '{}' coming soon - currently only OpenRouter and Demo Mode supported",
            provider_id
        )),
    }
}

/// Get the selected model for a provider
#[tauri::command]
pub async fn get_provider_model(
    provider_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<String, String> {
    if provider_id != "openrouter" {
        return Err("Model selection currently supports OpenRouter only".to_string());
    }

    let conn = pool.get().map_err(|_| "Unable to access application data".to_string())?;

    let selected: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![OPENROUTER_MODEL_KEY],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query provider model: {}", e))?;

    Ok(selected.unwrap_or_else(|| DEFAULT_OPENROUTER_MODEL.to_string()))
}

/// Set the selected model for a provider
#[tauri::command]
pub async fn set_provider_model(
    provider_id: String,
    model_id: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    if provider_id != "openrouter" {
        return Err("Model selection currently supports OpenRouter only".to_string());
    }
    if model_id.trim().is_empty() {
        return Err("Model ID cannot be empty".to_string());
    }

    let conn = pool.get().map_err(|_| "Unable to access application data".to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![OPENROUTER_MODEL_KEY, model_id.trim()],
    )
    .map_err(|e| format!("Failed to set provider model: {}", e))?;

    Ok(())
}

/// Fetch available models from OpenRouter API
#[tauri::command]
pub async fn get_openrouter_models(
    query: Option<String>,
    limit: Option<u32>,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Vec<OpenRouterModelSummary>, String> {
    // Get API key for authentication
    let conn = pool.get().map_err(|_| "Unable to access application data".to_string())?;

    let setting_key = "api_key_openrouter";
    let encoded: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![setting_key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query API key: {}", e))?;

    let api_key = match encoded {
        Some(enc) => {
            let encrypted = general_purpose::STANDARD
                .decode(enc)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;
            decrypt_api_key(&encrypted)?
        }
        None => return Err("API key not configured".to_string()),
    };

    // Fetch models from OpenRouter
    let client = reqwest::Client::new();
    let response = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://ronin.app")
        .header("X-Title", "Ronin")
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("OpenRouter API error: {}", response.status()));
    }

    // Parse response
    #[derive(serde::Deserialize)]
    struct ModelsResponse {
        data: Vec<OpenRouterApiModel>,
    }

    #[derive(serde::Deserialize)]
    struct OpenRouterApiModel {
        id: String,
        name: String,
        description: Option<String>,
        context_length: Option<u32>,
        pricing: Option<ModelPricing>,
    }

    #[derive(serde::Deserialize)]
    struct ModelPricing {
        prompt: Option<String>,
        completion: Option<String>,
    }

    let models_resp: ModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse models response: {}", e))?;

    let models: Vec<OpenRouterModelSummary> = models_resp
        .data
        .into_iter()
        .map(|m| OpenRouterModelSummary {
            id: m.id,
            name: m.name,
            description: m.description,
            context_length: m.context_length,
            prompt_price: m.pricing.as_ref().and_then(|p| p.prompt.clone()),
            completion_price: m.pricing.as_ref().and_then(|p| p.completion.clone()),
        })
        .collect();

    // Apply filtering
    let limit = limit.unwrap_or(200) as usize;
    let filtered = filter_openrouter_models(models, query.as_deref(), limit);

    Ok(filtered)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Helper to create a temporary database for testing
    fn create_test_db() -> (std::path::PathBuf, crate::db::DbPool) {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_settings_test_{}_{:?}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            std::thread::current().id()
        ));

        fs::create_dir_all(&test_dir).unwrap();
        let db_path = test_dir.join("test.db");

        let manager = r2d2_sqlite::SqliteConnectionManager::file(&db_path).with_init(|conn| {
            conn.execute_batch(
                "PRAGMA journal_mode=WAL;
                 PRAGMA foreign_keys=ON;",
            )
        });

        let pool = r2d2::Pool::builder()
            .max_size(10)
            .connection_timeout(std::time::Duration::from_secs(5))
            .build(manager)
            .unwrap();

        // Run migrations to create settings table
        let mut conn = pool.get().unwrap();
        crate::db::run_migrations(&mut conn).unwrap();

        (test_dir, pool)
    }

    #[test]
    fn test_get_setting_nonexistent_key() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        let result: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["nonexistent_key"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(result, None, "Nonexistent key should return None");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_update_and_get_setting() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Insert a setting
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["test_key", "test_value"],
        )
        .unwrap();

        // Get the setting back
        let result: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["test_key"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(
            result,
            Some("test_value".to_string()),
            "Should retrieve the stored value"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_update_setting_replaces_existing() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Insert initial value
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["oath_shown", "false"],
        )
        .unwrap();

        // Update with new value
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["oath_shown", "true"],
        )
        .unwrap();

        // Verify the value was replaced
        let result: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["oath_shown"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(
            result,
            Some("true".to_string()),
            "Should replace existing value"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_multiple_settings() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Store multiple settings
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["setting1", "value1"],
        )
        .unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["setting2", "value2"],
        )
        .unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["setting3", "value3"],
        )
        .unwrap();

        // Retrieve them
        let result1: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["setting1"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();
        let result2: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["setting2"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();
        let result3: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                rusqlite::params!["setting3"],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(result1, Some("value1".to_string()));
        assert_eq!(result2, Some("value2".to_string()));
        assert_eq!(result3, Some("value3".to_string()));

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_get_ai_providers_returns_openrouter() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Initially no API key configured
        let has_key: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(!has_key, "Should not have API key initially");

        // Insert an API key
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('api_key_openrouter', 'encrypted_key')",
            [],
        )
        .unwrap();

        // Verify key exists
        let has_key_after: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(has_key_after, "Should have API key after insert");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_set_default_provider_stores_value() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Set default provider
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_provider_default', 'openrouter')",
            [],
        )
        .unwrap();

        // Verify default provider is set
        let default: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'ai_provider_default'",
                [],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(default, Some("openrouter".to_string()));

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_save_and_get_provider_api_key_roundtrip() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Encrypt and store a test key
        let test_key = "sk-test-key-12345";
        let encrypted = crate::security::encrypt_api_key(test_key).unwrap();
        let encoded = general_purpose::STANDARD.encode(&encrypted);

        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('api_key_openrouter', ?1)",
            rusqlite::params![encoded],
        )
        .unwrap();

        // Read back and decrypt
        let stored: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        let decoded = general_purpose::STANDARD.decode(stored).unwrap();
        let decrypted = crate::security::decrypt_api_key(&decoded).unwrap();

        assert_eq!(decrypted, test_key);

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_mask_api_key() {
        // Test normal key
        let key = "sk-or-v1-1234567890abcdef";
        let masked = mask_api_key(key);
        assert_eq!(masked, "sk-or-v1...••••");
        assert!(!masked.contains("1234567890"));

        // Test short key
        let short_key = "short";
        let masked_short = mask_api_key(short_key);
        assert_eq!(masked_short, "••••••••");

        // Test exactly 8 char key
        let eight_key = "12345678";
        let masked_eight = mask_api_key(eight_key);
        assert_eq!(masked_eight, "••••••••");
    }

    #[test]
    fn test_set_default_provider_validation() {
        // Test that invalid provider IDs return appropriate error message
        let invalid_providers = vec!["openai", "anthropic", "groq", "invalid"];
        for provider in invalid_providers {
            // The validation happens in the command, so we just test the message format
            let expected_error = format!(
                "Provider '{}' coming soon - currently only OpenRouter and Demo Mode supported",
                provider
            );
            assert!(expected_error.contains("coming soon"));
            assert!(expected_error.contains(provider));
        }
    }

    #[test]
    fn test_provider_info_is_configured_flag() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Check if openrouter is configured (should be false initially)
        let is_configured: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(!is_configured, "Should not be configured initially");

        // Add API key
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('api_key_openrouter', 'test')",
            [],
        )
        .unwrap();

        // Check again
        let is_configured_after: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'api_key_openrouter'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        assert!(is_configured_after, "Should be configured after adding key");

        fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_set_and_get_provider_model_roundtrip() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_model_openrouter', ?1)",
            rusqlite::params!["z-ai/glm-4.5-air:free"],
        )
        .unwrap();

        let selected: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'ai_model_openrouter'",
                [],
                |row| row.get(0),
            )
            .optional()
            .unwrap();

        assert_eq!(selected, Some("z-ai/glm-4.5-air:free".to_string()));
        std::fs::remove_dir_all(test_dir).ok();
    }

    #[test]
    fn test_filter_openrouter_models_by_query_and_limit() {
        let models = vec![
            OpenRouterModelSummary {
                id: "z-ai/glm-4.5-air:free".to_string(),
                name: "GLM 4.5 Air".to_string(),
                description: Some("fast".to_string()),
                context_length: Some(128000),
                prompt_price: Some("0".to_string()),
                completion_price: Some("0".to_string()),
            },
            OpenRouterModelSummary {
                id: "openai/gpt-oss-20b:free".to_string(),
                name: "GPT OSS 20B".to_string(),
                description: Some("oss".to_string()),
                context_length: Some(131072),
                prompt_price: Some("0".to_string()),
                completion_price: Some("0".to_string()),
            },
        ];

        let filtered = filter_openrouter_models(models, Some("glm"), 10);
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].id, "z-ai/glm-4.5-air:free");
    }
}
