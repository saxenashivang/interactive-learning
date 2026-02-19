"""Main Chat Agent using LangGraph with multi-provider LLM support.

This agent handles:
1. Regular conversational responses
2. Deciding when to generate interactive HTML output
3. Integrating with RAG for context-aware responses
4. Routing to deep research agent for paid users
"""

from typing import Annotated, TypedDict, Literal, Optional, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages

from app.agents.llm_provider import get_chat_model
from app.agents.html_generator import generate_interactive_html
from app.storage.s3 import storage_service


# ---------- State ----------

class ChatState(TypedDict):
    """State for the chat agent graph."""
    messages: Annotated[list, add_messages]
    user_id: str
    project_id: str
    conversation_id: str
    provider: str
    plan_tier: str
    context_chunks: List[str]  # RAG context
    interactive_html_url: Optional[str]
    should_generate_interactive: bool
    uploaded_file_ids: List[str]


# ---------- System Prompt ----------

SYSTEM_PROMPT = """You are an intelligent learning assistant that creates interactive, visual explanations.

## Your Capabilities:
- Explain concepts with rich visual diagrams, flowcharts, and interactive components
- Generate code examples with syntax highlighting
- Create interactive maps, charts, and data visualizations
- Help users understand documents they upload (PDFs, images)

## Output Format Rules:
When a concept would benefit from visual/interactive explanation, respond with TWO parts:

1. **Text explanation** — A brief, clear explanation in markdown
2. **Interactive component** — Wrap your React/JSX code in ```interactive tags

For the interactive code block, write a React component that renders inside a `<div id="root">`.
Available libraries (loaded via CDN): React 18, Mermaid.js, Leaflet.js, Chart.js, Tailwind CSS.

Example interactive block:
```interactive
const App = () => {
    return (
        <div className="glass p-6 animate-fade-in">
            <h1 className="text-2xl font-bold gradient-text mb-4">Title</h1>
            <div className="mermaid">
                graph TD
                    A[Start] --> B[End]
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

## CSS Classes Available:
- `.glass` — Glassmorphism card effect
- `.gradient-text` — Primary gradient text
- `.animate-fade-in` — Fade-in animation

## Guidelines:
- Always prefer interactive output when explaining: algorithms, data structures, network protocols, system architecture, geography, data visualizations, workflows, state machines
- For simple Q&A, just respond in text
- Be concise in text, let the visuals do the heavy lifting
- When RAG context is provided, use it to give accurate, document-grounded answers
"""


# ---------- Nodes ----------

async def route_message(state: ChatState) -> ChatState:
    """Analyze the message and decide the response strategy."""
    llm = get_chat_model(provider=state.get("provider", "gemini"), temperature=0.1)

    routing_prompt = """Analyze this user message and decide the response type.
    
Reply with EXACTLY one word:
- "interactive" — if the topic benefits from visual/interactive explanation (diagrams, maps, charts, flows)
- "text" — if a simple text response is sufficient
- "research" — if the user is asking for deep research/analysis

User message: {message}"""

    last_msg = state["messages"][-1].content if state["messages"] else ""
    result = await llm.ainvoke([HumanMessage(content=routing_prompt.format(message=last_msg))])
    response_text = result.content.strip().lower()

    should_interactive = "interactive" in response_text
    return {**state, "should_generate_interactive": should_interactive}


async def generate_response(state: ChatState) -> ChatState:
    """Generate the main AI response."""
    llm = get_chat_model(provider=state.get("provider", "gemini"))

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

    return {**state, "messages": [response]}


async def extract_and_store_interactive(state: ChatState) -> ChatState:
    """Extract interactive code blocks and store as HTML artifacts."""
    last_msg = state["messages"][-1]
    content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

    # Check for interactive code blocks
    if "```interactive" not in content:
        return state

    # Extract interactive code
    parts = content.split("```interactive")
    if len(parts) < 2:
        return state

    code_block = parts[1].split("```")[0].strip()
    text_part = parts[0].strip()

    # Generate HTML artifact
    title = "Interactive Learning Output"
    html_content = generate_interactive_html(title=title, react_code=code_block)

    # Store in S3
    artifact_url = storage_service.upload_html_artifact(html_content)

    # Update the message to include the artifact URL
    updated_content = f"{text_part}\n\n<!-- INTERACTIVE_OUTPUT: {artifact_url} -->"
    updated_msg = AIMessage(content=updated_content)

    return {
        **state,
        "messages": [updated_msg],
        "interactive_html_url": artifact_url,
    }


def should_extract_interactive(state: ChatState) -> Literal["extract", "done"]:
    """Decide whether to extract interactive content."""
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
