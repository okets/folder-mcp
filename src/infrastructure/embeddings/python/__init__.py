"""
Python Embeddings System for Folder MCP

This module provides high-performance embedding generation using sentence-transformers
with automatic GPU detection and priority-based processing.
"""

__version__ = "1.0.0"
__author__ = "Folder MCP Team"

from .handlers.embedding_handler import EmbeddingHandler
from .models.embedding_request import EmbeddingRequest, EmbeddingResponse

__all__ = [
    "EmbeddingHandler",
    "EmbeddingRequest", 
    "EmbeddingResponse"
]