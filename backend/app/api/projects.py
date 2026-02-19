from __future__ import annotations
"""Project and Category management API."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.auth.firebase import get_current_user
from app.db.session import get_db
from app.db.models import User, Project, Category

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    category_id: UUID | None = None
    color: str = "#6366f1"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category_id: UUID | None = None
    color: str | None = None
    is_archived: bool | None = None


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = None


@router.get("/")
async def list_projects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all projects for the current user."""
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user.id, Project.is_archived == False)
        .order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "category_id": str(p.category_id) if p.category_id else None,
            "color": p.color,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]


@router.post("/")
async def create_project(
    req: ProjectCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project."""
    project = Project(
        user_id=user.id,
        name=req.name,
        description=req.description,
        category_id=req.category_id,
        color=req.color,
    )
    db.add(project)
    await db.flush()
    return {"id": str(project.id), "name": project.name}


@router.patch("/{project_id}")
async def update_project(
    project_id: UUID,
    req: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a project."""
    values = {k: v for k, v in req.model_dump().items() if v is not None}
    if values:
        await db.execute(
            update(Project)
            .where(Project.id == project_id, Project.user_id == user.id)
            .values(**values)
        )
    return {"status": "ok"}


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project and all related data."""
    await db.execute(
        delete(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    return {"status": "ok"}


# ---------- Categories ----------

@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all categories."""
    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "description": c.description,
            "icon": c.icon,
            "is_system": c.is_system,
        }
        for c in categories
    ]


@router.post("/categories")
async def create_category(
    req: CategoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a custom category."""
    slug = req.name.lower().replace(" ", "-")
    category = Category(
        name=req.name,
        slug=slug,
        description=req.description,
        icon=req.icon,
    )
    db.add(category)
    await db.flush()
    return {"id": str(category.id), "name": category.name, "slug": slug}
