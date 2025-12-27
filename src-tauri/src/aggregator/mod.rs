/// Context aggregation module
///
/// Aggregates Git, DEVLOG, and behavior data for AI context generation
mod fetchers;
mod patterns;
mod summarizer;
pub mod types;

use crate::db::DbPool;
use crate::error::RoninError;
use types::{AggregatedContext, BehaviorData};

/// Aggregate context from all sources for a project
///
/// DB operations are wrapped in spawn_blocking to avoid blocking the async runtime
pub async fn aggregate_context(
    project_id: i64,
    project_path: std::path::PathBuf,
    project_name: String,
    db_pool: DbPool,
) -> Result<AggregatedContext, RoninError> {
    // Fetch Git context (async)
    let git_context = fetchers::fetch_git_context(&project_path).await?;

    // Fetch DEVLOG context (sync)
    let devlog = fetchers::fetch_devlog_context(&project_path);

    // Fetch behavior context (last 2 hours) - wrapped in spawn_blocking for DB operations
    let (window_events, file_events) = {
        let db = db_pool.clone();
        tokio::task::spawn_blocking(move || fetchers::fetch_behavior_context(project_id, 2, &db))
            .await
            .map_err(|e| RoninError::Aggregation(format!("Task join error: {}", e)))??
    };

    // Detect AI tool sessions
    let ai_sessions = patterns::detect_ai_tools(&window_events);

    // Detect patterns
    let mut detected_patterns = Vec::new();

    // AI-assisted iteration
    let iteration_patterns = patterns::correlate_ai_iterations(&ai_sessions, &file_events);
    detected_patterns.extend(iteration_patterns);

    // Focus session
    if let Some(focus) = patterns::detect_focus_session(&ai_sessions, &file_events) {
        detected_patterns.push(focus);
    }

    // Breakthrough
    if let Some(breakthrough) = patterns::detect_breakthrough(&ai_sessions) {
        detected_patterns.push(breakthrough);
    }

    // Stuck detection
    let stuck_detected = patterns::detect_stuck(&window_events, &ai_sessions, &file_events);

    // Determine last active file
    let last_active_file = file_events.last().map(|fe| fe.file_path.clone());

    // Build behavior data
    let behavior = BehaviorData {
        ai_sessions: ai_sessions.len(),
        last_active_file,
        patterns: detected_patterns,
        stuck_detected,
    };

    // Generate attribution
    let attribution = summarizer::generate_attribution(
        git_context.recent_commits.len(),
        &ai_sessions,
        devlog.is_some(),
    );

    // Build aggregated context
    let mut context = AggregatedContext {
        project: project_name,
        git: git_context,
        devlog,
        behavior,
        attribution,
    };

    // Truncate to 10KB limit
    const MAX_PAYLOAD_BYTES: usize = 10 * 1024;
    summarizer::truncate_to_limit(&mut context, MAX_PAYLOAD_BYTES);

    Ok(context)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_aggregate_context_minimal() {
        // Create temp DB
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let manager = r2d2_sqlite::SqliteConnectionManager::file(&db_path)
            .with_init(|conn| conn.execute_batch("PRAGMA foreign_keys=ON;"));
        let pool = r2d2::Pool::builder().build(manager).unwrap();

        {
            let mut conn = pool.get().unwrap();
            db::run_migrations(&mut conn).unwrap();
        }

        // Create test project directory
        let project_dir = TempDir::new().unwrap();

        let result = aggregate_context(
            1,
            project_dir.path().to_path_buf(),
            "test_project".to_string(),
            pool,
        )
        .await;

        assert!(result.is_ok());
        let context = result.unwrap();
        assert_eq!(context.project, "test_project");
        assert!(context.attribution.contains("Based on"));
    }
}
