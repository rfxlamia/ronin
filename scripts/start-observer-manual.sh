#!/bin/bash
# Quick script to manually start the observer daemon via Tauri IPC

echo "Starting observer daemon..."
echo ""
echo "Open the browser DevTools console (F12) in the Ronin app and run:"
echo ""
echo "await window.__TAURI__.core.invoke('start_observer')"
echo ""
echo "Then check status with:"
echo "await window.__TAURI__.core.invoke('get_observer_status')"
echo ""
echo "Or run this to check from command line:"
echo "pgrep -af ronin-observer"
