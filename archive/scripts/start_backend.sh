#!/bin/bash
# Start HYPERFIT Backend Server

cd "$(dirname "$0")"

# Clear caches
echo "🧹 Clearing Python caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

# Activate virtual environment (.venv preferred)
if [ -d ".venv" ]; then
  source .venv/bin/activate
elif [ -d "venv" ]; then
  source venv/bin/activate
else
  echo "❌ No virtual environment found (expected .venv/ or venv/)."
  echo "   Create one with 'python -m venv .venv' and install requirements."
  exit 1
fi

# Start the server
echo ""
echo "🏋️ Starting HYPERFIT Backend Server..."
echo "📡 Server will be available at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
