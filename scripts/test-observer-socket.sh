#!/bin/bash
# Test script for ronin-observer daemon
# This creates a simple socket listener to verify daemon functionality

echo "🔌 Creating test Unix socket server..."

# Create socket and listen
nc -lU /tmp/ronin-observer.sock | while read line; do
    echo "📨 Received event: $line"
    # Parse and pretty print if it's JSON
    echo "$line" | jq '.' 2>/dev/null || echo "$line"
done
