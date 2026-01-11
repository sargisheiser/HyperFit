"""Security helpers for authentication and token management."""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.core.config import settings

# Password hashing - Use bcrypt directly to avoid passlib compatibility issues
try:
    import bcrypt
    USE_DIRECT_BCRYPT = True
except ImportError:
    USE_DIRECT_BCRYPT = False

if not USE_DIRECT_BCRYPT:
    pwd_context = CryptContext(
        schemes=["bcrypt_sha256", "bcrypt"],
        deprecated="auto",
        default="bcrypt_sha256",
    )
else:
    pwd_context = None

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True when the plain password matches the stored hash."""
    # #region agent log
    import json
    try:
        with open('/Users/mr.heiser/PycharmProjects/HYPERFIT/.cursor/debug.log', 'a') as f:
            password_bytes_len = len(plain_password.encode('utf-8')) if plain_password else 0
            f.write(json.dumps({"id":"log_verify_entry","timestamp":int(__import__('time').time()*1000),"location":"security.py:38","message":"verify_password called","data":{"password_len":len(plain_password) if plain_password else 0,"password_bytes_len":password_bytes_len,"is_over_72":password_bytes_len > 72,"use_direct_bcrypt":USE_DIRECT_BCRYPT},"sessionId":"debug-session","runId":"post-fix","hypothesisId":"A"})+'\n')
    except: pass
    # #endregion

    if USE_DIRECT_BCRYPT:
        # Use bcrypt directly - avoids passlib compatibility issues with bcrypt 5.0.0
        # bcrypt has a 72-byte limit, so truncate if necessary (same as in hash)
        try:
            password_bytes = plain_password.encode('utf-8')
            if len(password_bytes) > 72:
                password_bytes = password_bytes[:72]
            result = bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
            # #region agent log
            try:
                with open('/Users/mr.heiser/PycharmProjects/HYPERFIT/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({"id":"log_verify_result","timestamp":int(__import__('time').time()*1000),"location":"security.py:54","message":"verify_password result (direct bcrypt)","data":{"result":result},"sessionId":"debug-session","runId":"post-fix","hypothesisId":"C"})+'\n')
            except: pass
            # #endregion
            return result
        except Exception as e:
            # #region agent log
            try:
                with open('/Users/mr.heiser/PycharmProjects/HYPERFIT/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({"id":"log_verify_error","timestamp":int(__import__('time').time()*1000),"location":"security.py:62","message":"verify_password error (direct bcrypt)","data":{"error_type":type(e).__name__,"error_msg":str(e)[:200]},"sessionId":"debug-session","runId":"post-fix","hypothesisId":"D"})+'\n')
            except: pass
            # #endregion
            return False
    else:
        # Fallback to passlib
        return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash the supplied password for persistence."""
    # #region agent log
    import json
    try:
        with open('/Users/mr.heiser/PycharmProjects/HYPERFIT/.cursor/debug.log', 'a') as f:
            password_bytes_len = len(password.encode('utf-8')) if password else 0
            f.write(json.dumps({"id":"log_get_hash_entry","timestamp":int(__import__('time').time()*1000),"location":"security.py:75","message":"get_password_hash called","data":{"password_len":len(password) if password else 0,"password_bytes_len":password_bytes_len,"is_over_72":password_bytes_len > 72,"use_direct_bcrypt":USE_DIRECT_BCRYPT},"sessionId":"debug-session","runId":"post-fix","hypothesisId":"A"})+'\n')
    except: pass
    # #endregion

    if USE_DIRECT_BCRYPT:
        # Use bcrypt directly - avoids passlib compatibility issues with bcrypt 5.0.0
        # bcrypt has a 72-byte limit, so truncate if necessary
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            # #region agent log
            try:
                with open('/Users/mr.heiser/PycharmProjects/HYPERFIT/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({"id":"log_truncate","timestamp":int(__import__('time').time()*1000),"location":"security.py:87","message":"Password truncated to 72 bytes (direct bcrypt)","data":{"original_bytes":len(password_bytes)},"sessionId":"debug-session","runId":"post-fix","hypothesisId":"A"})+'\n')
            except: pass
            # #endregion
            password_bytes = password_bytes[:72]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        result = hashed.decode('utf-8')
        # #region agent log
        try:
            with open('/Users/mr.heiser/PycharmProjects/HYPERFIT/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"id":"log_hash_success","timestamp":int(__import__('time').time()*1000),"location":"security.py:96","message":"Password hash successful (direct bcrypt)","data":{},"sessionId":"debug-session","runId":"post-fix","hypothesisId":"C"})+'\n')
        except: pass
        # #endregion
        return result
    else:
        # Fallback to passlib
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
            password = password_bytes.decode('utf-8', errors='ignore')
        return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT for the provided payload."""

    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate the supplied JWT access token."""

    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None


