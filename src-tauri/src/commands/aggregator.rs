/// Tauri commands for context aggregation
///
/// Provides get_project_context command for frontend integration
use crate::aggregator;
use crate::aggregator::types::AggregatedContext;
use crate::db::DbPool;
use crate::error::RoninError;

/// Get aggregated context for a project
///
/// Uses async aggregation with tracing for performance verification (<500ms NFR)
#[tracing::instrument(skip(db_pool), fields(project_id = %project_id))]
#[tauri::command]
pub async fn get_project_context(
    project_id: i64,
    db_pool: tauri::State<'_, DbPool>,
) -> Result<AggregatedContext, RoninError> {
    let db = db_pool.inner().clone();

    // Get project details from database using spawn_blocking
    let (path, name) = tokio::task::spawn_blocking(move || {
        let conn = db
            .get()
            .map_err(|e| RoninError::Database(format!("Failed to get DB connection: {}", e)))?;

        let mut stmt = conn
            .prepare("SELECT path, name FROM projects WHERE id = ?1 AND deleted_at IS NULL")
            .map_err(|e| RoninError::Database(format!("Failed to prepare query: {}", e)))?;

        let project: Result<(String, String), _> = stmt
            .query_row(rusqlite::params![project_id], |row| {
                Ok((row.get(0)?, row.get(1)?))
            });

        project.map_err(|e| RoninError::Database(format!("Project not found or deleted: {}", e)))
    })
    .await
    .map_err(|e| RoninError::Aggregation(format!("Task join error: {}", e)))??;

    // Aggregate context (async)
    let context = aggregator::aggregate_context(
        project_id,
        std::path::PathBuf::from(path),
        name,
        db_pool.inner().clone(),
    )
    .await?;

    Ok(context)
}
