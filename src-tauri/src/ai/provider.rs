/// AI Provider abstraction layer for multi-provider support
///
/// ADR: Use custom AiProvider trait for multi-provider support
/// Rationale: Enables cost optimization and provider switching without
///            rewriting integration logic. Reduces vendor lock-in.
use futures_util::stream::Stream;
use serde::{Deserialize, Serialize};
use std::pin::Pin;

/// Context payload for AI inference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextPayload {
    pub system_prompt: String,
    pub user_message: String,
    pub attribution: crate::ai::openrouter::Attribution,
}

/// Provider information for frontend display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub is_configured: bool, // Has API key
    pub is_default: bool,
}

/// AI error types with specific handling strategies
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "errorType", content = "details")]
pub enum AiError {
    /// Authentication error (401/403) - not retryable
    Auth { message: String, status: u16 },
    /// Rate limit error (429) - retryable with delay
    RateLimit { message: String, retry_after: u64 },
    /// Server error (500+) - not retryable automatically
    Server { message: String, status: u16 },
    /// Network/connection error - retryable
    Network { message: String },
    /// Configuration error (missing key, invalid config)
    Config { message: String },
}

impl AiError {
    /// Get user-friendly error message (仁 Jin - Compassion)
    pub fn user_message(&self) -> String {
        match self {
            AiError::Auth { .. } => "API key invalid. Check your settings.".to_string(),
            AiError::RateLimit { retry_after, .. } => {
                format!("AI resting. Try again in {}s.", retry_after)
            }
            AiError::Server { .. } => "AI service unavailable. Try again later?".to_string(),
            AiError::Network { .. } => "Couldn't reach AI. Check your connection.".to_string(),
            AiError::Config { message } => message.clone(),
        }
    }

    /// Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(self, AiError::RateLimit { .. } | AiError::Network { .. })
    }

    /// Get provider-agnostic error event for frontend
    pub fn to_event(&self, provider_id: &str) -> serde_json::Value {
        let error_type = match self {
            AiError::Auth { .. } => "auth",
            AiError::RateLimit { .. } => "ratelimit",
            AiError::Server { .. } => "server",
            AiError::Network { .. } => "network",
            AiError::Config { .. } => "config",
        };

        serde_json::json!({
            "provider": provider_id,
            "errorType": error_type,
            "message": self.user_message(),
            "retryable": self.is_retryable(),
        })
    }
}

impl std::fmt::Display for AiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.user_message())
    }
}

impl std::error::Error for AiError {}

/// AI chunk event for streaming
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiChunkEvent {
    pub content: String,
    pub is_complete: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
}

/// Trait for AI provider implementations
///
/// All providers must implement this trait to ensure consistent streaming interface
#[async_trait::async_trait]
pub trait AiProvider: Send + Sync {
    /// Get provider ID (e.g., "openrouter", "openai", "anthropic")
    fn id(&self) -> &str;

    /// Get provider display name
    fn name(&self) -> &str;

    /// Stream AI context generation
    ///
    /// Returns a stream of incremental chunks that can be emitted to the frontend
    async fn stream_context(
        &self,
        payload: ContextPayload,
    ) -> Result<Pin<Box<dyn Stream<Item = String> + Send>>, AiError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_error_message() {
        let error = AiError::Auth {
            message: "Invalid API key".to_string(),
            status: 401,
        };
        assert_eq!(
            error.user_message(),
            "API key invalid. Check your settings."
        );
        assert!(!error.is_retryable());
    }

    #[test]
    fn test_ratelimit_error_message() {
        let error = AiError::RateLimit {
            message: "Rate limited".to_string(),
            retry_after: 30,
        };
        assert_eq!(error.user_message(), "AI resting. Try again in 30s.");
        assert!(error.is_retryable());
    }

    #[test]
    fn test_server_error_message() {
        let error = AiError::Server {
            message: "Internal server error".to_string(),
            status: 500,
        };
        assert_eq!(
            error.user_message(),
            "AI service unavailable. Try again later?"
        );
        assert!(!error.is_retryable());
    }

    #[test]
    fn test_network_error_message() {
        let error = AiError::Network {
            message: "Connection timeout".to_string(),
        };
        assert_eq!(
            error.user_message(),
            "Couldn't reach AI. Check your connection."
        );
        assert!(error.is_retryable());
    }

    #[test]
    fn test_error_event_structure() {
        let error = AiError::Auth {
            message: "Invalid API key".to_string(),
            status: 401,
        };
        let event = error.to_event("openrouter");

        assert_eq!(event["provider"], "openrouter");
        assert_eq!(event["errorType"], "auth");
        assert_eq!(event["message"], "API key invalid. Check your settings.");
        assert_eq!(event["retryable"], false);
    }

    #[test]
    fn test_context_payload_serialization() {
        use crate::ai::openrouter::Attribution;

        let payload = ContextPayload {
            system_prompt: "Test prompt".to_string(),
            user_message: "Test message".to_string(),
            attribution: Attribution {
                commits: 10,
                files: 5,
                sources: vec!["git".to_string()],
                devlog_lines: None,
                ai_sessions: None,
            },
        };

        let json = serde_json::to_string(&payload).expect("Should serialize");
        assert!(json.contains("Test prompt"));
        assert!(json.contains("Test message"));
    }

    #[test]
    fn test_provider_info_serialization() {
        let info = ProviderInfo {
            id: "openrouter".to_string(),
            name: "OpenRouter".to_string(),
            is_configured: true,
            is_default: true,
        };

        let json = serde_json::to_string(&info).expect("Should serialize");
        assert!(json.contains("openrouter"));
        assert!(json.contains("OpenRouter"));
        assert!(json.contains("true"));
    }
}
