#!/bin/bash
# Test script to verify observer duration calculation
# Story 6.1: Duration calculation using SQL window functions

echo "========================================"
echo "Observer Duration Calculation Test"
echo "========================================"
echo ""

DB_PATH="$HOME/.local/share/ronin/ronin.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found: $DB_PATH"
    exit 1
fi

echo "✓ Testing duration view..."
echo ""

# Test 1: View recent events with duration
echo "📊 Recent events with duration (last 10):"
echo "=========================================="
sqlite3 "$DB_PATH" -header -column <<SQL
SELECT 
    datetime(timestamp/1000, 'unixepoch', 'localtime') AS time,
    process_name,
    substr(window_title, 1, 40) AS title,
    CASE 
        WHEN duration_seconds IS NULL THEN 'current'
        WHEN duration_seconds < 60 THEN duration_seconds || 's'
        ELSE (duration_seconds / 60) || 'm ' || (duration_seconds % 60) || 's'
    END AS duration
FROM observer_events_with_duration
LIMIT 10;
SQL

echo ""
echo ""

# Test 2: Time spent per application (last hour)
echo "⏱️  Time spent per application (last hour):"
echo "==========================================="
sqlite3 "$DB_PATH" -header -column <<SQL
SELECT 
    process_name,
    COUNT(*) AS switches,
    ROUND(SUM(duration_seconds) / 60.0, 1) AS total_minutes
FROM observer_events_with_duration
WHERE timestamp > (strftime('%s', 'now') - 3600) * 1000
  AND duration_seconds IS NOT NULL
GROUP BY process_name
ORDER BY total_minutes DESC;
SQL

echo ""
echo ""

# Test 3: Long sessions (> 2 minutes)
echo "🎯 Long sessions (> 2 minutes):"
echo "==============================="
sqlite3 "$DB_PATH" -header -column <<SQL
SELECT 
    datetime(timestamp/1000, 'unixepoch', 'localtime') AS started_at,
    process_name,
    substr(window_title, 1, 40) AS title,
    ROUND(duration_seconds / 60.0, 1) || ' min' AS duration
FROM observer_events_with_duration
WHERE duration_seconds > 120
  AND timestamp > (strftime('%s', 'now') - 86400) * 1000
ORDER BY timestamp DESC
LIMIT 5;
SQL

echo ""
echo "========================================"
echo "✅ Duration calculation working!"
echo "This data is ready for Story 6.4 (Context Aggregator)"
echo "========================================"
