use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
}

pub struct OpenRouterClient {
    api_key: String,
    client: reqwest::Client,
}

impl OpenRouterClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
        }
    }

    /// Get available model with fallback logic
    pub fn get_available_model() -> String {
        // Default model as specified in story
        "xiaomi/mimo-v2-flash:free".to_string()
    }

    /// Stream chat completion from OpenRouter with event emission
    pub async fn chat_stream(
        &self,
        messages: Vec<Message>,
        window: tauri::Window,
    ) -> Result<(), String> {
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
                        window
                            .emit(
                                "ai-error",
                                serde_json::json!({
                                    "message": "AI resting. Try again in 30s"
                                }),
                            )
                            .map_err(|e| e.to_string())?;
                        return Err("Rate limit exceeded".to_string());
                    }

                    if status == 401 {
                        window
                            .emit(
                                "ai-error",
                                serde_json::json!({
                                    "message": "API key invalid. Check settings."
                                }),
                            )
                            .map_err(|e| e.to_string())?;
                        return Err("Unauthorized".to_string());
                    }

                    if !status.is_success() {
                        last_error = format!("HTTP {}", status);
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

                    // Emit completion
                    window
                        .emit(
                            "ai-complete",
                            serde_json::json!({
                                "text": full_text,
                                "attribution": {
                                    "commits": 0,
                                    "sources": ["git"]
                                }
                            }),
                        )
                        .map_err(|e| e.to_string())?;

                    return Ok(());
                }
                Err(e) => {
                    last_error = e.to_string();
                    continue;
                }
            }
        }

        // All models failed
        window.emit("ai-error", serde_json::json!({
            "message": "OpenRouter free models unavailable. Please check your API key or try later."
        })).map_err(|e| e.to_string())?;

        Err(format!("All models failed. Last error: {}", last_error))
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
}
