#!/bin/bash
# Install LangChain dependencies for HyperFit AI Assistant

echo "🏋️ Installing LangChain dependencies for HyperFit AI Assistant..."

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "📦 Activating virtual environment..."
    source .venv/bin/activate
else
    echo "⚠️  No virtual environment found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Install LangChain dependencies
echo "📥 Installing LangChain packages..."
pip install --upgrade pip
pip install "langchain>=0.1.17,<0.2"
pip install "langchain-openai>=0.1.1,<0.2"
pip install "langchain-core>=0.1.52,<0.2"

echo "✅ LangChain dependencies installed successfully!"
echo ""
echo "🔑 Don't forget to set your OPENAI_API_KEY in the .env file:"
echo "   OPENAI_API_KEY=your_api_key_here"
echo ""
echo "🚀 Restart your backend server to use the AI Assistant!"

