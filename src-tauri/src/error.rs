/// Standardized error types for Ronin application
///
/// Provides consistent error handling across modules with proper Display and Error trait implementations
use serde::{Deserialize, Serialize};

/// Main error type for Ronin application operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "errorType", content = "details")]
pub enum RoninError {
    /// Database operation errors
    Database(String),
    /// Git operation errors
    Git(String),
    /// IO operation errors (file system, etc.)
    Io(String),
    /// Context aggregation errors
    Aggregation(String),
    /// Parse/serialization errors
    Parse(String),
}

impl std::fmt::Display for RoninError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RoninError::Database(msg) => write!(f, "Database error: {}", msg),
            RoninError::Git(msg) => write!(f, "Git error: {}", msg),
            RoninError::Io(msg) => write!(f, "IO error: {}", msg),
            RoninError::Aggregation(msg) => write!(f, "Aggregation error: {}", msg),
            RoninError::Parse(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl std::error::Error for RoninError {}

// Conversion implementations for common error types
impl From<rusqlite::Error> for RoninError {
    fn from(err: rusqlite::Error) -> Self {
        RoninError::Database(err.to_string())
    }
}

impl From<git2::Error> for RoninError {
    fn from(err: git2::Error) -> Self {
        RoninError::Git(err.to_string())
    }
}

impl From<std::io::Error> for RoninError {
    fn from(err: std::io::Error) -> Self {
        RoninError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for RoninError {
    fn from(err: serde_json::Error) -> Self {
        RoninError::Parse(err.to_string())
    }
}

// Convert from String for backward compatibility
impl From<String> for RoninError {
    fn from(err: String) -> Self {
        RoninError::Aggregation(err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = RoninError::Database("test error".to_string());
        assert_eq!(error.to_string(), "Database error: test error");
    }

    #[test]
    fn test_error_serialization() {
        let error = RoninError::Aggregation("test".to_string());
        let json = serde_json::to_string(&error).expect("Should serialize");
        assert!(json.contains("Aggregation"));
        assert!(json.contains("test"));
    }

    #[test]
    fn test_from_rusqlite_error() {
        let sql_err = rusqlite::Error::InvalidQuery;
        let ronin_err: RoninError = sql_err.into();
        assert!(matches!(ronin_err, RoninError::Database(_)));
    }

    #[test]
    fn test_from_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let ronin_err: RoninError = io_err.into();
        assert!(matches!(ronin_err, RoninError::Io(_)));
        assert!(ronin_err.to_string().contains("file not found"));
    }
}
