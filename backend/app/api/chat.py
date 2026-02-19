from __future__ import annotations
"""Chat API endpoints with streaming support."""

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from langchain_core.messages import HumanMessage

from app.auth.firebase import get_current_user
from app.db.session import get_db
from app.db.models import User, Conversation, Message, MessageRole, PlanTier
from app.agents.chat_agent import chat_agent, ChatState
from app.agents.research_agent import research_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: UUID | None = None
    project_id: UUID
    provider: str = "gemini"
    use_deep_research: bool = False


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    is_flagged: bool
    is_saved: bool
    created_at: str

    class Config:
        from_attributes = True


class FlagRequest(BaseModel):
    is_flagged: bool


class SaveRequest(BaseModel):
    is_saved: bool


@router.post("/send")
async def send_message(
    req: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a streamed AI response."""
    # Check deep research access
    if req.use_deep_research and user.plan_tier == PlanTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Deep research requires a Pro or Team subscription.",
        )

    # Get or create conversation
    if req.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == req.conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            project_id=req.project_id,
            title=req.message[:100],
            llm_provider=req.provider,
        )
        db.add(conversation)
        await db.flush()

    # Save human message
    human_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.HUMAN,
        content=req.message,
    )
    db.add(human_msg)
    await db.flush()

    # Load conversation history
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history = result.scalars().all()

    # Convert to LangChain messages
    lc_messages = []
    for msg in history:
        if msg.role == MessageRole.HUMAN:
            lc_messages.append(HumanMessage(content=msg.content))

    # Choose agent and run
    ai_content = ""
    interactive_url = None
    html_content = None
    status_log = []

    try:
        if req.use_deep_research:
            state = {
                "messages": lc_messages,
                "query": req.message,
                "provider": req.provider,
                "research_plan": [],
                "search_results": [],
                "synthesis": "",
                "report_html_url": None,
                "iteration": 0,
                "max_iterations": 3,
            }
            result_state = await research_agent.ainvoke(state)
        else:
            state: ChatState = {
                "messages": lc_messages,
                "user_id": str(user.id),
                "project_id": str(req.project_id),
                "conversation_id": str(conversation.id),
                "provider": req.provider,
                "plan_tier": user.plan_tier.value,
                "context_chunks": [],
                "interactive_html_url": None,
                "should_generate_interactive": False,
                "uploaded_file_ids": [],
                "status_log": [],
            }
            result_state = await chat_agent.ainvoke(state)

        # Extract AI response
        if result_state.get("messages"):
            last_msg = result_state["messages"][-1]
            ai_content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

        interactive_url = result_state.get("interactive_html_url") or result_state.get("report_html_url")
        status_log = result_state.get("status_log", [])

        # Extract inline HTML if present
        if "<!-- HTML_CONTENT_START -->" in ai_content:
            html_start = ai_content.index("<!-- HTML_CONTENT_START -->") + len("<!-- HTML_CONTENT_START -->")
            html_end = ai_content.index("<!-- HTML_CONTENT_END -->")
            html_content = ai_content[html_start:html_end].strip()
        
        # Clean the stored content (remove inline HTML for DB storage)
        if "<!-- HTML_CONTENT_START -->" in ai_content:
            ai_content_clean = ai_content[:ai_content.index("<!-- HTML_CONTENT_START -->")].strip()
        else:
            ai_content_clean = ai_content
        
        print(f"📊 Status log: {status_log}")
        print(f"📄 HTML content present: {html_content is not None}")
        print(f"🔗 Interactive URL: {interactive_url}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        ai_content_clean = f"I encountered an error while processing your request: {str(e)}"
        status_log.append(f"❌ Error: {str(e)}")

    # Save AI message
    ai_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.AI,
        content=ai_content_clean,
        has_interactive=html_content is not None or interactive_url is not None,
        interactive_html_url=interactive_url,
    )
    db.add(ai_msg)
    await db.flush()

    return {
        "conversation_id": str(conversation.id),
        "message_id": str(ai_msg.id),
        "content": ai_content_clean,
        "has_interactive": html_content is not None or interactive_url is not None,
        "interactive_html_url": interactive_url,
        "html_content": html_content,
        "status_log": status_log,
    }


@router.get("/conversations/{project_id}")
async def list_conversations(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all conversations for a project."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.project_id == project_id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "title": c.title,
            "is_flagged": c.is_flagged,
            "is_saved": c.is_saved,
            "llm_provider": c.llm_provider,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in conversations
    ]


@router.get("/messages/{conversation_id}")
async def get_messages(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a conversation."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "role": m.role.value,
            "content": m.content,
            "has_interactive": m.has_interactive,
            "interactive_html_url": m.interactive_html_url,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.patch("/conversations/{conversation_id}/flag")
async def toggle_flag(
    conversation_id: UUID,
    req: FlagRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Flag/unflag a conversation."""
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(is_flagged=req.is_flagged)
    )
    return {"status": "ok"}


@router.patch("/conversations/{conversation_id}/save")
async def toggle_save(
    conversation_id: UUID,
    req: SaveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save/unsave a conversation."""
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(is_saved=req.is_saved)
    )
    return {"status": "ok"}
