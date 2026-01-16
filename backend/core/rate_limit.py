"""Rate limiting configuration for API endpoints."""

import os

# Check if we're in testing mode
TESTING = os.environ.get("TESTING", "").lower() in ("true", "1", "yes")

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    HAS_SLOWAPI = True and not TESTING  # Disable in tests
except ImportError:
    HAS_SLOWAPI = False

if not HAS_SLOWAPI:
    # Dummy classes for when slowapi is not installed or in test mode
    class Limiter:  # type: ignore
        def limit(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator

    def get_remote_address(request):
        return "127.0.0.1"

    class RateLimitExceeded(Exception):  # type: ignore
        pass

from fastapi import Request, Response
from fastapi.responses import JSONResponse

# Create rate limiter instance (or dummy if slowapi not installed/testing)
if HAS_SLOWAPI:
    limiter = Limiter(key_func=get_remote_address)
else:
    limiter = Limiter()  # type: ignore

# Export RateLimitExceeded for exception handler
if HAS_SLOWAPI:
    from slowapi.errors import RateLimitExceeded  # type: ignore
else:
    RateLimitExceeded = Exception  # type: ignore


def rate_limit_exceeded_handler(request: Request, exc: Exception) -> Response:
    """Handle rate limit exceeded errors."""
    detail = getattr(exc, "detail", str(exc))
    retry_after = getattr(exc, "retry_after", 60)
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {detail}",
            "retry_after": retry_after,
        },
    )

def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key for authenticated users (by user ID) or IP for anonymous."""
    # Check if user is authenticated
    # Note: This requires the request to have gone through authentication middleware
    # For now, use IP address - can be enhanced later
    return get_remote_address(request)

# Rate limit configurations
RATE_LIMITS = {
    "auth": "10/minute",  # Login/register endpoints
    "api": "100/minute",  # General API endpoints
    "ai": "20/minute",    # AI processing endpoints (expensive)
    "upload": "10/minute", # File upload endpoints
    "strict": "5/minute",  # Sensitive endpoints
}
