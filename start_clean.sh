#!/bin/bash
# HYPERFIT Clean Startup Script
# Clears caches and starts the server

cd "$(dirname "$0")"

echo "🧹 Clearing Python caches..."
find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null
find . -name "*.pyo" -delete 2>/dev/null
echo "✅ Caches cleared"

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
