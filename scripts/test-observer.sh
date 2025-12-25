#!/bin/bash
# Manual Testing Script for Story 6.1: Window Title Tracking (X11)

echo "===================================="
echo "Story 6.1 Manual Testing Checklist"
echo "===================================="
echo ""

# Check if observer daemon is running
echo "✓ Checking if observer daemon is running..."
if pgrep -f ronin-observer > /dev/null; then
    echo "  ✅ Observer daemon is RUNNING (PID: $(pgrep -f ronin-observer))"
else
    echo "  ❌ Observer daemon is NOT running"
    echo "     This is expected if you're not on X11 or if the daemon hasn't started yet"
fi
echo ""

# Check for Unix socket
echo "✓ Checking for Unix socket..."
if [ -S /tmp/ronin-observer.sock ]; then
    echo "  ✅ Socket exists: /tmp/ronin-observer.sock"
    ls -lh /tmp/ronin-observer.sock
else
    echo "  ❌ Socket NOT found at /tmp/ronin-observer.sock"
fi
echo ""

# Check database
echo "✓ Checking SQLite database..."
DB_PATH="$HOME/.local/share/ronin/ronin.db"
if [ -f "$DB_PATH" ]; then
    echo "  ✅ Database exists: $DB_PATH"
    
    # Check for observer_events table
    if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='observer_events';" | grep -q observer_events; then
        echo "  ✅ observer_events table exists"
        
        # Count events
        EVENT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM observer_events;")
        echo "  📊 Total events logged: $EVENT_COUNT"
        
        # Show recent events
        echo ""
        echo "  Recent events (last 5):"
        sqlite3 "$DB_PATH" -header -column "SELECT datetime(timestamp/1000, 'unixepoch') as time, process_name, substr(window_title, 1, 50) as title FROM observer_events ORDER BY timestamp DESC LIMIT 5;"
        
        # Check indexes
        echo ""
        echo "  ✅ Checking indexes:"
        sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='observer_events';"
    else
        echo "  ❌ observer_events table NOT found"
    fi
else
    echo "  ❌ Database NOT found at $DB_PATH"
fi
echo ""

echo "===================================="
echo "Manual Test Steps:"
echo "===================================="
echo "1. Switch between different windows (VS Code, Browser, Terminal)"
echo "2. Watch the terminal where 'npm run tauri dev' is running"
echo "3. You should see messages like:"
echo "   [observer] Sent event: code - lib.rs - ronin - VS Code"
echo "   [observer-manager] Received event: ..."
echo ""
echo "4. Close the Ronin app window"
echo "5. Run this script again to verify:"
echo "   - Observer daemon process is KILLED"
echo "   - Socket file is REMOVED"
echo ""
echo "Run: ./test-observer.sh"
echo "===================================="
