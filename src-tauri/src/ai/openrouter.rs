use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::Emitter;

/// Attribution data for AI context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attribution {
    pub commits: usize,
    pub files: usize,
    pub sources: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub devlog_lines: Option<usize>,
}

// DEPRECATED: Old implementation, kept for backward compatibility during migration
// TODO: Remove in Story 4.26 (Provider Migration Cleanup)
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
}

#[allow(dead_code)]
pub struct OpenRouterClient {
    api_key: String,
    client: reqwest::Client,
}

// DEPRECATED: Old implementation methods
#[allow(dead_code)]
impl OpenRouterClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
        }
    }

    /// Get available model with fallback logic
    #[allow(dead_code)]
    pub fn get_available_model() -> String {
        // Default model as specified in story
        "xiaomi/mimo-v2-flash:free".to_string()
    }

    /// Stream chat completion from OpenRouter with event emission
    /// Returns the full accumulated text on success for caching
    pub async fn chat_stream(
        &self,
        messages: Vec<Message>,
        window: tauri::Window,
        attribution: Attribution,
    ) -> Result<String, String> {
        let models = vec![
            "xiaomi/mimo-v2-flash:free",
            "z-ai/glm-4.5-air:free",
            "openai/gpt-oss-20b:free",
        ];

        let mut last_error = String::new();

        for model in models {
            let request = ChatRequest {
                model: model.to_string(),
                messages: messages.clone(),
                stream: true,
            };

            let response = self
                .client
                .post("https://openrouter.ai/api/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("HTTP-Referer", "https://github.com/rfxlamia/ronin")
                .header("X-Title", "Ronin")
                .json(&request)
                .timeout(Duration::from_secs(30))
                .send()
                .await;

            match response {
                Ok(resp) => {
                    let status = resp.status();

                    if status == 404 {
                        last_error = format!("Model {} not found, trying next...", model);
                        continue;
                    }

                    if status == 429 {
                        // Parse Retry-After header for accurate countdown
                        let retry_after = resp
                            .headers()
                            .get("retry-after")
                            .and_then(|v| v.to_str().ok())
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(30);

                        let error_msg = format!("RATELIMIT:{}:AI resting", retry_after);
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

                    if status == 401 {
                        let error_msg = "APIERROR:401:API key invalid. Check settings.".to_string();
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

                    if !status.is_success() {
                        // Map 5xx/4xx status codes to APIERROR prefix
                        let error_msg = format!("APIERROR:{}:Server error", status.as_u16());
                        last_error = error_msg;
                        continue;
                    }

                    // Process SSE stream
                    let mut stream = resp.bytes_stream().eventsource();
                    let mut full_text = String::new();

                    while let Some(event) = stream.next().await {
                        match event {
                            Ok(event) => {
                                if event.data == "[DONE]" {
                                    break;
                                }

                                #[derive(Deserialize)]
                                struct StreamChunk {
                                    choices: Vec<StreamChoice>,
                                }

                                #[derive(Deserialize)]
                                struct StreamChoice {
                                    delta: Delta,
                                }

                                #[derive(Deserialize)]
                                struct Delta {
                                    content: Option<String>,
                                }

                                if let Ok(chunk) = serde_json::from_str::<StreamChunk>(&event.data)
                                {
                                    if let Some(choice) = chunk.choices.first() {
                                        if let Some(content) = &choice.delta.content {
                                            full_text.push_str(content);

                                            window
                                                .emit(
                                                    "ai-chunk",
                                                    serde_json::json!({
                                                        "text": content
                                                    }),
                                                )
                                                .map_err(|e| e.to_string())?;
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                window
                                    .emit(
                                        "ai-error",
                                        serde_json::json!({
                                            "message": "Stream error. Retrying..."
                                        }),
                                    )
                                    .map_err(|e| e.to_string())?;
                                return Err(format!("Stream error: {}", e));
                            }
                        }
                    }

                    // Emit completion with actual attribution data
                    window
                        .emit(
                            "ai-complete",
                            serde_json::json!({
                                "text": full_text,
                                "attribution": attribution
                            }),
                        )
                        .map_err(|e| e.to_string())?;

                    return Ok(full_text);
                }
                Err(e) => {
                    // Detect network/connection errors
                    if e.is_connect() || e.is_timeout() {
                        last_error = "OFFLINE:No network connection".to_string();
                    } else {
                        last_error = format!("APIERROR:0:{}", e);
                    }
                    continue;
                }
            }
        }

        // All models failed - emit the classified error
        window
            .emit(
                "ai-error",
                serde_json::json!({
                    "message": last_error.clone()
                }),
            )
            .map_err(|e| e.to_string())?;

        Err(last_error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = OpenRouterClient::new("test-key".to_string());
        assert_eq!(client.api_key, "test-key");
    }

    #[test]
    fn test_default_model() {
        let model = OpenRouterClient::get_available_model();
        assert_eq!(model, "xiaomi/mimo-v2-flash:free");
    }

    #[test]
    fn test_attribution_serialization() {
        let attribution = Attribution {
            commits: 15,
            files: 3,
            sources: vec!["git".to_string()],
            devlog_lines: None,
        };

        let json = serde_json::to_string(&attribution).expect("Should serialize");
        assert!(json.contains("\"commits\":15"));
        assert!(json.contains("\"files\":3"));
        assert!(json.contains("\"sources\":[\"git\"]"));
        // devlog_lines should be skipped when None
        assert!(!json.contains("devlog_lines"));
    }

    #[test]
    fn test_attribution_with_devlog() {
        let attribution = Attribution {
            commits: 15,
            files: 3,
            sources: vec!["git".to_string(), "devlog".to_string()],
            devlog_lines: Some(250),
        };

        let json = serde_json::to_string(&attribution).expect("Should serialize");
        assert!(json.contains("\"devlog_lines\":250"));
        assert!(json.contains("\"devlog\""));
    }

    #[test]
    fn test_attribution_deserialization() {
        let json = r#"{"commits":10,"files":5,"sources":["git","devlog"],"devlog_lines":100}"#;
        let attribution: Attribution = serde_json::from_str(json).expect("Should deserialize");

        assert_eq!(attribution.commits, 10);
        assert_eq!(attribution.files, 5);
        assert_eq!(attribution.sources, vec!["git", "devlog"]);
        assert_eq!(attribution.devlog_lines, Some(100));
    }

    #[test]
    fn test_attribution_empty_sources() {
        let attribution = Attribution {
            commits: 0,
            files: 0,
            sources: vec![],
            devlog_lines: None,
        };

        let json = serde_json::to_string(&attribution).expect("Should serialize");
        let parsed: Attribution = serde_json::from_str(&json).expect("Should deserialize");

        assert_eq!(parsed.commits, 0);
        assert_eq!(parsed.files, 0);
        assert!(parsed.sources.is_empty());
    }

    // Error classification tests
    #[test]
    fn test_offline_error_format() {
        let error = "OFFLINE:No network connection";
        assert!(error.starts_with("OFFLINE:"));
        let message = error.strip_prefix("OFFLINE:").unwrap();
        assert_eq!(message, "No network connection");
    }

    #[test]
    fn test_ratelimit_error_format() {
        let error = "RATELIMIT:30:AI resting";
        assert!(error.starts_with("RATELIMIT:"));
        let parts: Vec<&str> = error.splitn(3, ':').collect();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "RATELIMIT");
        assert_eq!(parts[1].parse::<u64>().unwrap(), 30);
        assert_eq!(parts[2], "AI resting");
    }

    #[test]
    fn test_apierror_format() {
        let error = "APIERROR:500:Server error";
        assert!(error.starts_with("APIERROR:"));
        let parts: Vec<&str> = error.splitn(3, ':').collect();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "APIERROR");
        assert_eq!(parts[1].parse::<u16>().unwrap(), 500);
        assert_eq!(parts[2], "Server error");
    }

    #[test]
    fn test_apierror_401_format() {
        let error = "APIERROR:401:API key invalid. Check settings.";
        assert!(error.starts_with("APIERROR:"));
        let parts: Vec<&str> = error.splitn(3, ':').collect();
        assert_eq!(parts[1].parse::<u16>().unwrap(), 401);
    }
}
