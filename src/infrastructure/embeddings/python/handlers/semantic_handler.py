"""
Semantic Extraction Handler for Python Embedding Service

Implements KeyBERT-based key phrase extraction and other semantic analysis methods.
Part of Sprint 1: Foundation & KeyBERT Key Phrases implementation.
"""

import logging
import os
import time
from datetime import datetime
from typing import List, Tuple, Optional, Dict, Any, Union
from sentence_transformers import SentenceTransformer


try:
    from keybert import KeyBERT
    KEYBERT_AVAILABLE = True
except ImportError:
    KEYBERT_AVAILABLE = False
    logging.warning("KeyBERT not available. Install with: pip install keybert")

logger = logging.getLogger(__name__)


class SemanticExtractionHandler:
    """
    Handles semantic extraction using KeyBERT and other NLP techniques.
    Designed to achieve >80% multiword phrase extraction.
    """

    def __init__(self, model: Optional[SentenceTransformer] = None, embedding_handler=None):
        """
        Initialize the semantic extraction handler.

        Args:
            model: SentenceTransformer model to use for embeddings
            embedding_handler: Parent embedding handler for tracking operations
        """
        self.model = model
        self.kw_model = None
        self.embedding_handler = embedding_handler

        if KEYBERT_AVAILABLE and model:
            try:
                self.kw_model = KeyBERT(model=model)
                logger.info("KeyBERT initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize KeyBERT: {e}")
                self.kw_model = None

    def is_available(self) -> bool:
        """Check if KeyBERT is available and initialized."""
        return self.kw_model is not None

    def extract_keyphrases(
        self,
        text: str,
        ngram_range: Tuple[int, int] = (1, 3),
        use_mmr: bool = True,
        diversity: float = 0.5,
        top_n: int = 10,
        stop_words: str = 'english',
        structured_candidates: Optional[Dict[str, List[str]]] = None,
        content_zones: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Union[str, float]]]:
        """
        Extract key phrases using KeyBERT with MMR for diversity and weighted scoring.

        Args:
            text: Input text to extract phrases from
            ngram_range: Range of n-grams to consider (min, max)
            use_mmr: Use Maximal Marginal Relevance for diversity
            diversity: Diversity factor (0-1) when using MMR
            top_n: Number of top phrases to return
            stop_words: Language for stop words or 'english'
            structured_candidates: Dictionary of structured candidates from document parsing
            content_zones: List of content zones with importance weights

        Returns:
            List of extracted key phrases with weighted semantic scores
            Format: [{"text": phrase, "score": combined_relevance_score}, ...]
        """
        if not self.kw_model:
            raise RuntimeError("KeyBERT not available or not initialized")

        try:
            start_time = time.time()

            # Track this operation to prevent keep-alive unloading
            if self.embedding_handler and hasattr(self.embedding_handler, 'increment_active_operations'):
                self.embedding_handler.increment_active_operations()

            try:
                # Extract more keywords than needed to allow for boosting and re-ranking
                extraction_multiplier = 2 if structured_candidates else 1
                initial_top_n = min(top_n * extraction_multiplier, 50)  # Cap at 50 to avoid performance issues

                # Extract keywords with scores
                keywords = self.kw_model.extract_keywords(
                    text,
                    keyphrase_ngram_range=ngram_range,
                    use_mmr=use_mmr,
                    diversity=diversity,
                    top_n=initial_top_n,
                    stop_words=stop_words
                )

                elapsed = time.time() - start_time

                # Convert to scored object format
                scored_phrases = [{"text": kw[0], "score": float(kw[1])} for kw in keywords]

                # Apply weighted scoring if structured candidates are provided
                if structured_candidates:
                    scored_phrases = self._apply_weighted_scoring(scored_phrases, structured_candidates)

                # Sort by final score and limit to requested number
                scored_phrases.sort(key=lambda x: x["score"], reverse=True)
                scored_phrases = scored_phrases[:top_n]

                # Log extraction metrics
                multiword_count = sum(1 for item in scored_phrases if ' ' in item["text"])
                multiword_ratio = multiword_count / len(scored_phrases) * 100 if scored_phrases else 0

                if structured_candidates:
                    structured_count = sum(1 for item in scored_phrases
                                         if self._is_structured_phrase(item["text"], structured_candidates))
                    structured_ratio = structured_count / len(scored_phrases) * 100 if scored_phrases else 0
                    logger.debug(f"Extracted {len(scored_phrases)} phrases, {multiword_ratio:.1f}% multiword, {structured_ratio:.1f}% structured")
                else:
                    logger.debug(f"Extracted {len(scored_phrases)} phrases, {multiword_ratio:.1f}% multiword")

                return scored_phrases

            finally:
                # Always decrement operation counter
                if self.embedding_handler and hasattr(self.embedding_handler, 'decrement_active_operations'):
                    self.embedding_handler.decrement_active_operations()

        except Exception as e:
            logger.error(f"KeyBERT extraction failed: {e}")
            raise

    def extract_keyphrases_with_scores(
        self,
        text: str,
        ngram_range: Tuple[int, int] = (1, 3),
        use_mmr: bool = True,
        diversity: float = 0.5,
        top_n: int = 10,
        stop_words: str = 'english'
    ) -> List[Tuple[str, float]]:
        """
        Extract key phrases with their relevance scores.

        Returns:
            List of (phrase, score) tuples
        """
        if not self.kw_model:
            raise RuntimeError("KeyBERT not available or not initialized")

        keywords = self.kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=ngram_range,
            use_mmr=use_mmr,
            diversity=diversity,
            top_n=top_n,
            stop_words=stop_words
        )

        return keywords

    def update_model(self, model: SentenceTransformer):
        """
        Update the model used for extraction.

        Args:
            model: New SentenceTransformer model
        """
        self.model = model
        if KEYBERT_AVAILABLE:
            try:
                self.kw_model = KeyBERT(model=model)
                logger.info("KeyBERT model updated")
            except Exception as e:
                logger.error(f"Failed to update KeyBERT model: {e}")
                self.kw_model = None

    def _apply_weighted_scoring(self, scored_phrases: List[Dict[str, Union[str, float]]],
                              structured_candidates: Dict[str, List[str]]) -> List[Dict[str, Union[str, float]]]:
        """
        Apply weighted scoring to balance structured candidates with KeyBERT scores.

        Balances headers vs content to avoid 100% formatting-based extraction.
        """
        for phrase_item in scored_phrases:
            phrase = phrase_item["text"]
            keybert_score = phrase_item["score"]

            # Check if phrase matches structured candidates and get weight
            structural_weight = self._get_structural_weight(phrase, structured_candidates)

            # Balanced scoring: 30% structural weight, 70% KeyBERT semantic score
            # This ensures content keywords still have strong influence
            if structural_weight > 0.4:  # Only boost if it's truly a structured element
                final_score = structural_weight * 0.3 + keybert_score * 0.7
            else:
                final_score = keybert_score  # No boost for non-structured phrases

            phrase_item["score"] = final_score

        return scored_phrases

    def _get_structural_weight(self, phrase: str, structured_candidates: Dict[str, List[str]]) -> float:
        """Get the structural importance weight for a phrase."""
        phrase_lower = phrase.lower()

        # Check metadata (highest weight)
        if structured_candidates.get('metadata'):
            for metadata in structured_candidates['metadata']:
                if metadata.lower() in phrase_lower or phrase_lower in metadata.lower():
                    return 1.0

        # Check headers (high weight)
        if structured_candidates.get('headers'):
            for header in structured_candidates['headers']:
                if header.lower() in phrase_lower or phrase_lower in header.lower():
                    return 0.9

        # Check entities (medium-high weight)
        if structured_candidates.get('entities'):
            for entity in structured_candidates['entities']:
                if entity.lower() in phrase_lower or phrase_lower in entity.lower():
                    return 0.8

        # Check emphasized text (medium weight)
        if structured_candidates.get('emphasized'):
            for emphasized in structured_candidates['emphasized']:
                if emphasized.lower() in phrase_lower or phrase_lower in emphasized.lower():
                    return 0.7

        # Check captions (low-medium weight)
        if structured_candidates.get('captions'):
            for caption in structured_candidates['captions']:
                if caption.lower() in phrase_lower or phrase_lower in caption.lower():
                    return 0.6

        return 0.4  # Default weight for regular content

    def _is_structured_phrase(self, phrase: str, structured_candidates: Dict[str, List[str]]) -> bool:
        """Check if a phrase comes from structured candidates."""
        return self._get_structural_weight(phrase, structured_candidates) > 0.4