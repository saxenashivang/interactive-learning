from __future__ import annotations
"""Firebase authentication middleware for FastAPI."""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth, credentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.db.session import get_db
from app.db.models import User

settings = get_settings()
security = HTTPBearer()

# Initialize Firebase Admin SDK
_firebase_app = None


def _init_firebase():
    """Initialize Firebase Admin SDK (lazy)."""
    global _firebase_app
    if _firebase_app is not None:
        return

    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        _firebase_app = firebase_admin.initialize_app(cred)
    elif settings.firebase_project_id:
        _firebase_app = firebase_admin.initialize_app(
            options={"projectId": settings.firebase_project_id}
        )
    else:
        # For local dev without Firebase
        _firebase_app = firebase_admin.initialize_app()


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify Firebase ID token and return decoded claims."""
    _init_firebase()

    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: dict = Depends(verify_firebase_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get or create the current user from Firebase token."""
    firebase_uid = token.get("uid")
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Invalid token: no uid")

    # Look up user
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-create user on first login
        user = User(
            firebase_uid=firebase_uid,
            email=token.get("email", ""),
            display_name=token.get("name", token.get("email", "").split("@")[0]),
            avatar_url=token.get("picture"),
        )
        db.add(user)
        await db.flush()

    return user
