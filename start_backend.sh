#!/bin/bash
# Start HYPERFIT Backend Server

cd "$(dirname "$0")"

# Clear caches
echo "🧹 Clearing Python caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

# Activate virtual environment
source venv/bin/activate

# Start the server
echo ""
echo "🏋️ Starting HYPERFIT Backend Server..."
echo "📡 Server will be available at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
