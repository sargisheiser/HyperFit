"""
File upload validation and security utilities.
"""

import os
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    Image = None  # type: ignore

try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

from backend.core.config import settings
from backend.core.sanitization import sanitize_filename

# MIME type mappings for allowed image types
ALLOWED_MIME_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
}

ALLOWED_EXTENSIONS = {ext for extensions in ALLOWED_MIME_TYPES.values() for ext in extensions}


def validate_file_size(file: UploadFile, max_size: int | None = None) -> None:
    """
    Validate file size before processing.

    Args:
        file: UploadFile to validate
        max_size: Maximum file size in bytes (defaults to config.max_file_size)

    Raises:
        HTTPException: If file is too large
    """
    if max_size is None:
        max_size = settings.max_file_size

    # Get file size by reading it
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {max_size / (1024 * 1024):.1f}MB"
        )


def validate_file_extension(filename: str) -> str:
    """
    Validate and normalize file extension.

    Args:
        filename: Original filename

    Returns:
        Normalized extension (lowercase, with dot)

    Raises:
        HTTPException: If extension is not allowed
    """
    # Sanitize filename first
    safe_filename = sanitize_filename(filename)

    # Extract extension
    ext = Path(safe_filename).suffix.lower()

    if not ext or ext not in ALLOWED_EXTENSIONS:
        allowed = ', '.join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {allowed}"
        )

    return ext


def validate_image_content(file: UploadFile) -> tuple[str, str]:
    """
    Validate image file content using MIME type detection and PIL.

    Args:
        file: UploadFile to validate

    Returns:
        Tuple of (mime_type, extension)

    Raises:
        HTTPException: If file is not a valid image or type doesn't match
    """
    # Read first bytes for MIME detection
    file.file.seek(0)
    header = file.file.read(1024)
    file.file.seek(0)

    # Detect MIME type using python-magic if available, otherwise use content type
    if HAS_MAGIC:
        try:
            mime_type = magic.from_buffer(header, mime=True)
        except Exception:
            # Fallback to uploaded content type
            mime_type = file.content_type or 'application/octet-stream'
    else:
        # Fallback to uploaded content type (less secure, but better than nothing)
        mime_type = file.content_type or 'application/octet-stream'

    # Validate MIME type
    if mime_type not in ALLOWED_MIME_TYPES:
        allowed = ', '.join(sorted(ALLOWED_MIME_TYPES.keys()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{mime_type}' not allowed. Allowed types: {allowed}"
        )

    # Get expected extension for this MIME type
    expected_extensions = ALLOWED_MIME_TYPES[mime_type]

    # Validate filename extension matches MIME type
    filename_ext = Path(sanitize_filename(file.filename)).suffix.lower()
    if filename_ext not in expected_extensions:
        # Extension doesn't match MIME type - use first expected extension
        filename_ext = expected_extensions[0]

    # Validate image with PIL if available
    if HAS_PIL:
        try:
            file.file.seek(0)
            with Image.open(file.file) as img:  # type: ignore
                # Verify it's actually an image
                img.verify()
            file.file.seek(0)  # Reset after verify
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}"
            )
    # If PIL not available, skip image verification (less secure, but allows fallback)

    return mime_type, filename_ext


def generate_secure_filename(original_filename: str, user_id: int | None = None) -> str:
    """
    Generate a secure filename for storage.

    Args:
        original_filename: Original filename from upload
        user_id: Optional user ID for user-specific directory structure

    Returns:
        Secure filename for storage
    """
    # Sanitize original filename
    safe_name = sanitize_filename(original_filename)

    # Generate random prefix for additional security
    random_prefix = secrets.token_urlsafe(16)

    # Extract extension
    ext = Path(safe_name).suffix.lower()

    # Build secure filename: random_prefix_userid_originalname.ext
    if user_id:
        secure_name = f"{random_prefix}_{user_id}_{Path(safe_name).stem}{ext}"
    else:
        secure_name = f"{random_prefix}_{Path(safe_name).stem}{ext}"

    # Limit total length
    if len(secure_name) > 255:
        name_part = secure_name.rsplit(ext, 1)[0]
        secure_name = name_part[:255 - len(ext)] + ext

    return secure_name


def validate_upload_path(upload_dir: str, filename: str) -> Path:
    """
    Validate and create secure upload path.

    Args:
        upload_dir: Base upload directory
        filename: Filename to store

    Returns:
        Path object for the file

    Raises:
        HTTPException: If path is invalid or traversal detected
    """
    # Normalize and validate base directory
    base_path = Path(upload_dir).resolve()

    # Ensure upload directory exists
    base_path.mkdir(parents=True, exist_ok=True)

    # Sanitize filename
    safe_filename = sanitize_filename(filename)

    # Build full path
    full_path = base_path / safe_filename

    # Security check: ensure path is still within base directory (prevent traversal)
    try:
        full_path.resolve().relative_to(base_path.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path detected"
        )

    return full_path


def validate_image_upload(file: UploadFile, user_id: int | None = None) -> tuple[Path, str]:
    """
    Complete validation pipeline for image uploads.

    Args:
        file: UploadFile to validate
        user_id: Optional user ID

    Returns:
        Tuple of (storage_path, secure_filename)

    Raises:
        HTTPException: If validation fails
    """
    # 1. Validate file size
    validate_file_size(file)

    # 2. Validate file extension
    validate_file_extension(file.filename)

    # 3. Validate image content (MIME type + PIL verification)
    mime_type, validated_ext = validate_image_content(file)

    # 4. Generate secure filename
    secure_filename = generate_secure_filename(file.filename, user_id)

    # Ensure extension matches validated extension
    secure_filename = Path(secure_filename).stem + validated_ext

    # 5. Validate and create storage path
    storage_path = validate_upload_path(settings.upload_dir, secure_filename)

    return storage_path, secure_filename
