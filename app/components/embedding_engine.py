"""
EmbeddingEngine — optimized sentence-transformer embeddings with Redis caching.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Optional, List

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingEngine:
    _instance = None  # singleton

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(EmbeddingEngine, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        if hasattr(self, "_initialized"):
            return
        self._model_name = model_name
        self._model = None
        self._initialized = True

    def _load_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading model: %s", self._model_name)
            self._model = SentenceTransformer(self._model_name)
        return self._model

    def _cache_key(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def embed(self, text: str) -> np.ndarray:
        text = text.lower().strip()
        key = self._cache_key(text)

        cached = self._get_cached(key)
        if cached is not None:
            return cached

        model = self._load_model()
        vector = model.encode(text, convert_to_numpy=True).astype(np.float32)

        self._set_cached(key, vector)
        return vector

    def embed_batch(self, texts: List[str]) -> List[np.ndarray]:
        model = self._load_model()
        texts = [t.lower().strip() for t in texts]

        embeddings = []
        missing_texts = []
        missing_indices = []

        # check cache
        for i, text in enumerate(texts):
            key = self._cache_key(text)
            cached = self._get_cached(key)
            if cached is not None:
                embeddings.append(cached)
            else:
                embeddings.append(None)
                missing_texts.append(text)
                missing_indices.append(i)

        # batch encode missing
        if missing_texts:
            new_vectors = model.encode(missing_texts, convert_to_numpy=True)
            for idx, vec in zip(missing_indices, new_vectors):
                vec = vec.astype(np.float32)
                embeddings[idx] = vec
                self._set_cached(self._cache_key(texts[idx]), vec)

        return embeddings

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        if a is None or b is None:
            return 0.0
        a = a.astype(np.float64)
        b = b.astype(np.float64)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.clip(np.dot(a, b) / (norm_a * norm_b), 0.0, 1.0))

    def _get_cached(self, key: str) -> Optional[np.ndarray]:
        try:
            from app.cache import get_embedding
            return get_embedding(key)
        except Exception:
            return None

    def _set_cached(self, key: str, vector: np.ndarray):
        try:
            from app.cache import set_embedding
            set_embedding(key, vector, ttl_seconds=settings.embedding_ttl_seconds)
        except Exception:
            pass