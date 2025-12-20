use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
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
