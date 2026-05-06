"""
MatchingEngine — computes job match score from keyword overlap and semantic similarity.

Match score is a weighted combination:
  overall_score = KEYWORD_WEIGHT * keyword_score + SEMANTIC_WEIGHT * semantic_score

where:
  keyword_score  = |resume_skills ∩ required_skills| / |required_skills| × 100
  semantic_score = cosine_similarity(resume_embedding, jd_embedding) × 100
"""
from __future__ import annotations

import numpy as np

from app.models import MatchResult


class MatchingEngine:
    """Compute job match score as a weighted blend of keyword and semantic scores."""

    KEYWORD_WEIGHT: float = 0.6
    SEMANTIC_WEIGHT: float = 0.4

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def compute_match(
        self,
        resume_skills: list[str],
        jd_required_skills: list[str],
        resume_embedding: np.ndarray,
        jd_embedding: np.ndarray,
    ) -> MatchResult:
        """Return a MatchResult with overall, keyword, and semantic scores (0–100)."""
        keyword_score = self._keyword_score(resume_skills, jd_required_skills)
        semantic_score = self._semantic_score(resume_embedding, jd_embedding)
        overall = self.KEYWORD_WEIGHT * keyword_score + self.SEMANTIC_WEIGHT * semantic_score
        return MatchResult(
            overall_score=round(overall, 4),
            keyword_score=round(keyword_score, 4),
            semantic_score=round(semantic_score, 4),
        )

    # ------------------------------------------------------------------
    # Internal scorers
    # ------------------------------------------------------------------

    def _keyword_score(
        self,
        resume_skills: list[str],
        jd_required_skills: list[str],
    ) -> float:
        """Intersection-over-required keyword score in [0, 100].

        Returns 0 when required_skills is empty (no requirements → no penalty).
        """
        if not jd_required_skills:
            return 0.0
        resume_set = {s.lower().strip() for s in resume_skills}
        required_set = {s.lower().strip() for s in jd_required_skills}
        matched = len(resume_set & required_set)
        return (matched / len(required_set)) * 100.0

    def _semantic_score(
        self,
        resume_embedding: np.ndarray,
        jd_embedding: np.ndarray,
    ) -> float:
        """Cosine similarity scaled to [0, 100]."""
        from app.components.embedding_engine import EmbeddingEngine
        engine = EmbeddingEngine()
        return engine.cosine_similarity(resume_embedding, jd_embedding) * 100.0
