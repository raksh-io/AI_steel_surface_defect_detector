"""
Storage Service Module
======================
Handles image file storage using Supabase Storage when configured,
with automatic fallback to local disk storage if Supabase credentials are missing.
"""

import logging
import os
import uuid
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy initialization of Supabase client
_supabase_client = None


def get_supabase_client():
    """Returns the initialized Supabase client if URL and KEY are set, else None."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase client initialized successfully for storage.")
            return _supabase_client
        except Exception as exc:
            logger.error(f"Failed to initialize Supabase client: {exc}")
            return None
    return None


def upload_image_data(data: bytes, prefix: str, content_type: str = "image/png") -> str:
    """
    Upload raw image bytes to Supabase Storage if configured.
    Falls back to local disk storage (UPLOAD_DIR) if Supabase is unconfigured or fails.
    
    Returns:
        Public URL (if stored in Supabase) or relative filename (if stored locally).
    """
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.png"
    client = get_supabase_client()

    if client:
        try:
            bucket_name = settings.SUPABASE_STORAGE_BUCKET
            # Upload file bytes to Supabase storage bucket
            client.storage.from_(bucket_name).upload(
                file=data,
                path=filename,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            # Retrieve public URL for the uploaded asset
            public_url = client.storage.from_(bucket_name).get_public_url(filename)
            logger.info(f"Successfully uploaded {filename} to Supabase bucket '{bucket_name}'")
            return public_url
        except Exception as exc:
            logger.warning(f"Supabase upload failed for {filename}: {exc}. Falling back to local storage.")

    # Local disk fallback
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    logger.info(f"Saved {filename} to local disk storage at {filepath}")
    return filename
