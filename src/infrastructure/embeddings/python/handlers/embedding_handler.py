"""
Core embedding handler with priority-based processing and crawling pause mechanism.
"""

import asyncio
import logging
import threading
import time
import traceback
from datetime import datetime
from queue import Queue, PriorityQueue, Empty
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

try:
    from sentence_transformers import SentenceTransformer
    import torch
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    DEPENDENCIES_AVAILABLE = False

from models.embedding_request import (
    EmbeddingRequest, 
    EmbeddingResponse, 
    EmbeddingVector,
    HealthCheckResponse
)
from utils.device_detection import (
    detect_optimal_device, 
    get_memory_info, 
    optimize_torch_settings,
    validate_device_compatibility,
    get_optimal_batch_size
)
from utils.supported_models import validate_model, get_process_management_config


logger = logging.getLogger(__name__)


@dataclass
class QueuedRequest:
    """Internal representation of a queued embedding request"""
    priority: int  # 0 = immediate, 1 = batch
    timestamp: float
    request: EmbeddingRequest
    future: asyncio.Future
    
    def __lt__(self, other):
        """Priority queue comparison - lower numbers = higher priority"""
        if self.priority != other.priority:
            return self.priority < other.priority
        return self.timestamp < other.timestamp


class EmbeddingHandler:
    """
    High-performance embedding handler with priority-based processing.
    
    Features:
    - Automatic GPU/MPS/CPU detection
    - Priority-based queue system (immediate vs batch)
    - Crawling pause mechanism for immediate requests
    - Background thread processing
    - Health monitoring and graceful shutdown
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        if not DEPENDENCIES_AVAILABLE:
            raise ImportError(
                "Required dependencies not available. Please install: "
                "sentence-transformers, torch, transformers"
            )
        
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.device = "cpu"
        self.device_info = {}
        
        # Threading and queues
        self.request_queue = PriorityQueue()
        self.processing_thread: Optional[threading.Thread] = None
        self.shutdown_event = threading.Event()
        self.model_loaded_event = threading.Event()
        
        # Load process management configuration
        self.process_config = get_process_management_config()
        
        # Log configuration for debugging
        logger.info(f"Process management config: {self.process_config}")
        
        # Crawling pause mechanism  
        self.last_immediate_request = 0.0
        self.crawling_pause_duration = float(self.process_config['crawling_pause_seconds'])
        self.is_batch_paused = False
        
        # Keep-alive mechanism
        self.last_activity_time = time.time()
        self.keep_alive_duration = float(self.process_config['keep_alive_seconds'])
        self.shutdown_grace_period = float(self.process_config['shutdown_grace_period_seconds'])
        self.keep_alive_timer: Optional[threading.Timer] = None
        self.shutdown_requested = False
        
        # Statistics
        self.start_time = time.time()
        self.requests_processed = 0
        self.immediate_requests_processed = 0
        self.batch_requests_processed = 0
        
        # State
        self.is_running = False
        self.current_request: Optional[QueuedRequest] = None
        
        # Batch optimization
        self.optimal_batch_size = 32  # Will be updated after device detection
        
    async def initialize(self) -> bool:
        """
        Initialize the embedding handler.
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            logger.info(f"Initializing EmbeddingHandler with model: {self.model_name}")
            
            # Detect optimal device
            self.device, self.device_info = detect_optimal_device()
            logger.info(f"Using device: {self.device}")
            
            # Validate compatibility
            if not validate_device_compatibility(self.model_name, self.device):
                logger.error(f"Model {self.model_name} not compatible with device {self.device}")
                return False
            
            # Apply device optimizations
            optimize_torch_settings(self.device)
            
            # Set optimal batch size for detected device
            self.optimal_batch_size = get_optimal_batch_size(self.device, self.model_name)
            logger.info(f"Optimal batch size for {self.device}: {self.optimal_batch_size}")
            
            # Load model in background thread to avoid blocking
            model_loading_thread = threading.Thread(
                target=self._load_model_sync,
                daemon=True
            )
            model_loading_thread.start()
            
            # Start processing thread
            self.processing_thread = threading.Thread(
                target=self._processing_loop,
                daemon=True
            )
            self.processing_thread.start()
            self.is_running = True
            
            logger.info("EmbeddingHandler initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize EmbeddingHandler: {e}")
            logger.error(traceback.format_exc())
            return False
    
    def _load_model_sync(self) -> None:
        """Load the sentence transformer model synchronously in background thread"""
        try:
            logger.info(f"Loading model {self.model_name} on {self.device}...")
            
            # FIX: Handle PyTorch meta tensor issue properly
            # The error "Cannot copy out of meta tensor" suggests we need to use to_empty()
            # Try different device loading strategies in order of preference
            
            try:
                # First attempt: Load directly on target device
                self.model = SentenceTransformer(self.model_name, device=self.device)
                logger.info(f"Model loaded directly on {self.device}")
            except Exception as device_error:
                logger.warning(f"Direct device loading failed: {device_error}")
                try:
                    # Second attempt: Load on CPU first, then use to_empty() for proper device transfer
                    logger.info("Attempting CPU load with proper device transfer...")
                    self.model = SentenceTransformer(self.model_name, device='cpu')
                    
                    if self.device != 'cpu':
                        # Use to_empty() instead of to() to handle meta tensors properly
                        logger.info(f"Using to_empty() for device transfer to {self.device}")
                        try:
                            # This is the proper way to handle meta tensors in newer PyTorch
                            import torch
                            if hasattr(torch.nn.Module, 'to_empty'):
                                self.model = self.model.to_empty(device=self.device)
                                logger.info(f"Model transferred to {self.device} using to_empty()")
                            else:
                                # Fallback for older PyTorch versions
                                self.model = self.model.to(self.device)
                                logger.info(f"Model transferred to {self.device} using to()")
                        except Exception as transfer_error:
                            logger.warning(f"Device transfer failed, keeping CPU: {transfer_error}")
                            self.device = 'cpu'
                    
                except Exception as cpu_error:
                    logger.error(f"CPU loading also failed: {cpu_error}")
                    raise cpu_error
            
            self.model_loaded_event.set()
            logger.info(f"Model {self.model_name} loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            logger.error(traceback.format_exc())
    
    async def generate_embeddings(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """
        Generate embeddings for the given request.
        
        Args:
            request: EmbeddingRequest containing texts and metadata
            
        Returns:
            EmbeddingResponse with generated embeddings
        """
        if not self.is_running:
            return EmbeddingResponse(
                embeddings=[],
                success=False,
                processing_time_ms=0,
                model_info={},
                request_id=request.request_id,
                error="Handler not running"
            )
        
        start_time = time.time()
        
        try:
            # Wait for model to be loaded (with timeout)
            max_wait = 30.0  # 30 seconds
            wait_start = time.time()
            while not self.model_loaded_event.is_set():
                if time.time() - wait_start > max_wait:
                    raise TimeoutError("Model loading timeout")
                await asyncio.sleep(0.1)
            
            if self.model is None:
                raise RuntimeError("Model not loaded")
            
            # Update activity tracking
            if request.immediate:
                self.last_immediate_request = time.time()
                self.is_batch_paused = True
                self._reset_keep_alive_timer()
            
            self.last_activity_time = time.time()
            
            # Generate embeddings directly (run in thread pool to avoid blocking)
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                None, 
                self._generate_embeddings_sync, 
                request.texts
            )
            
            # Create response
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            response = EmbeddingResponse(
                embeddings=embeddings,
                success=True,
                processing_time_ms=processing_time_ms,
                model_info=self._get_model_info(),
                request_id=request.request_id
            )
            
            # Update statistics
            self.requests_processed += 1
            if request.immediate:
                self.immediate_requests_processed += 1
            else:
                self.batch_requests_processed += 1
            
            logger.info(f"Successfully processed {'immediate' if request.immediate else 'batch'} request "
                       f"with {len(request.texts)} texts in {processing_time_ms}ms")
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            processing_time_ms = int((time.time() - start_time) * 1000)
            return EmbeddingResponse(
                embeddings=[],
                success=False,
                processing_time_ms=processing_time_ms,
                model_info=self._get_model_info(),
                request_id=request.request_id,
                error=str(e)
            )
    
    def _processing_loop(self) -> None:
        """Main processing loop running in background thread"""
        logger.info("Processing loop started")
        
        while not self.shutdown_event.is_set():
            try:
                # Check crawling pause
                if self.is_batch_paused:
                    time_since_immediate = time.time() - self.last_immediate_request
                    if time_since_immediate >= self.crawling_pause_duration:
                        self.is_batch_paused = False
                        logger.debug("Crawling pause expired - batch processing resumed")
                
                # Get next request (with timeout to check shutdown)
                try:
                    queued_request = self.request_queue.get(timeout=1.0)
                except Empty:
                    continue
                
                # Check if batch request should be paused
                if queued_request.priority == 1 and self.is_batch_paused:
                    # Put batch request back and wait
                    self.request_queue.put(queued_request)
                    time.sleep(0.1)
                    continue
                
                # Process the request
                self.current_request = queued_request
                self._process_request(queued_request)
                self.current_request = None
                
                # Mark task as done
                self.request_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
                logger.error(traceback.format_exc())
                time.sleep(0.1)
        
        logger.info("Processing loop stopped")
    
    def _process_request(self, queued_request: QueuedRequest) -> None:
        """Process a single embedding request"""
        start_time = time.time()
        request = queued_request.request
        
        try:
            # Wait for model to be loaded
            if not self.model_loaded_event.wait(timeout=30.0):
                raise TimeoutError("Model loading timeout")
            
            if self.model is None:
                raise RuntimeError("Model not loaded")
            
            # Generate embeddings
            embeddings = self._generate_embeddings_sync(request.texts)
            
            # Create response
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            response = EmbeddingResponse(
                embeddings=embeddings,
                success=True,
                processing_time_ms=processing_time_ms,
                model_info=self._get_model_info(),
                request_id=request.request_id
            )
            
            # Update statistics
            self.requests_processed += 1
            if request.immediate:
                self.immediate_requests_processed += 1
            else:
                self.batch_requests_processed += 1
            
            # Set result - need to do this in a thread-safe way for asyncio
            logger.info(f"DEBUG: About to set result for request {request.request_id}")
            try:
                # Try to get the event loop and schedule the result setting
                import asyncio
                loop = asyncio.get_event_loop()
                loop.call_soon_threadsafe(queued_request.future.set_result, response)
                logger.info(f"DEBUG: Successfully scheduled result for request {request.request_id}")
            except RuntimeError:
                # Fallback to direct setting if no event loop
                queued_request.future.set_result(response)
                logger.info(f"DEBUG: Successfully set result directly for request {request.request_id}")
            
            logger.debug(
                f"Processed {'immediate' if request.immediate else 'batch'} request "
                f"with {len(request.texts)} texts in {processing_time_ms}ms"
            )
            
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            
            # Create error response
            processing_time_ms = int((time.time() - start_time) * 1000)
            error_response = EmbeddingResponse(
                embeddings=[],
                success=False,
                processing_time_ms=processing_time_ms,
                model_info=self._get_model_info(),
                request_id=request.request_id,
                error=str(e)
            )
            
            # Set error result in thread-safe way
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                loop.call_soon_threadsafe(queued_request.future.set_result, error_response)
            except RuntimeError:
                queued_request.future.set_result(error_response)
    
    def _generate_embeddings_sync(self, texts: List[str]) -> List[EmbeddingVector]:
        """Generate embeddings synchronously using sentence-transformers"""
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        # Generate embeddings
        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=False,
            device=self.device
        )
        
        # Convert to EmbeddingVector objects
        results = []
        timestamp = datetime.utcnow().isoformat()
        
        for i, embedding in enumerate(embeddings):
            vector = EmbeddingVector(
                vector=embedding.tolist(),
                dimensions=len(embedding),
                model=self.model_name,
                created_at=timestamp,
                chunk_id=f"chunk_{i}_{int(time.time())}"
            )
            results.append(vector)
        
        return results
    
    def get_health_status(self) -> HealthCheckResponse:
        """Get current health status"""
        uptime = int(time.time() - self.start_time)
        queue_size = self.request_queue.qsize()
        
        # Determine status
        if not self.is_running:
            status = 'unhealthy'
        elif not self.model_loaded_event.is_set():
            status = 'degraded'
        else:
            status = 'healthy'
        
        # Get memory info
        try:
            memory_info = get_memory_info(self.device)
            memory_usage = memory_info.get('used_mb', 0)
            if isinstance(memory_usage, str):
                memory_usage = 0.0
        except:
            memory_usage = 0.0
        
        return HealthCheckResponse(
            status=status,
            model_loaded=self.model_loaded_event.is_set(),
            gpu_available=self.device != 'cpu',
            memory_usage_mb=float(memory_usage),
            uptime_seconds=uptime,
            queue_size=queue_size
        )
    
    def _get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            'model_name': self.model_name,
            'device': self.device,
            'device_info': self.device_info,
            'model_loaded': self.model_loaded_event.is_set(),
            'requests_processed': self.requests_processed,
            'immediate_requests': self.immediate_requests_processed,
            'batch_requests': self.batch_requests_processed
        }
    
    def download_model(self, request: dict) -> dict:
        """Download model with progress reporting for JSON-RPC"""
        model_name = request.get('model_name')
        
        if not validate_model(model_name):
            return {
                'success': False,
                'error': f'Model {model_name} not in supported list',
                'progress': 0
            }
        
        try:
            # Check if already cached
            if self.is_model_cached(model_name):
                return {
                    'success': True,
                    'message': f'Model {model_name} already cached',
                    'progress': 100
                }
            
            logger.info(f"Downloading model {model_name}...")
            
            # Download model - sentence-transformers handles caching automatically
            # This will download to ~/.cache/torch/sentence_transformers/
            model = SentenceTransformer(model_name)
            
            return {
                'success': True,
                'message': f'Model {model_name} downloaded successfully',
                'progress': 100
            }
            
        except Exception as e:
            logger.error(f"Failed to download model {model_name}: {e}")
            return {
                'success': False,
                'error': str(e),
                'progress': 0
            }

    def is_model_cached(self, model_name: str) -> bool:
        """Check if model is already in sentence-transformers cache"""
        try:
            import os
            from pathlib import Path
            
            # Check default sentence-transformers cache directory
            cache_dir = Path.home() / '.cache' / 'torch' / 'sentence_transformers'
            
            # Model directory name (sentence-transformers replaces '/' with '_')
            model_dir = cache_dir / model_name.replace('/', '_')
            
            # Check if model directory exists and contains required files
            if model_dir.exists() and (model_dir / 'config.json').exists():
                return True
                
            # Alternative: try to check if model files exist by looking for common files
            common_files = ['config.json', 'pytorch_model.bin', 'tokenizer.json']
            if model_dir.exists() and any((model_dir / f).exists() for f in common_files):
                return True
                
            return False
        except Exception as e:
            logger.warning(f"Failed to check cache for model {model_name}: {e}")
            return False
    
    async def shutdown(self, timeout_seconds: int = 30) -> bool:
        """
        Gracefully shutdown the embedding handler.
        
        Args:
            timeout_seconds: Maximum time to wait for shutdown
            
        Returns:
            True if shutdown completed successfully
        """
        logger.info(f"Shutting down EmbeddingHandler with {timeout_seconds}s timeout...")
        
        try:
            # Signal shutdown immediately
            self.shutdown_requested = True
            self.shutdown_event.set()
            self.is_running = False
            
            # Cancel keep-alive timer immediately
            self._cancel_keep_alive_timer()
            
            # Give processing thread a shorter timeout (max 50% of total timeout)
            thread_timeout = min(timeout_seconds * 0.5, 5.0)  # Max 5 seconds for thread shutdown
            
            # Wait for processing thread to finish
            if self.processing_thread and self.processing_thread.is_alive():
                logger.info(f"Waiting up to {thread_timeout}s for processing thread to stop...")
                self.processing_thread.join(timeout=thread_timeout)
                
                if self.processing_thread.is_alive():
                    logger.warning(f"Processing thread did not stop within {thread_timeout}s timeout - proceeding anyway")
                    # Don't return False - continue with cleanup
            
            # Clear model from GPU memory quickly
            if self.model and self.device != 'cpu':
                try:
                    logger.info("Clearing GPU memory...")
                    del self.model
                    self.model = None
                    if self.device == 'cuda':
                        import torch
                        torch.cuda.empty_cache()
                        logger.info("GPU memory cleared")
                except Exception as gpu_error:
                    logger.warning(f"Error clearing GPU memory (non-fatal): {gpu_error}")
            
            logger.info("EmbeddingHandler shutdown completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
            # Still return True if we get here - we tried our best
            return True
    
    def _reset_keep_alive_timer(self) -> None:
        """Reset the keep-alive timer for immediate requests"""
        try:
            # Cancel existing timer
            if self.keep_alive_timer:
                self.keep_alive_timer.cancel()
                self.keep_alive_timer = None
            
            # Don't set new timer if shutdown is requested
            if self.shutdown_requested:
                return
                
            # Set new timer for keep-alive period
            self.keep_alive_timer = threading.Timer(
                self.keep_alive_duration,
                self._handle_keep_alive_timeout
            )
            self.keep_alive_timer.daemon = True
            self.keep_alive_timer.start()
            
            logger.debug(f"Keep-alive timer reset for {self.keep_alive_duration} seconds")
            
        except Exception as e:
            logger.warning(f"Failed to reset keep-alive timer: {e}")
    
    def _handle_keep_alive_timeout(self) -> None:
        """Handle keep-alive timeout - initiate graceful shutdown"""
        try:
            logger.info(f"Keep-alive timeout reached ({self.keep_alive_duration}s since last immediate request)")
            logger.info("Initiating graceful shutdown due to inactivity")
            
            # Mark shutdown as requested
            self.shutdown_requested = True
            
            # Start shutdown process in separate thread to avoid blocking
            shutdown_thread = threading.Thread(
                target=self._graceful_shutdown_worker,
                daemon=True
            )
            shutdown_thread.start()
            
        except Exception as e:
            logger.error(f"Error during keep-alive timeout handling: {e}")
    
    def _graceful_shutdown_worker(self) -> None:
        """Worker thread for graceful shutdown"""
        try:
            # Wait a bit for any in-flight requests to complete
            time.sleep(1.0)
            
            # Signal shutdown to processing loop
            self.shutdown_event.set()
            self.is_running = False
            
            logger.info("Graceful shutdown initiated by keep-alive timeout")
            
        except Exception as e:
            logger.error(f"Error during graceful shutdown: {e}")
    
    def _cancel_keep_alive_timer(self) -> None:
        """Cancel the keep-alive timer"""
        try:
            if self.keep_alive_timer:
                self.keep_alive_timer.cancel()
                self.keep_alive_timer = None
                logger.debug("Keep-alive timer cancelled")
        except Exception as e:
            logger.warning(f"Failed to cancel keep-alive timer: {e}")