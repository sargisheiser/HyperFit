#!/bin/bash
# Start HYPERFIT Frontend

cd "$(dirname "$0")"

echo "🎨 Starting HYPERFIT Frontend..."
echo "📡 Frontend will be available at: http://localhost:3000"
echo "🔗 Backend should be running at: http://localhost:8000"
echo "🛑 Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the dev server
npm run dev
