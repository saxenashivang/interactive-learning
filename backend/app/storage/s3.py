from __future__ import annotations
"""S3/MinIO storage service for file uploads and HTML artifacts."""

import uuid
from typing import BinaryIO

import boto3
from botocore.config import Config

from app.config import get_settings

settings = get_settings()


def _get_s3_client():
    """Create S3 client (MinIO locally, S3 in production)."""
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


class StorageService:
    """Manages file operations with S3-compatible storage."""

    def __init__(self):
        self.client = _get_s3_client()

    def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        bucket: str | None = None,
        prefix: str = "",
    ) -> str:
        """Upload a file and return the S3 key."""
        bucket = bucket or settings.s3_bucket_uploads
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        key = f"{prefix}{uuid.uuid4()}.{ext}" if ext else f"{prefix}{uuid.uuid4()}"

        self.client.upload_fileobj(
            file,
            bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return key

    def upload_html_artifact(self, html_content: str, artifact_id: str | None = None) -> str:
        """Upload a generated interactive HTML artifact. Returns the public URL."""
        bucket = settings.s3_bucket_artifacts
        artifact_id = artifact_id or str(uuid.uuid4())
        key = f"interactive/{artifact_id}.html"

        self.client.put_object(
            Bucket=bucket,
            Key=key,
            Body=html_content.encode("utf-8"),
            ContentType="text/html",
        )

        # Build public URL
        url = f"{settings.s3_endpoint_url}/{bucket}/{key}"
        return url

    def get_presigned_upload_url(
        self, filename: str, content_type: str, bucket: str | None = None
    ) -> dict:
        """Generate a presigned URL for direct browser upload."""
        bucket = bucket or settings.s3_bucket_uploads
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        key = f"uploads/{uuid.uuid4()}.{ext}"

        url = self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=3600,
        )
        return {"upload_url": url, "key": key}

    def get_presigned_download_url(self, key: str, bucket: str | None = None) -> str:
        """Generate a presigned URL for downloading a file."""
        bucket = bucket or settings.s3_bucket_uploads
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=3600,
        )

    def delete_file(self, key: str, bucket: str | None = None) -> None:
        """Delete a file from storage."""
        bucket = bucket or settings.s3_bucket_uploads
        self.client.delete_object(Bucket=bucket, Key=key)


# Singleton
storage_service = StorageService()
