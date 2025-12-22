/// OpenRouter provider implementation
///
/// Migrated from src/ai/openrouter.rs to provider pattern
use crate::ai::provider::{AiError, AiProvider, ContextPayload};
use async_stream::stream;
use eventsource_stream::Eventsource;
use futures_util::{stream::Stream, StreamExt};
use serde::Deserialize;
use std::pin::Pin;
use std::time::Duration;

pub struct OpenRouterProvider {
    api_key: String,
    client: reqwest::Client,
}

impl OpenRouterProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
        }
    }

    /// Get models with fallback logic (free tier models)
    fn get_models() -> Vec<&'static str> {
        vec![
            "xiaomi/mimo-v2-flash:free",
            "z-ai/glm-4.5-air:free",
            "openai/gpt-oss-20b:free",
        ]
    }
}

#[async_trait::async_trait]
impl AiProvider for OpenRouterProvider {
    fn id(&self) -> &str {
        "openrouter"
    }

    fn name(&self) -> &str {
        "OpenRouter"
    }

    async fn stream_context(
        &self,
        payload: ContextPayload,
    ) -> Result<Pin<Box<dyn Stream<Item = String> + Send>>, AiError> {
        let api_key = self.api_key.clone();
        let client = self.client.clone();
        let models = Self::get_models();

        let messages = vec![
            serde_json::json!({
                "role": "system",
                "content": payload.system_prompt
            }),
            serde_json::json!({
                "role": "user",
                "content": payload.user_message
            }),
        ];

        // Try each model until one succeeds
        for model in models {
            let request_body = serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": true,
            });

            let response = client
                .post("https://openrouter.ai/api/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("HTTP-Referer", "https://github.com/rfxlamia/ronin")
                .header("X-Title", "Ronin")
                .json(&request_body)
                .timeout(Duration::from_secs(30))
                .send()
                .await;

            match response {
                Ok(resp) => {
                    let status = resp.status();

                    // Handle specific error cases
                    if status == 401 || status == 403 {
                        return Err(AiError::Auth {
                            message: "Invalid API key".to_string(),
                            status: status.as_u16(),
                        });
                    }

                    if status == 429 {
                        let retry_after = resp
                            .headers()
                            .get("retry-after")
                            .and_then(|v| v.to_str().ok())
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(30);

                        return Err(AiError::RateLimit {
                            message: "AI resting".to_string(),
                            retry_after,
                        });
                    }

                    if status == 404 {
                        // Model not found, try next model
                        continue;
                    }

                    if !status.is_success() {
                        // For other non-2xx status codes, try next model
                        continue;
                    }

                    // Success! Create streaming response
                    let stream = stream! {
                        let mut event_stream = resp.bytes_stream().eventsource();

                        while let Some(event) = event_stream.next().await {
                            match event {
                                Ok(evt) => {
                                    if evt.data == "[DONE]" {
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

                                    if let Ok(chunk) = serde_json::from_str::<StreamChunk>(&evt.data) {
                                        if let Some(choice) = chunk.choices.first() {
                                            if let Some(content) = &choice.delta.content {
                                                yield content.clone();
                                            }
                                        }
                                    }
                                }
                                Err(_e) => {
                                    // Stream error, stop iteration
                                    break;
                                }
                            }
                        }
                    };

                    return Ok(Box::pin(stream));
                }
                Err(e) => {
                    if e.is_connect() || e.is_timeout() {
                        return Err(AiError::Network {
                            message: "Connection failed".to_string(),
                        });
                    }
                    // Try next model
                    continue;
                }
            }
        }

        // All models failed
        Err(AiError::Server {
            message: "All models failed".to_string(),
            status: 500,
        })
    }

    async fn test_connection(&self) -> Result<(), AiError> {
        let response = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("HTTP-Referer", "https://ronin.app")
            .header("X-Title", "Ronin")
            .json(&serde_json::json!({
                "model": "xiaomi/mimo-v2-flash:free",
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 1
            }))
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(|_| AiError::Network {
                message: "Connection failed".to_string(),
            })?;

        match response.status().as_u16() {
            200 => Ok(()),
            401 | 403 => Err(AiError::Auth {
                message: "Invalid API key".to_string(),
                status: response.status().as_u16(),
            }),
            429 => Err(AiError::RateLimit {
                message: "Rate limited".to_string(),
                retry_after: 30,
            }),
            500..=599 => Err(AiError::Server {
                message: "Server error".to_string(),
                status: response.status().as_u16(),
            }),
            _ => Err(AiError::Network {
                message: "Unexpected error".to_string(),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_id() {
        let provider = OpenRouterProvider::new("test-key".to_string());
        assert_eq!(provider.id(), "openrouter");
    }

    #[test]
    fn test_provider_name() {
        let provider = OpenRouterProvider::new("test-key".to_string());
        assert_eq!(provider.name(), "OpenRouter");
    }

    #[test]
    fn test_models_list() {
        let models = OpenRouterProvider::get_models();
        assert_eq!(models.len(), 3);
        assert_eq!(models[0], "xiaomi/mimo-v2-flash:free");
    }
}
