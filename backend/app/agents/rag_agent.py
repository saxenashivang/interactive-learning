from __future__ import annotations
"""RAG Agent for context-aware chat with uploaded documents.

Handles PDF and image uploads by:
1. Loading documents with LangChain document loaders
2. Splitting into chunks
3. Generating embeddings
4. Storing in pgvector
5. Retrieving relevant chunks for context-aware responses
"""

import io
from typing import BinaryIO

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.agents.llm_provider import get_embedding_model
from app.config import get_settings

settings = get_settings()


class RAGService:
    """Service for document processing and retrieval."""

    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        self._embedding_model = None

    @property
    def embedding_model(self):
        if self._embedding_model is None:
            self._embedding_model = get_embedding_model()
        return self._embedding_model

    async def process_pdf(self, file_content: bytes, filename: str) -> list[Document]:
        """Process a PDF file into document chunks."""
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(file_content))
        documents = []

        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                documents.append(Document(
                    page_content=text,
                    metadata={
                        "source": filename,
                        "page": page_num + 1,
                        "type": "pdf",
                    },
                ))

        # Split into chunks
        chunks = self.text_splitter.split_documents(documents)
        return chunks

    async def process_image(self, file_content: bytes, filename: str) -> list[Document]:
        """Process an image by extracting text (OCR placeholder or vision model)."""
        # For now, create a document with image metadata
        # In production, use a vision model (Gemini Vision) to describe the image
        doc = Document(
            page_content=f"[Image: {filename}] — Image uploaded for visual context.",
            metadata={
                "source": filename,
                "type": "image",
            },
        )
        return [doc]

    async def generate_embeddings(self, chunks: list[Document]) -> list[list[float]]:
        """Generate embeddings for document chunks."""
        texts = [chunk.page_content for chunk in chunks]
        embeddings = await self.embedding_model.aembed_documents(texts)
        return embeddings

    async def search_similar(
        self, query: str, embeddings_with_texts: list[tuple[list[float], str]], top_k: int = 5
    ) -> list[str]:
        """Search for similar chunks using cosine similarity.

        Note: This is a simplified in-memory version.
        Production should query pgvector directly.
        """
        import numpy as np

        query_embedding = await self.embedding_model.aembed_query(query)
        query_vec = np.array(query_embedding)

        similarities = []
        for emb, text in embeddings_with_texts:
            emb_vec = np.array(emb)
            similarity = np.dot(query_vec, emb_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(emb_vec)
            )
            similarities.append((similarity, text))

        similarities.sort(key=lambda x: x[0], reverse=True)
        return [text for _, text in similarities[:top_k]]


# Singleton
rag_service = RAGService()
