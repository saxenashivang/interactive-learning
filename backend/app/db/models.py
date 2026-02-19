"""SQLAlchemy models for the Interactive Learning Platform."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    BigInteger,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector
import uuid


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


# ---------- Enums ----------

class PlanTier(str, PyEnum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"


class MessageRole(str, PyEnum):
    HUMAN = "human"
    AI = "ai"
    SYSTEM = "system"


class UploadStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class SubscriptionStatus(str, PyEnum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


# ---------- Models ----------

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    plan_tier = Column(Enum(PlanTier), default=PlanTier.FREE, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    projects = relationship("Project", back_populates="category")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#6366f1")
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="projects")
    category = relationship("Category", back_populates="projects")
    conversations = relationship("Conversation", back_populates="project", cascade="all, delete-orphan")
    uploads = relationship("Upload", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_projects_user_id", "user_id"),)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="New Chat")
    is_flagged = Column(Boolean, default=False)
    is_saved = Column(Boolean, default=False)
    llm_provider = Column(String(20), default="gemini")
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan",
                            order_by="Message.created_at")

    __table_args__ = (Index("ix_conversations_project_id", "project_id"),)


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    has_interactive = Column(Boolean, default=False)
    interactive_html_url = Column(Text, nullable=True)
    token_count = Column(Integer, default=0)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (Index("ix_messages_conversation_id", "conversation_id"),)


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    s3_key = Column(Text, nullable=False)
    status = Column(Enum(UploadStatus), default=UploadStatus.PENDING)
    chunk_count = Column(Integer, default=0)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    project = relationship("Project", back_populates="uploads")

    __table_args__ = (Index("ix_uploads_project_id", "project_id"),)


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    upload_id = Column(UUID(as_uuid=True), ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768))  # Gemini embedding dimension
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        Index("ix_document_chunks_upload_id", "upload_id"),
        Index("ix_document_chunks_embedding", "embedding",
              postgresql_using="hnsw",
              postgresql_ops={"embedding": "vector_cosine_ops"}),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stripe_customer_id = Column(String(255), nullable=False)
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    plan_tier = Column(Enum(PlanTier), nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")

    __table_args__ = (Index("ix_subscriptions_user_id", "user_id"),)


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # message_sent, upload, deep_research
    tokens_used = Column(Integer, default=0)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", back_populates="usage_logs")

    __table_args__ = (
        Index("ix_usage_logs_user_id_date", "user_id", "created_at"),
    )
