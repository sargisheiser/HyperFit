#!/bin/bash
# HYPERFIT Backend Startup Script

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Start the server
echo "🏋️ Starting HYPERFIT Backend Server..."
echo "📡 Server will be available at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the server"
echo "=" | head -c 50 | tr '\n' '='
echo ""

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
