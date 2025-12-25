-- Observer Events with Duration Calculation
-- This view calculates how long user stayed in each window
-- by computing the time difference between consecutive events

CREATE VIEW IF NOT EXISTS observer_events_with_duration AS
SELECT 
    id,
    timestamp,
    event_type,
    window_title,
    process_name,
    project_id,
    -- Calculate duration: time until next event (in milliseconds)
    (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp) AS duration_ms,
    -- Convert to seconds for readability
    (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp) / 1000 AS duration_seconds,
    -- Check if this is the last event (no next event = NULL duration)
    CASE 
        WHEN LEAD(timestamp) OVER (ORDER BY timestamp) IS NULL THEN 1
        ELSE 0
    END AS is_current_window
FROM observer_events
ORDER BY timestamp DESC;

-- Example queries for Story 6.4 (Context Aggregator):

-- 1. Get total time spent per application (last 24 hours)
-- SELECT 
--     process_name,
--     SUM(duration_seconds) / 60.0 AS minutes_spent
-- FROM observer_events_with_duration
-- WHERE timestamp > (strftime('%s', 'now') - 86400) * 1000
--   AND duration_seconds IS NOT NULL
-- GROUP BY process_name
-- ORDER BY minutes_spent DESC;

-- 2. Get activity timeline with durations (last hour)
-- SELECT 
--     datetime(timestamp/1000, 'unixepoch', 'localtime') AS switched_at,
--     process_name,
--     substr(window_title, 1, 50) AS title,
--     duration_seconds || 's' AS duration
-- FROM observer_events_with_duration
-- WHERE timestamp > (strftime('%s', 'now') - 3600) * 1000
--   AND duration_seconds IS NOT NULL
-- ORDER BY timestamp DESC;

-- 3. Find "stuck" patterns (same window for > 5 minutes, Story 6.4 AC)
-- SELECT 
--     process_name,
--     window_title,
--     duration_seconds / 60.0 AS minutes_spent
-- FROM observer_events_with_duration
-- WHERE duration_seconds > 300  -- > 5 minutes
--   AND process_name NOT IN ('Unknown')
-- ORDER BY timestamp DESC;
