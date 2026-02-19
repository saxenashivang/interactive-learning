from __future__ import annotations
"""Firebase authentication middleware for FastAPI."""

import asyncio
import traceback
from functools import partial

from fastapi import Depends, HTTPException, status
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

    try:
        if settings.firebase_credentials_path:
            cred = credentials.Certificate(settings.firebase_credentials_path)
            _firebase_app = firebase_admin.initialize_app(cred)
        elif settings.firebase_project_id:
            _firebase_app = firebase_admin.initialize_app(
                options={"projectId": settings.firebase_project_id}
            )
        else:
            _firebase_app = firebase_admin.initialize_app()
        print("✅ Firebase Admin SDK initialized")
    except ValueError:
        # Already initialized
        _firebase_app = firebase_admin.get_app()
        print("✅ Firebase Admin SDK already initialized")


def _verify_token_sync(token_str: str) -> dict:
    """Synchronous token verification (runs in thread pool)."""
    return auth.verify_id_token(token_str)


async def verify_firebase_token(
    cred: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify Firebase ID token and return decoded claims."""
    _init_firebase()

    try:
        # Run blocking Firebase call in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        decoded_token = await loop.run_in_executor(
            None, partial(_verify_token_sync, cred.credentials)
        )
        return decoded_token
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
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

    try:
        # Look up user
        result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
        user = result.scalar_one_or_none()

        if user is None:
            # Auto-create user on first login
            print(f"📝 Creating new user: {token.get('email', 'unknown')}")
            user = User(
                firebase_uid=firebase_uid,
                email=token.get("email", ""),
                display_name=token.get("name", token.get("email", "").split("@")[0]),
                avatar_url=token.get("picture"),
            )
            db.add(user)
            await db.flush()
            print(f"✅ User created: {user.id}")
        else:
            print(f"✅ User found: {user.id}")

        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ get_current_user error: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"User lookup failed: {str(e)}",
        )
