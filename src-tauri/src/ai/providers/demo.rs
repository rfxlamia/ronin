/// Demo Mode provider implementation
///
/// Routes AI requests through AWS Lambda proxy with rate limiting
/// No API key required - uses V's master key server-side
use crate::ai::provider::{AiError, AiProvider, ContextPayload};
use async_stream::stream;
use eventsource_stream::Eventsource;
use futures_util::{stream::Stream, StreamExt};
use sha2::{Digest, Sha256};
use std::pin::Pin;
use std::time::Duration;

/// Demo mode provider - proxies through AWS Lambda
pub struct DemoProvider {
    lambda_url: String,
    client: reqwest::Client,
    fingerprint: String,
}

impl DemoProvider {
    /// Create new demo provider
    ///
    /// # Arguments
    /// * `lambda_url` - AWS Lambda Function URL (compile-time config)
    pub fn new(lambda_url: String) -> Self {
        let fingerprint = Self::generate_fingerprint();

        Self {
            lambda_url,
            client: reqwest::Client::new(),
            fingerprint,
        }
    }

    /// Generate stable client fingerprint for rate limiting
    ///
    /// Uses machine-id hashed with SHA-256 for privacy
    /// Stable across app restarts on same machine
    fn generate_fingerprint() -> String {
        match machine_uid::get() {
            Ok(machine_id) => {
                let mut hasher = Sha256::new();
                hasher.update(machine_id.as_bytes());
                let result = hasher.finalize();
                // Take first 32 chars of hex digest
                format!("{:x}", result)[..32].to_string()
            }
            Err(_e) => {
                // Fallback to random fingerprint (less stable but works)
                use rand::Rng;
                let random_bytes: [u8; 16] = rand::thread_rng().gen();
                format!("{:x}", Sha256::digest(random_bytes))[..32].to_string()
            }
        }
    }

    /// Parse rate limit error from Lambda response
    fn parse_rate_limit_error(body: &str) -> Option<AiError> {
        #[derive(serde::Deserialize)]
        struct RateLimitResponse {
            #[serde(rename = "retryAfter")]
            retry_after: Option<u64>,
            message: Option<String>,
        }

        if let Ok(response) = serde_json::from_str::<RateLimitResponse>(body) {
            Some(AiError::RateLimit {
                message: response
                    .message
                    .unwrap_or_else(|| "Demo mode resting".to_string()),
                retry_after: response.retry_after.unwrap_or(3600),
            })
        } else {
            None
        }
    }
}

#[async_trait::async_trait]
impl AiProvider for DemoProvider {
    fn id(&self) -> &str {
        "demo"
    }

    fn name(&self) -> &str {
        "Demo Mode (Limited)"
    }

    async fn stream_context(
        &self,
        payload: ContextPayload,
    ) -> Result<Pin<Box<dyn Stream<Item = String> + Send>>, AiError> {
        let client = self.client.clone();
        let lambda_url = self.lambda_url.clone();
        let fingerprint = self.fingerprint.clone();

        // Convert payload to OpenRouter format
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

        let request_body = serde_json::json!({
            "messages": messages,
        });

        // Make request to Lambda proxy
        let response = client
            .post(&lambda_url)
            .header("Content-Type", "application/json")
            .header("X-Client-Fingerprint", &fingerprint)
            .json(&request_body)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| {
                if e.is_connect() || e.is_timeout() {
                    AiError::Network {
                        message: "Couldn't reach demo service".to_string(),
                    }
                } else {
                    AiError::Server {
                        message: "Demo service unavailable".to_string(),
                        status: 500,
                    }
                }
            })?;

        let status = response.status();

        // Handle rate limit (429)
        if status == 429 {
            let body = response.text().await.unwrap_or_default();

            if let Some(error) = Self::parse_rate_limit_error(&body) {
                return Err(error);
            }

            return Err(AiError::RateLimit {
                message: "Demo mode resting".to_string(),
                retry_after: 3600,
            });
        }

        // Handle other errors
        if status == 400 {
            return Err(AiError::Config {
                message: "Invalid request to demo service".to_string(),
            });
        }

        if status == 413 {
            return Err(AiError::Config {
                message: "Request too large for demo mode".to_string(),
            });
        }

        if status == 502 || status == 504 {
            return Err(AiError::Server {
                message: "AI service unavailable".to_string(),
                status: status.as_u16(),
            });
        }

        if !status.is_success() {
            return Err(AiError::Server {
                message: format!("Demo service error: {}", status),
                status: status.as_u16(),
            });
        }

        // Stream successful response (SSE format from Lambda)
        let stream = stream! {
            let mut event_stream = response.bytes_stream().eventsource();

            while let Some(event) = event_stream.next().await {
                match event {
                    Ok(evt) => {
                        if evt.data == "[DONE]" {
                            break;
                        }

                        #[derive(serde::Deserialize)]
                        struct StreamChunk {
                            choices: Vec<StreamChoice>,
                        }

                        #[derive(serde::Deserialize)]
                        struct StreamChoice {
                            delta: Delta,
                        }

                        #[derive(serde::Deserialize)]
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

        Ok(Box::pin(stream))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_id() {
        let provider = DemoProvider::new("https://example.com".to_string());
        assert_eq!(provider.id(), "demo");
    }

    #[test]
    fn test_provider_name() {
        let provider = DemoProvider::new("https://example.com".to_string());
        assert_eq!(provider.name(), "Demo Mode (Limited)");
    }

    #[test]
    fn test_fingerprint_generation() {
        let fingerprint = DemoProvider::generate_fingerprint();
        assert_eq!(fingerprint.len(), 32);
        // Should be hex string
        assert!(fingerprint.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_fingerprint_stability() {
        let fp1 = DemoProvider::generate_fingerprint();
        let fp2 = DemoProvider::generate_fingerprint();
        // Fingerprints should be consistent (same machine)
        assert_eq!(fp1, fp2);
    }

    #[test]
    fn test_parse_rate_limit_error() {
        let json =
            r#"{"retryAfter": 1800, "message": "Demo mode resting. Try again in 30 minutes."}"#;
        let error = DemoProvider::parse_rate_limit_error(json);

        assert!(error.is_some());
        if let Some(AiError::RateLimit { retry_after, .. }) = error {
            assert_eq!(retry_after, 1800);
        } else {
            panic!("Expected RateLimit error");
        }
    }
}
