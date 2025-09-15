"""
Semantic Extraction Handler for Python Embedding Service

Implements KeyBERT-based key phrase extraction and other semantic analysis methods.
Part of Sprint 1: Foundation & KeyBERT Key Phrases implementation.
"""

import logging
from typing import List, Tuple, Optional, Dict, Any
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

    def __init__(self, model: Optional[SentenceTransformer] = None):
        """
        Initialize the semantic extraction handler.

        Args:
            model: SentenceTransformer model to use for embeddings
        """
        self.model = model
        self.kw_model = None

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
        stop_words: str = 'english'
    ) -> List[str]:
        """
        Extract key phrases using KeyBERT with MMR for diversity.

        Args:
            text: Input text to extract phrases from
            ngram_range: Range of n-grams to consider (min, max)
            use_mmr: Use Maximal Marginal Relevance for diversity
            diversity: Diversity factor (0-1) when using MMR
            top_n: Number of top phrases to return
            stop_words: Language for stop words or 'english'

        Returns:
            List of extracted key phrases (without scores)
        """
        if not self.kw_model:
            raise RuntimeError("KeyBERT not available or not initialized")

        try:
            # Extract keywords with scores
            keywords = self.kw_model.extract_keywords(
                text,
                keyphrase_ngram_range=ngram_range,
                use_mmr=use_mmr,
                diversity=diversity,
                top_n=top_n,
                stop_words=stop_words
            )

            # Return just the phrases (not scores)
            phrases = [kw[0] for kw in keywords]

            # Log extraction metrics
            multiword_count = sum(1 for p in phrases if ' ' in p)
            multiword_ratio = multiword_count / len(phrases) * 100 if phrases else 0

            logger.debug(f"Extracted {len(phrases)} phrases, {multiword_ratio:.1f}% multiword")

            return phrases

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