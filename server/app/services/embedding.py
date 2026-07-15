"""Embedding client used by the retrieval service."""

from __future__ import annotations

from typing import Sequence

import httpx

from app.config import settings


class EmbeddingClient:
    """Small OpenAI-compatible embedding client with a safe fallback path."""

    def __init__(self, provider: str | None = None):
        self.provider = (provider or settings.EMBEDDING_PROVIDER).strip().lower()

    def configured(self) -> bool:
        if self.provider != "openai_compatible":
            return False
        return all(
            [
                settings.EMBEDDING_API_KEY.strip(),
                settings.EMBEDDING_BASE_URL.strip(),
                settings.EMBEDDING_MODEL.strip(),
            ]
        )

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]] | None:
        """Return dense vectors, or None when the embedding service is unavailable."""
        if not texts or not self.configured():
            return None

        base_url = settings.EMBEDDING_BASE_URL.rstrip("/")
        url = f"{base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {settings.EMBEDDING_API_KEY}",
            "Content-Type": "application/json",
        }
        body = {
            "model": settings.EMBEDDING_MODEL,
            "input": list(texts),
        }

        try:
            response = httpx.post(
                url,
                json=body,
                headers=headers,
                timeout=settings.EMBEDDING_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json().get("data", [])
            ordered = sorted(data, key=lambda item: item.get("index", 0))
            vectors = [item.get("embedding", []) for item in ordered]
            if len(vectors) != len(texts) or any(not vector for vector in vectors):
                return None
            return vectors
        except Exception:
            return None


embedding_client = EmbeddingClient()
