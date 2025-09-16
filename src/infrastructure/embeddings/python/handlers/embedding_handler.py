"""
Core embedding handler with priority-based processing and crawling pause mechanism.
"""

import asyncio
import json
import logging
import sys
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
    
    def __init__(self, model_name: str):
        if not DEPENDENCIES_AVAILABLE:
            raise ImportError(
                "Required dependencies not available. Please install: "
                "sentence-transformers, torch, transformers"
            )
        
        if not model_name:
            raise ValueError("Model name is required - no defaults allowed")
        
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.semantic_handler = None  # Will be initialized after model loads
        self.device = "cpu"
        self.device_info = {}
        
        # Memory management settings
        # This fraction is used consistently across all memory calculations:
        # - PyTorch MPS memory allocation (set_per_process_memory_fraction)
        # - Text size limits for chunk processing
        # - Batch size calculations
        # Using 70% leaves 30% for system, other processes, and safety margin
        self.memory_fraction = 0.7  # Single source of truth for memory limits
        self.min_batch_size = 1
        self.max_batch_size = 32  # Will be adjusted based on available memory
        
        # Threading and queues
        self.request_queue = PriorityQueue()
        self.processing_thread: Optional[threading.Thread] = None
        self.shutdown_event = threading.Event()
        self.model_loaded_event = threading.Event()
        
        # State management for race condition prevention
        self.state = 'IDLE'  # IDLE | WORKING | UNLOADING
        self.state_lock = threading.Lock()
        self.last_progress_time = 0
        self.model_loaded = False  # Track if model is loaded
        
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
            
            # Calculate optimal batch size based on available memory
            self.optimal_batch_size = self._calculate_optimal_batch_size()
            logger.info(f"Calculated optimal batch size: {self.optimal_batch_size} for {self.device}")
            
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
    
    def _send_progress(self, status: str, current: int = 0, total: int = 0, details: str = "") -> None:
        """Send progress update to Node.js via stdout"""
        progress_update = {
            'jsonrpc': '2.0',
            'method': 'progress_update',
            'params': {
                'type': 'progress',
                'status': status,
                'current': current,
                'total': total,
                'timestamp': time.time(),
                'details': details,
                'message': f"{status}: {current}/{total}" if total > 0 else status
            }
        }
        
        # Send to stdout for Node.js to receive
        print(json.dumps(progress_update), flush=True)
        self.last_progress_time = time.time()
    
    def _load_model_sync(self) -> None:
        """Load the sentence transformer model synchronously in background thread"""
        try:
            logger.info(f"Loading model {self.model_name} on {self.device}...")
            self._send_progress('loading_model', 0, 0, "Initializing model...")
            
            import os
            import torch
            from sentence_transformers import SentenceTransformer
            
            # Set MPS memory management
            if self.device == 'mps':
                os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
                
                # Apply PyTorch memory management best practices
                if hasattr(torch.mps, 'set_per_process_memory_fraction'):
                    # Use conservative memory fraction to prevent OOM
                    torch.mps.set_per_process_memory_fraction(self.memory_fraction)
                    logger.info(f"✓ MPS memory fraction set to {self.memory_fraction * 100:.0f}%")
                else:
                    # Fallback for older PyTorch versions
                    os.environ['PYTORCH_MPS_HIGH_WATERMARK_RATIO'] = '0.0'
                    os.environ['PYTORCH_MPS_LOW_WATERMARK_RATIO'] = '0.0'
                    logger.info("✓ MPS memory watermarks configured")
            
            # Check if model is already cached
            from pathlib import Path
            cache_dir = Path.home() / '.cache' / 'huggingface' / 'hub'
            model_dir = cache_dir / f"models--{self.model_name.replace('/', '--')}"
            
            if model_dir.exists() and model_dir.is_dir():
                logger.info(f"Model {self.model_name} found in cache")
                os.environ['HF_HUB_OFFLINE'] = '1'
                os.environ['TRANSFORMERS_OFFLINE'] = '1'
            
            # Load model directly on target device for MPS
            try:
                self._send_progress('loading_model', 50, 100, "Loading model to device...")
                
                if self.device == 'mps':
                    # For MPS, load directly on device to prevent memory fragmentation
                    logger.info(f"Loading model directly on MPS device")
                    if model_dir.exists():
                        try:
                            self.model = SentenceTransformer(self.model_name, device='mps', local_files_only=True)
                            logger.info(f"✓ Model loaded on MPS from cache")
                        except Exception:
                            self.model = SentenceTransformer(self.model_name, device='mps')
                            logger.info(f"✓ Model loaded on MPS")
                    else:
                        self.model = SentenceTransformer(self.model_name, device='mps')
                        logger.info(f"✓ Model loaded on MPS")
                else:
                    # For CPU or CUDA, use existing approach
                    self.model = SentenceTransformer(self.model_name, device=self.device)
                    logger.info(f"✓ Model loaded on {self.device}")
                
                self._send_progress('loading_model', 100, 100, "Model ready")
                
                # Verify model produces expected dimensions
                with torch.no_grad():
                    test_embedding = self.model.encode(["test"], convert_to_numpy=True)
                    actual_dims = test_embedding.shape[1]
                    logger.info(f"✓ Model produces {actual_dims}-dimensional embeddings")
                
                # Clear any memory used during test
                self._clear_mps_memory()
                
            except Exception as load_error:
                logger.error(f"Failed to load model {self.model_name}: {load_error}")
                raise RuntimeError(f"Cannot load model {self.model_name}: {load_error}")
            
            logger.info(f"Model device: {getattr(self.model.device, 'type', self.device)}")
            
            self.model_loaded_event.set()
            self.model_loaded = True

            # Initialize semantic handler with the loaded model
            # This is critical for KeyBERT support after model switching
            if self.model:
                try:
                    from handlers.semantic_handler import SemanticExtractionHandler
                    self.semantic_handler = SemanticExtractionHandler(self.model)
                    if self.semantic_handler.is_available():
                        logger.info("✅ SemanticExtractionHandler initialized with KeyBERT after model load")
                    else:
                        logger.warning("⚠️ SemanticExtractionHandler initialized but KeyBERT not available")
                except Exception as e:
                    logger.warning(f"Failed to initialize semantic handler: {e}")
                    self.semantic_handler = None

            logger.info(f"✓ Model {self.model_name} ready for inference")
            self._send_progress('idle', 0, 0, "Model loaded, process ready")
            
        except Exception as e:
            logger.error(f"FATAL: Model loading failed: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ['meta tensor', 'mps', 'cumsum', 'not implemented']):
                logger.error("★ MPS compatibility error detected - check PyTorch version")
            
            self.model = None
    
    def _calculate_optimal_batch_size(self) -> int:
        """
        Calculate optimal batch size based on device and model characteristics.
        
        PyTorch handles memory limits via set_per_process_memory_fraction(0.6),
        so we just need sensible defaults based on device and model type.
        """
        # Base batch size by device type
        if self.device == 'mps':
            # MPS has specific memory allocation patterns
            # Start conservative and let adaptive sizing increase if possible
            base_batch_size = 4
            
            # Further reduce for models with large context windows
            if 'bge-m3' in self.model_name.lower():
                # BGE-M3 with 8192 context needs batch_size=1 to prevent OOM
                base_batch_size = 1
            elif 'large' in self.model_name.lower():
                # Large models need smaller batches
                base_batch_size = 2
            
        elif self.device == 'cuda':
            # CUDA generally handles batching well
            base_batch_size = 16
            
            # Adjust for large models
            if 'bge-m3' in self.model_name.lower() or 'large' in self.model_name.lower():
                base_batch_size = 8
                
        else:
            # CPU - moderate batching
            base_batch_size = 4
        
        # Ensure within configured bounds
        return max(self.min_batch_size, min(base_batch_size, self.max_batch_size))
    
    def _adaptive_batch_size_on_oom(self, current_batch_size: int) -> int:
        """
        Reduce batch size on OOM error for adaptive recovery.
        
        Args:
            current_batch_size: The batch size that caused OOM
            
        Returns:
            New reduced batch size
        """
        new_batch_size = max(1, current_batch_size // 2)
        logger.warning(f"OOM detected - reducing batch size from {current_batch_size} to {new_batch_size}")
        return new_batch_size
    
    def _light_memory_cleanup(self) -> None:
        """Lighter memory cleanup between batches"""
        if self.device == 'mps':
            import torch
            # Synchronize before cleanup to avoid MPS errors
            if hasattr(torch.mps, 'synchronize'):
                torch.mps.synchronize()
            if hasattr(torch.mps, 'empty_cache'):
                torch.mps.empty_cache()
    
    def _get_memory_usage(self) -> float:
        """Get current process memory usage in GB"""
        try:
            import psutil
            import os
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / (1024 * 1024 * 1024)  # Convert to GB
        except:
            return 0.0
    
    def _clear_mps_memory(self) -> None:
        """Clear MPS memory cache and synchronize operations - aggressive cleanup for large models"""
        if self.device == 'mps':
            try:
                import torch
                import gc
                
                # Critical: synchronize MPS operations first
                if hasattr(torch.mps, 'synchronize'):
                    torch.mps.synchronize()
                
                # Clear the cache multiple times for thorough cleanup
                if hasattr(torch.mps, 'empty_cache'):
                    torch.mps.empty_cache()
                    
                # Force Python garbage collection
                gc.collect()
                
                # Clear cache again after GC
                if hasattr(torch.mps, 'empty_cache'):
                    torch.mps.empty_cache()
                    
                logger.debug("MPS memory aggressively cleared")
            except Exception as e:
                logger.warning(f"Failed to clear MPS memory: {e}")
    
    def _unload_model(self) -> None:
        """Unload model from memory to free resources"""
        if self.model is not None:
            logger.info(f"Unloading model {self.model_name} from memory...")

            # Get memory usage before unload for comparison
            memory_before = self._get_memory_usage()

            # Clear MPS memory BEFORE deleting model
            self._clear_mps_memory()

            # Clear semantic handler (KeyBERT) to release its resources
            if self.semantic_handler is not None:
                logger.info("Clearing semantic handler (KeyBERT) resources")
                del self.semantic_handler
                self.semantic_handler = None

            # Clear the model
            del self.model
            self.model = None
            self.model_loaded = False
            self.model_loaded_event.clear()

            # Clear memory again AFTER deletion
            self._clear_mps_memory()

            # Force garbage collection
            import gc
            gc.collect()

            # Get memory usage after unload
            memory_after = self._get_memory_usage()
            memory_freed = max(0, memory_before - memory_after)

            logger.info(f"Model unloaded successfully. Memory freed: ~{memory_freed:.1f}MB")
    
    def _ensure_model_loaded(self) -> bool:
        """Ensure model is loaded before processing"""
        if self.model is None or not self.model_loaded:
            logger.info("Model not loaded yet, waiting for background loading to complete...")
            # Wait for the model loading thread to complete
            # This prevents double loading which causes MPS errors
            if self.model_loaded_event.wait(timeout=60):  # 60 second timeout
                if self.model is not None and self.model_loaded:
                    logger.info("Model loading completed successfully")
                    return True
                else:
                    logger.error("Model loading event set but model not available")
                    return False
            else:
                logger.error("Timeout waiting for model to load")
                return False
        return True
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            memory_info = get_memory_info(self.device)
            usage = memory_info.get('used_mb', 0.0)
            if isinstance(usage, str):
                return 0.0
            return float(usage)
        except Exception:
            return 0.0
    
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
            # Ensure model is loaded (reload if it was unloaded)
            if not self._ensure_model_loaded():
                return EmbeddingResponse(
                    embeddings=[],
                    success=False,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    model_info=self._get_model_info(),
                    request_id=request.request_id,
                    error="Failed to load model"
                )
            
            # Wait for model to be loaded (with timeout) - this is now guaranteed to be quick
            max_wait = 30.0  # 30 seconds
            wait_start = time.time()
            while not self.model_loaded_event.is_set():
                if time.time() - wait_start > max_wait:
                    raise TimeoutError("Model loading timeout")
                await asyncio.sleep(0.1)
            
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
                
                # CRITICAL: Clear memory after EVERY request
                self._clear_mps_memory()
                
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
        
        # Set state to WORKING
        with self.state_lock:
            self.state = 'WORKING'
        
        logger.debug(f"Processing request {request.request_id} with {len(request.texts)} texts")
        
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
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                loop.call_soon_threadsafe(queued_request.future.set_result, response)
            except RuntimeError:
                queued_request.future.set_result(response)
            
            logger.debug(
                f"Processed {'immediate' if request.immediate else 'batch'} request "
                f"with {len(request.texts)} texts in {processing_time_ms}ms"
            )
            
            # Set state back to IDLE
            with self.state_lock:
                self.state = 'IDLE'
            
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
            
            # Set state back to IDLE even on error
            with self.state_lock:
                self.state = 'IDLE'
    
    def _generate_embeddings_sync(self, texts: List[str]) -> List[EmbeddingVector]:
        """Generate embeddings synchronously using sentence-transformers with progress reporting"""
        import time
        start_time = time.time()
        
        total_texts = len(texts)
        logger.debug(f"Generating embeddings for {total_texts} texts on {self.device}, batch size: {self.optimal_batch_size}")
        
        if not self.model:
            raise RuntimeError("Model not loaded")
        
        
        # PyTorch already handles memory limits via set_per_process_memory_fraction(0.6)
        # We just need to ensure chunks fit within the model's context window
        # and aren't so large they cause issues even within the memory limit
        
        # Get context window for this model
        context_window = 8192 if 'bge-m3' in self.model_name.lower() else 512
        
        # Use conservative portion of context window for actual text
        # Reserve space for special tokens, padding, and processing overhead
        max_safe_chars = context_window * 3  # Roughly 3 chars per token, conservative
        
        # For very large context models, apply additional safety factor
        # Testing showed BGE-M3 with 8192 context can cause issues with very large chunks
        if context_window >= 8192:
            max_safe_chars = min(max_safe_chars, 12000)  # Cap at 12k chars for safety
        
        # Ensure minimum viable size
        max_safe_chars = max(1000, max_safe_chars)
        
        # Only truncate if text exceeds safe size
        processed_texts = []
        truncated_count = 0
        for i, text in enumerate(texts):
            if len(text) > max_safe_chars:
                logger.warning(f"Text {i} has {len(text)} chars, truncating to {max_safe_chars} to fit context window")
                processed_texts.append(text[:max_safe_chars])
                truncated_count += 1
            else:
                processed_texts.append(text)
        
        if truncated_count > 0:
            logger.info(f"Truncated {truncated_count} oversized texts to prevent context overflow")
        
        texts = processed_texts
        
        # Report start
        self._send_progress('processing_embeddings', 0, total_texts)
        
        # Generate embeddings with proper device handling
        try:
            logger.debug(f"Calling model.encode() with {total_texts} texts")
            
            # Process in batches with progress reporting and OOM recovery
            embeddings_list = []
            batch_size = self.optimal_batch_size
            
            import torch
            import numpy as np
            import gc
            
            i = 0
            while i < total_texts:
                batch_end = min(i + batch_size, total_texts)
                batch = texts[i:batch_end]
                batch_num = i // batch_size + 1
                total_batches = (total_texts + batch_size - 1) // batch_size
                
                # Report batch progress
                self._send_progress(
                    'processing_batch',
                    current=i,
                    total=total_texts,
                    details=f"Batch {batch_num}/{total_batches}"
                )
                
                # Log memory only for first batch or every 50th batch to reduce spam
                if batch_num == 1 or batch_num % 50 == 0:
                    logger.debug(f"Processing batch {batch_num}/{total_batches}, memory: {self._get_memory_usage():.2f} GB")
                
                # Process batch with OOM recovery
                batch_success = False
                attempts = 0
                current_batch_size = len(batch)
                
                while not batch_success and attempts < 3:
                    try:
                        with torch.no_grad():  # Disable gradient computation for inference
                            if self.device == 'mps':
                                # For MPS, don't specify device in encode() since model is already on MPS
                                batch_embeddings = self.model.encode(
                                    batch,
                                    normalize_embeddings=True,
                                    convert_to_numpy=True,
                                    show_progress_bar=False,
                                    batch_size=current_batch_size
                                )
                            else:
                                batch_embeddings = self.model.encode(
                                    batch,
                                    normalize_embeddings=True,
                                    convert_to_numpy=True,
                                    show_progress_bar=False,
                                    device=self.device,
                                    batch_size=current_batch_size
                                )
                        
                        # Success - append to list
                        embeddings_list.append(batch_embeddings)
                        batch_success = True
                        
                    except (RuntimeError, torch.cuda.OutOfMemoryError) as oom_error:
                        attempts += 1
                        error_str = str(oom_error).lower()
                        
                        if 'out of memory' in error_str or 'oom' in error_str or 'memory' in error_str:
                            # Clear memory immediately
                            self._clear_mps_memory()
                            gc.collect()
                            
                            if current_batch_size > 1:
                                # Reduce batch size and retry
                                current_batch_size = self._adaptive_batch_size_on_oom(current_batch_size)
                                batch = texts[i:i + current_batch_size]
                                batch_end = i + current_batch_size
                                logger.info(f"Retrying batch with reduced size: {current_batch_size}")
                            else:
                                # Already at minimum batch size, can't reduce further
                                logger.error(f"OOM even with batch_size=1 for text at index {i}")
                                raise
                        else:
                            # Not an OOM error, re-raise
                            raise
                
                i = batch_end  # Move to next batch
                
                # Report completion of this batch
                processed = min(i + batch_size, total_texts)
                self._send_progress(
                    'processing_embeddings',
                    current=processed,
                    total=total_texts,
                    details=f"Completed {processed} embeddings"
                )
                
                # Enhanced memory cleanup between batches
                if i + batch_size < total_texts:
                    if self.device == 'mps':
                        self._send_progress('cleaning_memory', 0, 0)
                        self._light_memory_cleanup()
                    # Force garbage collection to free memory
                    gc.collect()
            
            # Single concatenation at the end (much more memory efficient)
            if len(embeddings_list) == 1:
                embeddings = embeddings_list[0]
            else:
                embeddings = np.vstack(embeddings_list)
            
            # Free the list memory immediately
            del embeddings_list
            gc.collect()
            
            encode_duration = time.time() - start_time
            logger.debug(f"model.encode() completed in {encode_duration:.3f}s")
            logger.debug(f"Generated embeddings shape: {embeddings.shape}")
            
            # Report completion
            self._send_progress('completed', total_texts, total_texts)
            
            # CRITICAL: Clear MPS memory immediately after successful encoding
            self._clear_mps_memory()
            
        except Exception as encode_error:
            encode_duration = time.time() - start_time
            logger.error(f"model.encode() FAILED after {encode_duration:.3f}s: {encode_error}")
            
            # Clear memory even on failure to prevent accumulation
            self._clear_mps_memory()
            
            # Try CPU fallback
            logger.warning(f"Attempting CPU fallback due to {self.device} failure")
            
            try:
                import torch
                with torch.no_grad():
                    embeddings = self.model.encode(
                        texts,
                        normalize_embeddings=True,
                        convert_to_numpy=True,
                        show_progress_bar=False,
                        device='cpu',
                        batch_size=self.optimal_batch_size
                    )
                logger.info("CPU fallback succeeded")
            except Exception as cpu_error:
                # Clear memory again before raising
                self._clear_mps_memory()
                raise RuntimeError(f"Encoding failed on both {self.device} and CPU: {cpu_error}")
        
        # Convert to EmbeddingVector objects
        logger.debug("Converting to EmbeddingVector format...")
        conversion_start = time.time()
        import gc  # Import for garbage collection
        
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
        
        # Delete embeddings numpy array to free memory
        del embeddings
        gc.collect()  # Force garbage collection
        
        # Final memory cleanup after conversion
        self._clear_mps_memory()
        gc.collect()  # Final cleanup
        
        conversion_duration = time.time() - conversion_start
        total_duration = time.time() - start_time
        
        logger.debug(f"Conversion completed in {conversion_duration:.3f}s")
        logger.debug(f"Total generation time: {total_duration:.3f}s for {len(results)} embeddings")
        
        return results
    
    def get_health_status(self) -> HealthCheckResponse:
        """Get current health status"""
        uptime = int(time.time() - self.start_time)
        queue_size = self.request_queue.qsize()
        
        # Determine status
        if not self.is_running:
            status = 'unhealthy'
        elif not self.model_loaded:
            status = 'idle'  # Process running but model unloaded
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
            model_loaded=self.model_loaded,
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
            'model_loaded': self.model_loaded,
            'memory_usage_mb': self._get_memory_usage(),
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
            # Reset keep-alive timer for model downloads to prevent shutdown
            self._reset_keep_alive_timer()
            
            # Check if already cached
            if self.is_model_cached(model_name):
                return {
                    'success': True,
                    'message': f'Model {model_name} already cached',
                    'progress': 100
                }
            
            logger.info(f"Downloading model {model_name}...")
            
            logger.info("Using safe download method for model")
            
            try:
                # Try huggingface_hub for direct download
                from huggingface_hub import snapshot_download
                
                cache_dir = snapshot_download(
                    repo_id=model_name,
                    cache_dir=None,
                    force_download=False
                )
                logger.info(f"Model {model_name} downloaded to {cache_dir}")
                
            except (ImportError, Exception) as e:
                # Fallback to SentenceTransformer download
                logger.info("Using SentenceTransformer for model download")
                
                import os
                os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
                
                # Download on CPU to avoid MPS issues
                model = SentenceTransformer(model_name, device='cpu')
                del model
                
                # Clear any memory used
                self._clear_mps_memory()
            
            return {
                'success': True,
                'message': f'Model {model_name} downloaded successfully using CPU-safe method',
                'progress': 100
            }
            
        except Exception as e:
            logger.error(f"Failed to download model {model_name}: {e}")
            
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ['meta tensor', 'mps', 'cumsum', 'not implemented']):
                logger.error("MPS compatibility error during download")
                return {
                    'success': False,
                    'error': f'MPS compatibility error: {str(e)}',
                    'progress': 0
                }
            
            return {
                'success': False,
                'error': str(e),
                'progress': 0
            }

    def is_model_cached(self, model_name: str) -> bool:
        """Check if model is already in sentence-transformers cache"""
        try:
            from pathlib import Path
            
            # Check new HuggingFace hub cache directory (current location)
            hub_cache_dir = Path.home() / '.cache' / 'huggingface' / 'hub'
            # HuggingFace uses 'models--' prefix and replaces '/' with '--'
            hub_model_dir = hub_cache_dir / f"models--{model_name.replace('/', '--')}"
            
            # Check if model exists in HuggingFace hub cache
            if hub_model_dir.exists():
                # Check for snapshot directory which contains the actual model files
                snapshots = hub_model_dir / 'snapshots'
                if snapshots.exists() and any(snapshots.iterdir()):
                    logger.info(f"Model {model_name} found in HuggingFace hub cache")
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
            
            # Clear model and GPU memory
            if self.model:
                try:
                    logger.info("Clearing model and memory...")
                    self._clear_mps_memory()
                    del self.model
                    self.model = None
                    self._clear_mps_memory()
                    logger.info("Model and memory cleared")
                except Exception as gpu_error:
                    logger.warning(f"Error clearing memory (non-fatal): {gpu_error}")
            
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
        """Handle keep-alive timeout with atomic state check"""
        try:
            with self.state_lock:
                # Check all conditions atomically
                if (self.state != 'IDLE' or 
                    self.request_queue.qsize() > 0 or 
                    self.current_request is not None):
                    
                    logger.debug(f"Cannot unload - state={self.state}, queue={self.request_queue.qsize()}")
                    self._reset_keep_alive_timer()
                    return
                
                # Mark as unloading to prevent new work
                self.state = 'UNLOADING'
            
            # Report unloading progress
            self._send_progress('unloading_model', 0, 0, "Freeing GPU memory")
            
            # Safe to unload outside lock
            logger.info(f"Keep-alive timeout reached ({self.keep_alive_duration}s since last activity)")
            logger.info("Unloading model after idle timeout")
            self._unload_model()
            
            # Reset state
            with self.state_lock:
                self.state = 'IDLE'
            
            self._send_progress('idle', 0, 0, "Model unloaded, process ready")
            logger.info("Keep-alive timeout handled - model unloaded, process remains active")
                
        except Exception as e:
            logger.error(f"Error during model unloading: {e}")
            # If model unloading fails, fall back to graceful shutdown
            logger.warning("Model unloading failed, falling back to graceful shutdown")
            self.shutdown_requested = True
            shutdown_thread = threading.Thread(
                target=self._graceful_shutdown_worker,
                daemon=True
            )
            shutdown_thread.start()
    
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