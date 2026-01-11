#!/bin/bash

# HYPERFIT Deployment Script
# Usage: ./deploy.sh [dev|prod]

set -e

ENV=${1:-dev}

echo "🚀 Starting HYPERFIT deployment ($ENV mode)..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from env.example..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env file. Please update it with your configuration."
    else
        echo "❌ env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads logs

# Initialize database if needed
if [ ! -f database.db ]; then
    echo "🗄️  Initializing database..."
    docker-compose run --rm backend python init_database.py || echo "⚠️  Database initialization skipped"
fi

# Build and start containers
if [ "$ENV" = "prod" ]; then
    echo "🏗️  Building production images..."
    docker-compose -f docker-compose.prod.yml build
    
    echo "🚀 Starting production containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Production deployment complete!"
    echo "📊 View logs: docker-compose -f docker-compose.prod.yml logs -f"
else
    echo "🏗️  Building development images..."
    docker-compose build
    
    echo "🚀 Starting development containers..."
    docker-compose up -d
    
    echo "✅ Development deployment complete!"
    echo "📊 View logs: docker-compose logs -f"
fi

echo ""
echo "🎉 HYPERFIT is now running!"
echo "📍 Backend: http://localhost:8000"
echo "📍 Frontend: http://localhost:80"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"


