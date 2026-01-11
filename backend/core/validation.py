"""
Input validation and sanitization utilities for security.
"""

import re
from typing import Optional
from html import escape as html_escape


def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize a string input by removing dangerous characters.
    
    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length (None for no limit)
    
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        value = str(value)
    
    # Strip whitespace
    value = value.strip()
    
    # Remove null bytes (potential for injection)
    value = value.replace('\x00', '')
    
    # Remove control characters except newline and tab
    value = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', '', value)
    
    # Apply length limit
    if max_length and len(value) > max_length:
        value = value[:max_length]
    
    return value


def sanitize_html(value: str) -> str:
    """
    Escape HTML special characters to prevent XSS.
    
    Args:
        value: Input string that may contain HTML
    
    Returns:
        HTML-escaped string
    """
    if not isinstance(value, str):
        value = str(value)
    
    return html_escape(value, quote=True)


def validate_email_format(email: str) -> bool:
    """
    Basic email format validation.
    Note: Pydantic's EmailStr provides more comprehensive validation.
    This is an additional check.
    
    Args:
        email: Email address to validate
    
    Returns:
        True if format appears valid
    """
    if not email or not isinstance(email, str):
        return False
    
    # Basic pattern check (Pydantic does more comprehensive validation)
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, email.strip()))


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and injection.
    
    Args:
        filename: Original filename
    
    Returns:
        Sanitized filename safe for file system operations
    """
    if not isinstance(filename, str):
        filename = str(filename)
    
    # Remove path components
    filename = filename.replace('/', '').replace('\\', '')
    
    # Remove parent directory references
    filename = filename.replace('..', '')
    
    # Remove null bytes
    filename = filename.replace('\x00', '')
    
    # Remove control characters
    filename = re.sub(r'[\x00-\x1F]', '', filename)
    
    # Keep only safe characters: alphanumeric, dots, hyphens, underscores
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:250] + ('.' + ext if ext else '')
    
    # Ensure filename is not empty
    if not filename:
        filename = 'file'
    
    return filename


def validate_path_traversal(path: str) -> bool:
    """
    Check if a path contains path traversal sequences.
    
    Args:
        path: Path to validate
    
    Returns:
        True if path appears safe, False if contains traversal sequences
    """
    if not isinstance(path, str):
        return False
    
    dangerous_patterns = ['..', '../', '..\\', '/etc/', '/var/', '/usr/', 'C:\\', '\\Windows\\']
    
    normalized_path = path.replace('\\', '/')
    
    for pattern in dangerous_patterns:
        if pattern in normalized_path:
            return False
    
    return True
