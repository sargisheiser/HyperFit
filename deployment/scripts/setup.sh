#!/bin/bash
# HYPERFIT Setup Script

echo "🏋️ Setting up HYPERFIT..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads
mkdir -p logs

# Copy environment file
if [ ! -f .env ]; then
    cp env.example .env
    echo "📝 Please edit .env file with your API keys"
fi

# Initialize database
python -c "from backend.core.database import create_tables; create_tables()"

echo "✅ HYPERFIT setup complete!"
echo "🚀 Run: uvicorn backend.main:app --reload"
