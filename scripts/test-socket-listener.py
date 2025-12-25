#!/usr/bin/env python3
"""
Test socket listener for ronin-observer daemon
Properly handles Unix domain socket connections and displays JSON events
"""

import socket
import os
import json
import sys

SOCKET_PATH = "/tmp/ronin-observer.sock"

# Remove old socket if exists
if os.path.exists(SOCKET_PATH):
    os.remove(SOCKET_PATH)
    print(f"🗑️  Removed old socket: {SOCKET_PATH}")

# Create Unix socket
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.bind(SOCKET_PATH)
sock.listen(1)

print(f"🔌 Socket server listening on: {SOCKET_PATH}")
print("📡 Waiting for daemon connection...")
print("=" * 60)

try:
    # Accept connection
    connection, client_address = sock.accept()
    print("✅ Daemon connected!")
    print("📨 Receiving window focus events...\n")
    
    buffer = ""
    while True:
        # Receive data in chunks
        data = connection.recv(4096).decode('utf-8')
        if not data:
            print("\n❌ Connection closed by daemon")
            break
        
        # Add to buffer
        buffer += data
        
        # Process complete lines (JSON events are newline-delimited)
        while '\n' in buffer:
            line, buffer = buffer.split('\n', 1)
            if line.strip():
                try:
                    # Parse and pretty-print JSON
                    event = json.loads(line)
                    print("=" * 60)
                    print(f"🪟 Event Type: {event.get('type', 'unknown')}")
                    if 'data' in event:
                        data = event['data']
                        print(f"   Title: {data.get('title', 'N/A')}")
                        print(f"   App: {data.get('app_class', 'N/A')}")
                        print(f"   Timestamp: {data.get('timestamp', 'N/A')}")
                    print("=" * 60 + "\n")
                except json.JSONDecodeError as e:
                    print(f"⚠️  Invalid JSON: {line}")
                    print(f"   Error: {e}\n")

except KeyboardInterrupt:
    print("\n\n🛑 Stopping socket server...")
except Exception as e:
    print(f"\n❌ Error: {e}")
finally:
    # Cleanup
    if 'connection' in locals():
        connection.close()
    sock.close()
    if os.path.exists(SOCKET_PATH):
        os.remove(SOCKET_PATH)
    print("✅ Socket closed and cleaned up")
