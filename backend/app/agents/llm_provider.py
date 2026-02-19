from __future__ import annotations
"""Multi-provider LLM factory for Gemini, OpenAI, and Anthropic."""

from langchain_core.language_models import BaseChatModel
from app.config import get_settings

settings = get_settings()


def get_chat_model(provider: str | None = None, **kwargs) -> BaseChatModel:
    """Get a chat model instance for the specified provider.

    Args:
        provider: One of "gemini", "openai", "anthropic". Defaults to config.
        **kwargs: Additional model parameters (temperature, max_tokens, etc.)

    Returns:
        A LangChain chat model instance.
    """
    provider = provider or settings.default_llm_provider
    defaults = {"temperature": 0.7, "streaming": True}
    defaults.update(kwargs)

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=defaults.pop("model", "gemini-2.0-flash"),
            google_api_key=settings.google_api_key,
            **defaults,
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=defaults.pop("model", "gpt-4o"),
            api_key=settings.openai_api_key,
            **defaults,
        )

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=defaults.pop("model", "claude-sonnet-4-20250514"),
            api_key=settings.anthropic_api_key,
            **defaults,
        )

    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


def get_embedding_model(provider: str | None = None):
    """Get an embedding model for vector storage."""
    provider = provider or settings.default_llm_provider

    if provider == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.google_api_key,
        )

    elif provider == "openai":
        from langchain_openai import OpenAIEmbeddings

        return OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=settings.openai_api_key,
        )

    else:
        # Default to Gemini for embeddings
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.google_api_key,
        )
