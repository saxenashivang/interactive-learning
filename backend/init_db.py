"""Create all database tables."""
from __future__ import annotations

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.db.models import Base
from app.config import get_settings

async def init_db():
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("✅ All tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())
