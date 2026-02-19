"""Deep Research Agent (Paid Feature).

Performs multi-step web research using Tavily API with planning,
searching, synthesizing, and generating interactive reports.
"""

from typing import Annotated, TypedDict, Literal, Optional, List, Dict
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages

from app.agents.llm_provider import get_chat_model
from app.agents.html_generator import generate_interactive_html
from app.storage.s3 import storage_service
from app.config import get_settings

settings = get_settings()


class ResearchState(TypedDict):
    """State for the deep research graph."""
    messages: Annotated[list, add_messages]
    query: str
    provider: str
    research_plan: List[str]
    search_results: List[Dict[str, str]]
    synthesis: str
    report_html_url: Optional[str]
    iteration: int
    max_iterations: int


RESEARCH_PLANNER_PROMPT = """You are a research planning assistant. Given a user's question,
break it down into 3-5 specific search queries that would help answer it comprehensively.

Return ONLY a JSON array of search queries, nothing else.
Example: ["query 1", "query 2", "query 3"]

User question: {query}"""

SYNTHESIS_PROMPT = """You are a research synthesis assistant. Given the following search results,
create a comprehensive, well-structured research report.

## Search Results:
{results}

## Original Question:
{query}

Write a detailed report with:
1. Executive summary
2. Key findings organized by theme
3. Supporting evidence and sources
4. Conclusions and recommendations

Also generate an interactive React component that visualizes the key findings.
Wrap the React code in ```interactive tags.

Use Mermaid diagrams for relationships, Chart.js for data, and clean Tailwind styling.
"""


async def plan_research(state: ResearchState) -> ResearchState:
    """Break the query into search sub-queries."""
    llm = get_chat_model(provider=state.get("provider", "gemini"), temperature=0.2)
    result = await llm.ainvoke([
        HumanMessage(content=RESEARCH_PLANNER_PROMPT.format(query=state["query"]))
    ])

    import json
    try:
        queries = json.loads(result.content.strip())
    except json.JSONDecodeError:
        queries = [state["query"]]

    return {**state, "research_plan": queries}


async def execute_search(state: ResearchState) -> ResearchState:
    """Execute web searches using Tavily."""
    from tavily import TavilyClient

    client = TavilyClient(api_key=settings.tavily_api_key)
    all_results = []

    for query in state.get("research_plan", [state["query"]]):
        try:
            response = client.search(query=query, max_results=5, search_depth="advanced")
            for result in response.get("results", []):
                all_results.append({
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", ""),
                    "query": query,
                })
        except Exception:
            continue

    return {**state, "search_results": all_results}


async def synthesize_results(state: ResearchState) -> ResearchState:
    """Synthesize search results into a comprehensive report."""
    llm = get_chat_model(provider=state.get("provider", "gemini"), temperature=0.3)

    results_text = "\n\n".join([
        f"### {r['title']}\nSource: {r['url']}\n{r['content']}"
        for r in state.get("search_results", [])
    ])

    result = await llm.ainvoke([
        HumanMessage(content=SYNTHESIS_PROMPT.format(
            results=results_text, query=state["query"]
        ))
    ])

    # Extract and store interactive output
    content = result.content
    html_url = None

    if "```interactive" in content:
        parts = content.split("```interactive")
        if len(parts) >= 2:
            code_block = parts[1].split("```")[0].strip()
            html_content = generate_interactive_html(
                title=f"Research: {state['query'][:50]}",
                react_code=code_block,
            )
            html_url = storage_service.upload_html_artifact(html_content)
            content = parts[0].strip() + f"\n\n<!-- INTERACTIVE_OUTPUT: {html_url} -->"

    return {
        **state,
        "synthesis": content,
        "report_html_url": html_url,
        "messages": [AIMessage(content=content)],
    }


def create_research_graph():
    """Create the deep research LangGraph."""
    graph = StateGraph(ResearchState)

    graph.add_node("plan", plan_research)
    graph.add_node("search", execute_search)
    graph.add_node("synthesize", synthesize_results)

    graph.add_edge(START, "plan")
    graph.add_edge("plan", "search")
    graph.add_edge("search", "synthesize")
    graph.add_edge("synthesize", END)

    return graph.compile()


research_agent = create_research_graph()
