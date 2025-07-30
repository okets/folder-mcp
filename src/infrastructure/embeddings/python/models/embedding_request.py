"""
Data models for JSON-RPC communication between Node.js daemon and Python embeddings service.
"""

from typing import List, Optional, Dict, Any, Literal
from dataclasses import dataclass, asdict
import json


@dataclass
class EmbeddingRequest:
    """Request for embedding generation"""
    texts: List[str]
    immediate: bool = False  # Priority flag for immediate processing
    model_name: Optional[str] = None
    request_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmbeddingRequest':
        """Create from dictionary for JSON deserialization"""
        return cls(
            texts=data['texts'],
            immediate=data.get('immediate', False),
            model_name=data.get('model_name'),
            request_id=data.get('request_id')
        )


@dataclass
class EmbeddingVector:
    """Single embedding vector with metadata"""
    vector: List[float]
    dimensions: int
    model: str
    created_at: str
    chunk_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmbeddingVector':
        """Create from dictionary for JSON deserialization"""
        return cls(
            vector=data['vector'],
            dimensions=data['dimensions'],
            model=data['model'],
            created_at=data['created_at'],
            chunk_id=data.get('chunk_id')
        )


@dataclass
class EmbeddingResponse:
    """Response from embedding generation"""
    embeddings: List[EmbeddingVector]
    success: bool
    processing_time_ms: int
    model_info: Dict[str, Any]
    request_id: Optional[str] = None
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'embeddings': [emb.to_dict() for emb in self.embeddings],
            'success': self.success,
            'processing_time_ms': self.processing_time_ms,
            'model_info': self.model_info,
            'request_id': self.request_id,
            'error': self.error
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmbeddingResponse':
        """Create from dictionary for JSON deserialization"""
        return cls(
            embeddings=[EmbeddingVector.from_dict(emb) for emb in data['embeddings']],
            success=data['success'],
            processing_time_ms=data['processing_time_ms'],
            model_info=data['model_info'],
            request_id=data.get('request_id'),
            error=data.get('error')
        )


@dataclass
class HealthCheckRequest:
    """Health check request"""
    request_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HealthCheckRequest':
        return cls(request_id=data.get('request_id'))


@dataclass
class HealthCheckResponse:
    """Health check response"""
    status: Literal['healthy', 'degraded', 'unhealthy']
    model_loaded: bool
    gpu_available: bool
    memory_usage_mb: float
    uptime_seconds: int
    queue_size: int
    request_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HealthCheckResponse':
        return cls(
            status=data['status'],
            model_loaded=data['model_loaded'],
            gpu_available=data['gpu_available'],
            memory_usage_mb=data['memory_usage_mb'],
            uptime_seconds=data['uptime_seconds'],
            queue_size=data['queue_size'],
            request_id=data.get('request_id')
        )


@dataclass
class ShutdownRequest:
    """Graceful shutdown request"""
    timeout_seconds: int = 30
    request_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ShutdownRequest':
        return cls(
            timeout_seconds=data.get('timeout_seconds', 30),
            request_id=data.get('request_id')
        )


@dataclass
class ShutdownResponse:
    """Shutdown response"""
    success: bool
    message: str
    request_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ShutdownResponse':
        return cls(
            success=data['success'],
            message=data['message'],
            request_id=data.get('request_id')
        )