use serde::{Deserialize, Serialize};

/// Attribution data for AI context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attribution {
    pub commits: usize,
    pub files: usize,
    pub sources: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub devlog_lines: Option<usize>,
    /// AI tool sessions count from behavior tracking (Epic 6)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_sessions: Option<usize>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attribution_serialization() {
        let attribution = Attribution {
            commits: 15,
            files: 3,
            sources: vec!["git".to_string()],
            devlog_lines: None,
            ai_sessions: None,
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
            ai_sessions: None,
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
            ai_sessions: None,
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
