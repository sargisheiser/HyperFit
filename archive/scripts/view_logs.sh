#!/bin/bash
# View HYPERFIT Backend Logs

cd "$(dirname "$0")"

if [ -f "logs/hyperfit.log" ]; then
    echo "📋 Viewing HYPERFIT Backend Logs"
    echo "=================================="
    echo ""
    tail -50 logs/hyperfit.log
    echo ""
    echo "=================================="
    echo "💡 To follow logs in real-time: tail -f logs/hyperfit.log"
else
    echo "No log file found. Backend logs will appear here when server runs."
    echo "Log file location: logs/hyperfit.log"
fi
