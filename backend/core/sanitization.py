"""
Input sanitization utilities for XSS prevention.
"""

import html
import re
from typing import Any


def sanitize_string(value: str | None) -> str | None:
    """
    Sanitize a string to prevent XSS attacks.

    - Escapes HTML special characters
    - Removes potentially dangerous patterns
    - Strips leading/trailing whitespace

    Args:
        value: The string to sanitize

    Returns:
        Sanitized string or None if input was None
    """
    if value is None:
        return None

    if not isinstance(value, str):
        value = str(value)

    # Strip whitespace
    value = value.strip()

    # Escape HTML special characters
    value = html.escape(value, quote=True)

    # Remove potentially dangerous patterns
    # Remove javascript: protocol
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)

    # Remove data: protocol (can contain base64 encoded scripts)
    value = re.sub(r'data:', '', value, flags=re.IGNORECASE)

    # Remove vbscript: protocol
    value = re.sub(r'vbscript:', '', value, flags=re.IGNORECASE)

    # Remove on* event handlers that might slip through
    value = re.sub(r'\bon\w+\s*=', '', value, flags=re.IGNORECASE)

    return value


def sanitize_dict(data: dict[str, Any], fields: list[str]) -> dict[str, Any]:
    """
    Sanitize specific string fields in a dictionary.

    Args:
        data: Dictionary containing data to sanitize
        fields: List of field names to sanitize

    Returns:
        Dictionary with sanitized fields
    """
    result = data.copy()
    for field in fields:
        if field in result and isinstance(result[field], str):
            result[field] = sanitize_string(result[field])
    return result


def sanitize_html_content(value: str | None) -> str | None:
    """
    More aggressive sanitization for content that should have no HTML.
    Removes all HTML tags entirely.

    Args:
        value: The string to sanitize

    Returns:
        String with all HTML tags removed
    """
    if value is None:
        return None

    if not isinstance(value, str):
        value = str(value)

    # Remove all HTML tags
    value = re.sub(r'<[^>]+>', '', value)

    # Apply standard sanitization
    return sanitize_string(value)


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

    # Remove null bytes and control characters
    filename = filename.replace('\x00', '')
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

    return all(pattern not in normalized_path for pattern in dangerous_patterns)


def validate_email_format(email: str) -> bool:
    """
    Basic email format validation.

    Args:
        email: Email address to validate

    Returns:
        True if format appears valid
    """
    if not email or not isinstance(email, str):
        return False

    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, email.strip()))


# Fields that should be sanitized in common models
USER_SANITIZE_FIELDS = ['username', 'full_name', 'bio']
MEAL_SANITIZE_FIELDS = ['note', 'description']
WORKOUT_SANITIZE_FIELDS = ['notes', 'name', 'description']
