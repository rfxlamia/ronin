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
    ) -> Result<Pin<Box<dyn Stream<Item = crate::ai::provider::AiStreamEvent> + Send>>, AiError>
    {
        let api_key = self.api_key.clone();
        let client = self.client.clone();

        // Task 3.3: Respect model parameter from payload
        let models: Vec<String> = if let Some(m) = &payload.model {
            vec![m.clone()]
        } else {
            Self::get_models().into_iter().map(String::from).collect()
        };

        // Task 3.2: Convert or construct messages
        let messages = if let Some(msgs) = &payload.messages {
            serde_json::to_value(msgs).map_err(|e| AiError::Config {
                message: e.to_string(),
            })?
        } else {
            let sys = payload.system_prompt.clone().unwrap_or_default();
            let user = payload.user_message.clone().unwrap_or_default();
            serde_json::json!([
                { "role": "system", "content": sys },
                { "role": "user", "content": user }
            ])
        };

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
                        use crate::ai::provider::AiStreamEvent;
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
                                        tool_calls: Option<Vec<serde_json::Value>>,
                                    }

                                    if let Ok(chunk) = serde_json::from_str::<StreamChunk>(&evt.data) {
                                        if let Some(choice) = chunk.choices.first() {
                                            if let Some(content) = &choice.delta.content {
                                                yield AiStreamEvent::Text(content.clone());
                                            }
                                            if let Some(tool_calls) = &choice.delta.tool_calls {
                                                for tc in tool_calls {
                                                    yield AiStreamEvent::ToolCall(tc.clone());
                                                }
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

    // Task 3.4 Integration Test
    #[tokio::test]
    async fn test_provider_with_messages_payload() {
        use crate::ai::openrouter::Attribution;
        use crate::ai::provider::Message;

        // Note: This test constructs the provider but doesn't make API calls
        // to avoid networking in unit tests. It mainly verifies compilation
        // and struct usage.

        let provider = OpenRouterProvider::new("test-key".to_string());

        let _payload = ContextPayload {
            messages: Some(vec![Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
                name: None,
                tool_calls: None,
            }]),
            model: Some("test/model".to_string()),
            system_prompt: None,
            user_message: None,
            attribution: Attribution {
                commits: 0,
                files: 0,
                sources: vec![],
                devlog_lines: None,
            },
        };

        assert_eq!(provider.id(), "openrouter");
        // We can't easily test internal logic without mocking reqwest,
        // but this confirms the payload structure is compatible.
    }
}
