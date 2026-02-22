/// AI-related Tauri commands for OpenRouter API integration
use crate::ai::context::{
    build_git_context, build_system_prompt, enforce_token_budget, validate_payload_size,
};
use crate::ai::openrouter::Attribution;
use crate::ai::provider::{AiProvider, ContextPayload};
use crate::ai::providers::{DemoProvider, OpenRouterProvider};
use crate::commands::git::get_git_context;
// Note: get_provider_api_key is called directly from db, not via command
// since we need to pass reveal=true internally
use crate::context::devlog::read_devlog;
use crate::security::{decrypt_api_key, encrypt_api_key};
use base64::{engine::general_purpose, Engine as _};
use futures_util::StreamExt;
use rusqlite::OptionalExtension;
use tauri::Emitter;

/// Set (encrypt and store) API key
///
/// BACKWARD COMPATIBILITY: Stores in new location (api_key_openrouter) and cleans up old key if it exists
#[tauri::command]
pub async fn set_api_key(
    key: String,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    // Encrypt the key
    let encrypted = encrypt_api_key(&key)?;
    let encoded = general_purpose::STANDARD.encode(encrypted);

    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    // Store in new multi-provider format (Story 4.25-1)
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('api_key_openrouter', ?1)",
        rusqlite::params![encoded],
    )
    .map_err(|e| format!("Failed to store encrypted key: {}", e))?;

    // Set default provider to OpenRouter
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_provider_default', 'openrouter')",
        [],
    )
    .map_err(|e| format!("Failed to set default provider: {}", e))?;

    // Clean up old key if it exists (migration cleanup)
    conn.execute(
        "DELETE FROM settings WHERE key = 'openrouter_api_key_encrypted'",
        [],
    )
    .ok(); // Ignore errors if old key doesn't exist

    Ok(())
}

/// Get (decrypt and return) API key
///
/// BACKWARD COMPATIBILITY: Checks both new (api_key_openrouter) and old (openrouter_api_key_encrypted) locations
#[tauri::command]
pub async fn get_api_key(
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<Option<String>, String> {
    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    // Try new location first (after Story 4.25-1 migration)
    let new_key: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'api_key_openrouter'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query new API key: {}", e))?;

    if let Some(enc) = new_key {
        let encrypted = general_purpose::STANDARD
            .decode(enc)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;
        let decrypted = decrypt_api_key(&encrypted)?;
        return Ok(Some(decrypted));
    }

    // Fall back to old location (pre-migration)
    let old_key: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'openrouter_api_key_encrypted'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query old API key: {}", e))?;

    match old_key {
        Some(enc) => {
            let encrypted = general_purpose::STANDARD
                .decode(enc)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;
            let decrypted = decrypt_api_key(&encrypted)?;
            Ok(Some(decrypted))
        }
        None => Ok(None),
    }
}

/// Delete API key from database
#[tauri::command]
pub async fn delete_api_key(pool: tauri::State<'_, crate::db::DbPool>) -> Result<(), String> {
    let conn = pool
        .get()
        .map_err(|_| "Unable to access application data".to_string())?;

    conn.execute(
        "DELETE FROM settings WHERE key = 'openrouter_api_key_encrypted'",
        [],
    )
    .map_err(|e| format!("Failed to delete API key: {}", e))?;

    Ok(())
}

/// Test API connection to OpenRouter
#[tauri::command]
pub async fn test_api_connection(api_key: String) -> Result<bool, String> {
    let client = reqwest::Client::new();

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://ronin.app")
        .header("X-Title", "Ronin")
        .json(&serde_json::json!({
            "model": "xiaomi/mimo-v2-flash:free",
            "messages": [{"role": "user", "content": "test"}],
            "max_tokens": 1
        }))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    match response.status().as_u16() {
        200 => Ok(true),
        401 => Ok(false),
        429 => Err(
            "AI service temporarily rate-limited. Please try again in a few moments.".to_string(),
        ),
        500..=599 => Err("OpenRouter server error. Please try again later.".to_string()),
        code => Err(format!(
            "Connection failed with status {}. Please check your network or try again.",
            code
        )),
    }
}

/// Generate AI context for a project
#[tauri::command]
pub async fn generate_context(
    project_id: i64,
    window: tauri::Window,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    // Get project path
    let conn = pool
        .get()
        .map_err(|e| format!("Database connection failed: {}", e))?;

    let (project_path, project_name): (String, String) = conn
        .query_row(
            "SELECT path, name FROM projects WHERE id = ?1",
            rusqlite::params![project_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Project not found: {}", e))?;

    // Get Git context
    let git_context = match get_git_context(project_path.clone()).await {
        Ok(ctx) => ctx,
        Err(_e) => {
            let error_msg = "Unable to access project repository".to_string();
            window
                .emit(
                    "ai-error",
                    serde_json::json!({
                        "message": error_msg.clone()
                    }),
                )
                .map_err(|e| e.to_string())?;
            return Err(error_msg);
        }
    };

    // Build context strings
    let git_context_str = build_git_context(&git_context);

    // Read DEVLOG if available (Story 3.7)
    let project_path_ref = std::path::Path::new(&project_path);
    let devlog = read_devlog(project_path_ref);

    // Enforce token budget: truncate DEVLOG if combined > 10KB
    let devlog = enforce_token_budget(&git_context_str, devlog);

    // Fetch behavior context from aggregator (Epic 6 - Story 6.4)
    let behavior_context = {
        let db_clone = pool.inner().clone();
        let path_clone = project_path.clone();
        let name_clone = project_name.clone();

        match crate::aggregator::aggregate_context(
            project_id,
            std::path::PathBuf::from(path_clone),
            name_clone,
            db_clone,
        )
        .await
        {
            Ok(aggregated) => Some(crate::ai::context::BehaviorContext {
                ai_sessions: aggregated.behavior.ai_sessions,
                patterns: aggregated.behavior.patterns,
                stuck_detected: aggregated.behavior.stuck_detected,
                last_active_file: aggregated.behavior.last_active_file,
            }),
            Err(e) => {
                // Log error but continue without behavior data (graceful degradation)
                eprintln!("[ai-context] Failed to aggregate behavior context: {}", e);
                None
            }
        }
    };

    // Build system prompt with Git context, optional DEVLOG, and behavior
    let system_prompt =
        build_system_prompt(&git_context_str, devlog.as_ref(), behavior_context.as_ref());

    // Validate payload size
    if let Err(_e) = validate_payload_size(&system_prompt) {
        let error_msg = "Project context is too large to process".to_string();
        window
            .emit(
                "ai-error",
                serde_json::json!({
                    "message": error_msg.clone()
                }),
            )
            .map_err(|e| e.to_string())?;
        return Err(error_msg);
    }

    // Get default provider
    let default_provider: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ai_provider_default'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query default provider: {}", e))?
        .unwrap_or_else(|| "openrouter".to_string());

    // Get selected OpenRouter model (if provider is openrouter)
    let selected_openrouter_model: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ai_model_openrouter'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query selected model: {}", e))?;

    // Get API key for the provider (demo mode doesn't need one)
    let api_key = if default_provider == "demo" {
        None
    } else {
        // Get decrypted key directly from database (internal use with reveal=true)
        let setting_key = format!("api_key_{}", default_provider);
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
                    .decode(&enc)
                    .map_err(|e| format!("Failed to decode base64: {}", e))?;
                let decrypted = decrypt_api_key(&encrypted)?;
                Some(decrypted)
            }
            None => {
                let error_msg = "Please configure your API key in settings".to_string();
                window
                    .emit(
                        "ai-error",
                        serde_json::json!({
                            "message": error_msg.clone()
                        }),
                    )
                    .map_err(|e| e.to_string())?;
                return Err(error_msg);
            }
        }
    };

    // Build attribution data from git context, DEVLOG, and behavior
    let commit_count = git_context.commits.len();
    let file_count = git_context.status.uncommitted_files as usize;
    let has_devlog = devlog.is_some();
    let devlog_lines = devlog.as_ref().map(|d| d.lines_read);

    let mut sources = vec!["git".to_string()];
    if has_devlog {
        sources.push("devlog".to_string());
    }

    // Add behavior source if we have AI sessions (Epic 6)
    let ai_sessions = behavior_context.as_ref().map(|b| b.ai_sessions);
    if ai_sessions.map(|s| s > 0).unwrap_or(false) {
        sources.push("behavior".to_string());
    }

    let attribution = Attribution {
        commits: commit_count,
        files: file_count,
        sources,
        devlog_lines,
        ai_sessions,
    };

    // Create provider instance
    let provider: Box<dyn AiProvider> = match default_provider.as_str() {
        "openrouter" => {
            let key = api_key.ok_or("API key required for OpenRouter")?;
            Box::new(OpenRouterProvider::new(key, selected_openrouter_model))
        }
        "demo" => {
            // Lambda URL from compile-time config
            // TODO: Set DEMO_LAMBDA_URL environment variable during build
            let lambda_url = option_env!("DEMO_LAMBDA_URL")
                .unwrap_or(
                    "https://dkm5aeebsg7dggdpwoovlbzjde0ayxyh.lambda-url.ap-southeast-2.on.aws/",
                )
                .to_string();
            Box::new(DemoProvider::new(lambda_url))
        }
        _ => {
            let error_msg = "AI provider is not available".to_string();
            window
                .emit(
                    "ai-error",
                    serde_json::json!({
                        "message": error_msg.clone()
                    }),
                )
                .map_err(|e| e.to_string())?;
            return Err(error_msg);
        }
    };

    // Create context payload
    let payload = ContextPayload {
        system_prompt,
        user_message: "Provide context about where I was in this project".to_string(),
        attribution: attribution.clone(),
    };

    // Stream the response using provider abstraction
    match provider.stream_context(payload).await {
        Ok(mut stream) => {
            let mut full_text = String::new();

            while let Some(chunk) = stream.next().await {
                full_text.push_str(&chunk);

                // Emit chunk with provider ID (backward compatible)
                window
                    .emit(
                        "ai-chunk",
                        serde_json::json!({
                            "text": chunk,
                            "provider": provider.id()
                        }),
                    )
                    .map_err(|e| e.to_string())?;
            }

            // Emit completion with attribution including provider name
            window
                .emit(
                    "ai-complete",
                    serde_json::json!({
                        "text": full_text,
                        "attribution": attribution,
                        "provider": provider.name()
                    }),
                )
                .map_err(|e| e.to_string())?;

            // Cache the context text for offline fallback
            let attribution_json = serde_json::json!({
                "commits": commit_count,
                "files": file_count,
                "sources": attribution.sources,
                "devlogLines": devlog_lines
            })
            .to_string();

            let timestamp = chrono::Utc::now().timestamp();

            conn.execute(
                "INSERT OR REPLACE INTO ai_cache (project_id, context_text, attribution_json, generated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![project_id, full_text, attribution_json, timestamp],
            )
            .map_err(|e| format!("Cache write failed: {}", e))?;

            Ok(())
        }
        Err(e) => {
            // Emit error event with provider info
            window
                .emit("ai-inference-failed", e.to_event(provider.id().as_ref()))
                .map_err(|e| e.to_string())?;

            // Try to load from cache on error (offline fallback)
            let cached: Result<(String, String), _> = conn.query_row(
                "SELECT context_text, attribution_json FROM ai_cache WHERE project_id = ?1",
                rusqlite::params![project_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            );

            if let Ok((text, attr)) = cached {
                window
                    .emit(
                        "ai-complete",
                        serde_json::json!({
                            "text": text,
                            "attribution": serde_json::from_str::<serde_json::Value>(&attr).unwrap_or(serde_json::json!({})),
                            "cached": true
                        }),
                    )
                    .map_err(|e| e.to_string())?;
                Ok(())
            } else {
                Err(e.to_string())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Helper to create a temporary database for testing
    fn create_test_db() -> (std::path::PathBuf, crate::db::DbPool) {
        let test_dir = std::env::temp_dir().join(format!(
            "ronin_ai_test_{}_{:?}",
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

    #[tokio::test]
    async fn test_encrypt_and_store_api_key() {
        let (test_dir, pool) = create_test_db();
        let test_key = "sk-or-v1-test-1234567890abcdef";

        // Encrypt the key (simulating what set_api_key does)
        let encrypted = encrypt_api_key(test_key).expect("Should encrypt");
        let encoded = general_purpose::STANDARD.encode(encrypted);

        // Store directly in database
        let conn = pool.get().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('openrouter_api_key_encrypted', ?1)",
            rusqlite::params![encoded],
        )
        .unwrap();

        // Read back and decrypt (simulating what get_api_key does)
        let stored: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'openrouter_api_key_encrypted'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        let decoded = general_purpose::STANDARD.decode(stored).unwrap();
        let decrypted = decrypt_api_key(&decoded).unwrap();

        assert_eq!(decrypted, test_key);

        fs::remove_dir_all(test_dir).ok();
    }

    #[tokio::test]
    async fn test_migration_from_plaintext() {
        let (test_dir, pool) = create_test_db();
        let conn = pool.get().unwrap();

        // Insert plaintext key (simulating old version)
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('openrouter_api_key', ?1)",
            rusqlite::params!["sk-or-v1-plaintext-key"],
        )
        .unwrap();

        // Check migration logic would trigger
        let plaintext_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'openrouter_api_key'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert!(
            plaintext_exists,
            "Plaintext key should exist before migration"
        );

        // Simulate migration (delete plaintext)
        conn.execute("DELETE FROM settings WHERE key = 'openrouter_api_key'", [])
            .unwrap();

        // Verify plaintext key is gone
        let plaintext_still_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM settings WHERE key = 'openrouter_api_key'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert!(
            !plaintext_still_exists,
            "Plaintext key should be deleted after migration"
        );

        fs::remove_dir_all(test_dir).ok();
    }

    #[tokio::test]
    async fn test_encrypted_key_not_plaintext() {
        let original = "sk-or-v1-secret-key-123";
        let encrypted = encrypt_api_key(original).unwrap();
        let encoded = general_purpose::STANDARD.encode(&encrypted);

        // Encrypted Base64 should NOT contain the plaintext
        assert!(
            !encoded.contains("sk-or-v1"),
            "Encrypted value should not contain plaintext fragments"
        );
        assert!(
            !encoded.contains("secret"),
            "Encrypted value should not contain plaintext fragments"
        );
    }
}
