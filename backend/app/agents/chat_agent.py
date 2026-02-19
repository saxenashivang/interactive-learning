from __future__ import annotations
"""Chat agent using LangGraph — always produces HTML card output."""

from typing import TypedDict, Optional, List, Literal

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from app.agents.llm_provider import get_chat_model
from app.agents.html_generator import generate_interactive_html
from app.storage.s3 import storage_service


class ChatState(TypedDict):
    messages: list
    user_id: str
    project_id: str
    conversation_id: str
    provider: str
    plan_tier: str
    context_chunks: List[str]
    interactive_html_url: Optional[str]
    should_generate_interactive: bool
    uploaded_file_ids: List[str]
    status_log: List[str]


SYSTEM_PROMPT = """You are LearnFlow, an interactive AI learning assistant.

IMPORTANT: You MUST respond using the ```interactive format. NEVER use plain markdown. Every response must be a React component.

Write a React component that renders inside `<div id="root">`. Keep the code CONCISE (under 100 lines).

Available CDN libraries: React 18, Mermaid.js, Chart.js, Leaflet.js, Tailwind CSS (with custom dark theme).

Format:
```interactive
const App = () => {
    return (
        <div className="glass p-6 animate-fade-in max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold gradient-text mb-4">Title</h1>
            <p className="text-surface-200 leading-relaxed mb-4">Explanation...</p>
            {/* Use Mermaid for diagrams - PREFERRED over custom SVG */}
            <div className="mermaid">
                graph TD
                    A[Start] --> B[Process] --> C[End]
            </div>
        </div>
    );
};
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

CSS classes: `.glass` (card), `.gradient-text` (purple gradient), `.animate-fade-in`

Rules:
- ALWAYS use Mermaid.js for flowcharts, trees, sequences — NOT custom SVG
- Use Chart.js for data charts — NOT custom canvas drawing
- Keep explanations concise — 2-3 paragraphs max, let visuals speak
- Use emoji in headings for visual flair
- Use Tailwind classes for layout (grid, flex, gap, p-, m-, text-, bg-)
- Dark theme: use bg-surface-800, bg-surface-900, text-surface-200, border-primary-500/20
- NEVER exceed 100 lines of JSX code — be concise!
"""


# ---------- Nodes ----------

async def route_message(state: ChatState) -> ChatState:
    """Analyze the message (currently just passes through)."""
    log = list(state.get("status_log", []))
    log.append("🔍 Analyzing your question...")
    return {**state, "status_log": log, "should_generate_interactive": True}


async def generate_response(state: ChatState) -> ChatState:
    """Generate the AI response — always as interactive HTML."""
    log = list(state.get("status_log", []))
    log.append("🧠 Generating response with interactive visuals...")

    llm = get_chat_model(provider=state.get("provider", "anthropic"))

    system_msg = SystemMessage(content=SYSTEM_PROMPT)
    messages = [system_msg]

    # Add RAG context if available
    if state.get("context_chunks"):
        context = "\n\n---\n\n".join(state["context_chunks"])
        messages.append(SystemMessage(
            content=f"## Relevant Document Context:\n{context}\n\nUse this context to ground your response."
        ))

    messages.extend(state["messages"])
    response = await llm.ainvoke(messages)
    
    log.append("✅ Response generated")
    return {**state, "messages": [response], "status_log": log}


async def extract_and_store_interactive(state: ChatState) -> ChatState:
    """Extract interactive HTML code and store as artifact."""
    log = list(state.get("status_log", []))
    last_msg = state["messages"][-1]
    content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

    # Check for interactive code blocks
    if "```interactive" not in content:
        log.append("⚠️ LLM did not produce interactive HTML — returning raw text")
        return {**state, "status_log": log}

    log.append("📦 Extracting interactive HTML card...")

    # Extract interactive code
    parts = content.split("```interactive")
    if len(parts) < 2:
        log.append("⚠️ Failed to parse interactive block")
        return {**state, "status_log": log}

    code_block = parts[1].split("```")[0].strip()
    text_part = parts[0].strip()

    # Generate full HTML
    title = "Interactive Learning Output"
    html_content = generate_interactive_html(title=title, react_code=code_block)

    log.append("☁️ Uploading HTML artifact to storage...")

    try:
        # Store in S3/MinIO
        artifact_url = storage_service.upload_html_artifact(html_content)
        log.append(f"✅ HTML card ready: {artifact_url}")
    except Exception as e:
        log.append(f"⚠️ S3 upload failed ({e}), using inline HTML")
        artifact_url = None

    # Build updated content with both text and inline HTML
    if text_part:
        updated_content = f"{text_part}\n\n<!-- INTERACTIVE_OUTPUT: {artifact_url or 'inline'} -->\n<!-- HTML_CONTENT_START -->\n{html_content}\n<!-- HTML_CONTENT_END -->"
    else:
        updated_content = f"<!-- INTERACTIVE_OUTPUT: {artifact_url or 'inline'} -->\n<!-- HTML_CONTENT_START -->\n{html_content}\n<!-- HTML_CONTENT_END -->"

    updated_msg = AIMessage(content=updated_content)

    return {
        **state,
        "messages": [updated_msg],
        "interactive_html_url": artifact_url,
        "status_log": log,
    }


def should_extract_interactive(state: ChatState) -> Literal["extract", "done"]:
    """Always try to extract interactive content."""
    last_msg = state["messages"][-1] if state["messages"] else None
    if last_msg and hasattr(last_msg, "content") and "```interactive" in last_msg.content:
        return "extract"
    return "done"


# ---------- Graph ----------

def create_chat_graph():
    """Create the chat agent LangGraph."""
    graph = StateGraph(ChatState)

    # Add nodes
    graph.add_node("route", route_message)
    graph.add_node("generate", generate_response)
    graph.add_node("extract_interactive", extract_and_store_interactive)

    # Add edges
    graph.add_edge(START, "route")
    graph.add_edge("route", "generate")
    graph.add_conditional_edges(
        "generate",
        should_extract_interactive,
        {
            "extract": "extract_interactive",
            "done": END,
        },
    )
    graph.add_edge("extract_interactive", END)

    return graph.compile()


# Compiled graph instance
chat_agent = create_chat_graph()
