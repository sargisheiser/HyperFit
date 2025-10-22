#!/usr/bin/env python3
"""
HYPERFIT Server Startup Script
"""

import uvicorn
import os
from backend.core.config import settings

if __name__ == "__main__":
    print("🏋️ Starting HYPERFIT Server...")
    print(f"📡 Server will be available at: http://{settings.host}:{settings.port}")
    print(f"📚 API Documentation: http://{settings.host}:{settings.port}/docs")
    print("🛑 Press Ctrl+C to stop the server")
    print("=" * 50)
    
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
