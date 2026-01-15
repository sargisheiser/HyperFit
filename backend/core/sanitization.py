"""
Input sanitization utilities for XSS prevention.
"""

import html
import re
from typing import Any, Optional


def sanitize_string(value: Optional[str]) -> Optional[str]:
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


def sanitize_html_content(value: Optional[str]) -> Optional[str]:
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


# Fields that should be sanitized in common models
USER_SANITIZE_FIELDS = ['username', 'full_name', 'bio']
MEAL_SANITIZE_FIELDS = ['note', 'description']
WORKOUT_SANITIZE_FIELDS = ['notes', 'name', 'description']
