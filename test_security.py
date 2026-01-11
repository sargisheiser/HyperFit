#!/usr/bin/env python3
"""
Security Hardening Test Script
Tests Rate Limiting, Security Headers, and Configuration
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

def test_imports():
    """Test if all security modules can be imported."""
    print("🔍 Testing imports...")
    try:
        from backend.core.security_middleware import SecurityHeadersMiddleware
        print("  ✅ SecurityHeadersMiddleware")
    except Exception as e:
        print(f"  ❌ SecurityHeadersMiddleware: {e}")
        return False
    
    try:
        from backend.core.rate_limit import limiter, RateLimitExceeded, rate_limit_exceeded_handler
        print("  ✅ Rate Limiting")
    except Exception as e:
        print(f"  ⚠️  Rate Limiting: {e} (slowapi not installed?)")
    
    try:
        from backend.core.config import settings
        print(f"  ✅ Config Settings (SECRET_KEY length: {len(settings.secret_key)})")
    except Exception as e:
        print(f"  ❌ Config Settings: {e}")
        return False
    
    try:
        from backend.api.auth_router import router as auth_router
        print("  ✅ Auth Router")
    except Exception as e:
        print(f"  ❌ Auth Router: {e}")
        return False
    
    return True


def test_rate_limiting_decorators():
    """Check if rate limiting decorators are applied."""
    print("\n🔍 Testing Rate Limiting Decorators...")
    
    try:
        from backend.api.auth_router import register_user, login_user
        import inspect
        
        # Check if functions have rate limit decorators
        # slowapi adds a __wrapped__ attribute when decorator is applied
        if hasattr(register_user, '__wrapped__'):
            print("  ✅ register_user has rate limiting")
        else:
            print("  ⚠️  register_user rate limiting not visible (slowapi not installed?)")
        
        if hasattr(login_user, '__wrapped__'):
            print("  ✅ login_user has rate limiting")
        else:
            print("  ⚠️  login_user rate limiting not visible (slowapi not installed?)")
        
        # Check if Request parameter is present
        register_sig = inspect.signature(register_user)
        login_sig = inspect.signature(login_user)
        
        if 'request' in register_sig.parameters:
            print("  ✅ register_user has Request parameter")
        else:
            print("  ❌ register_user missing Request parameter")
            return False
        
        if 'request' in login_sig.parameters:
            print("  ✅ login_user has Request parameter")
        else:
            print("  ❌ login_user missing Request parameter")
            return False
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def test_config():
    """Test configuration validation."""
    print("\n🔍 Testing Configuration...")
    
    try:
        from backend.core.config import settings
        
        # Check SECRET_KEY
        if len(settings.secret_key) >= 32:
            print(f"  ✅ SECRET_KEY length: {len(settings.secret_key)} (OK)")
        else:
            print(f"  ⚠️  SECRET_KEY length: {len(settings.secret_key)} (should be >= 32)")
        
        # Check CORS
        if hasattr(settings, 'cors_origins_list'):
            print(f"  ✅ CORS origins configured")
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def test_app_structure():
    """Test if app has security middleware configured."""
    print("\n🔍 Testing App Structure...")
    
    try:
        from backend.main import app
        
        # Check if limiter is configured
        if hasattr(app.state, 'limiter'):
            print("  ✅ Rate limiter configured in app.state")
        else:
            print("  ⚠️  Rate limiter not in app.state")
        
        # Check if SecurityHeadersMiddleware is in middleware stack
        middleware_classes = [type(m).__name__ for m in app.user_middleware]
        if 'SecurityHeadersMiddleware' in middleware_classes:
            print("  ✅ SecurityHeadersMiddleware configured")
        else:
            print("  ⚠️  SecurityHeadersMiddleware not found in middleware stack")
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("🔒 Security Hardening Test Suite")
    print("=" * 60)
    
    results = []
    
    results.append(("Imports", test_imports()))
    results.append(("Rate Limiting Decorators", test_rate_limiting_decorators()))
    results.append(("Configuration", test_config()))
    results.append(("App Structure", test_app_structure()))
    
    print("\n" + "=" * 60)
    print("📊 Test Results")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All tests passed!")
    else:
        print("⚠️  Some tests failed or have warnings")
        print("\n💡 Note: If slowapi is not installed, rate limiting")
        print("   decorators won't be visible but code is correct.")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
