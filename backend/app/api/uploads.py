from __future__ import annotations
"""File upload API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.firebase import get_current_user
from app.db.session import get_db
from app.db.models import User, Upload, UploadStatus, DocumentChunk
from app.storage.s3 import storage_service
from app.agents.rag_agent import rag_service

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "image/png": "image",
    "image/jpeg": "image",
    "image/webp": "image",
    "image/gif": "image",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    project_id: UUID = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file (PDF or image) and process for RAG."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {list(ALLOWED_TYPES.keys())}",
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    # Upload to S3
    s3_key = storage_service.upload_file(
        file=__import__("io").BytesIO(content),
        filename=file.filename or "upload",
        content_type=file.content_type,
        prefix=f"projects/{project_id}/",
    )

    # Create upload record
    upload = Upload(
        project_id=project_id,
        filename=file.filename or "upload",
        content_type=file.content_type,
        size_bytes=len(content),
        s3_key=s3_key,
        status=UploadStatus.PROCESSING,
    )
    db.add(upload)
    await db.flush()

    # Process document for RAG
    try:
        file_type = ALLOWED_TYPES[file.content_type]

        if file_type == "pdf":
            chunks = await rag_service.process_pdf(content, file.filename)
        else:
            chunks = await rag_service.process_image(content, file.filename)

        # Generate embeddings
        if chunks:
            embeddings = await rag_service.generate_embeddings(chunks)

            # Store chunks with embeddings
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                db_chunk = DocumentChunk(
                    upload_id=upload.id,
                    content=chunk.page_content,
                    page_number=chunk.metadata.get("page"),
                    chunk_index=i,
                    embedding=embedding,
                    metadata_=chunk.metadata,
                )
                db.add(db_chunk)

        upload.status = UploadStatus.READY
        upload.chunk_count = len(chunks)

    except Exception as e:
        upload.status = UploadStatus.FAILED
        upload.metadata_ = {"error": str(e)}

    await db.flush()

    return {
        "id": str(upload.id),
        "filename": upload.filename,
        "status": upload.status.value,
        "chunk_count": upload.chunk_count,
        "size_bytes": upload.size_bytes,
    }


@router.get("/{project_id}")
async def list_uploads(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all uploads for a project."""
    result = await db.execute(
        select(Upload)
        .where(Upload.project_id == project_id)
        .order_by(Upload.created_at.desc())
    )
    uploads = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "filename": u.filename,
            "content_type": u.content_type,
            "size_bytes": u.size_bytes,
            "status": u.status.value,
            "chunk_count": u.chunk_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in uploads
    ]


@router.get("/presigned-url")
async def get_presigned_url(
    filename: str,
    content_type: str,
    user: User = Depends(get_current_user),
):
    """Get a presigned URL for direct browser upload."""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    return storage_service.get_presigned_upload_url(filename, content_type)
