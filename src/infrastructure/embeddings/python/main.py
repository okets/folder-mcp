#!/usr/bin/env python3
"""
Main JSON-RPC server for Python embeddings service.

This script provides a JSON-RPC 2.0 interface over stdio for communication
with the Node.js daemon. It handles embedding generation with priority-based
processing and automatic GPU detection.

Usage:
    python main.py [model_name]
    
The server communicates via stdin/stdout using JSON-RPC 2.0 protocol.
All logging goes to stderr to avoid interfering with JSON-RPC communication.
"""

import os
import sys

# Set offline mode early if model is cached to prevent HuggingFace rate limiting
# This must be done before importing transformers/sentence-transformers
from pathlib import Path
cache_dir = Path.home() / '.cache' / 'huggingface' / 'hub'
if len(sys.argv) > 1:
    model_name = sys.argv[1]
    model_dir = cache_dir / f"models--{model_name.replace('/', '--')}"
    if model_dir.exists() and model_dir.is_dir():
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['TRANSFORMERS_OFFLINE'] = '1'
        os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'

# ★ CRITICAL: Check all dependencies BEFORE any imports that might fail
# This ensures we catch missing packages and report them properly to Node.js
def check_dependencies():
    """Check all required dependencies before importing anything that might fail"""
    missing_packages = []
    
    # Check core ML packages
    try:
        import torch
    except ImportError:
        missing_packages.append("torch")
    
    try:
        import sentence_transformers
    except ImportError:
        missing_packages.append("sentence-transformers")
    
    try:
        import transformers
    except ImportError:
        missing_packages.append("transformers")
    
    # Check JSON-RPC communication package
    try:
        import jsonrpclib
    except ImportError:
        missing_packages.append("jsonrpclib-pelix")

    # Check KeyBERT for semantic extraction (Sprint 1 requirement)
    try:
        import keybert
    except ImportError:
        missing_packages.append("keybert")


    if missing_packages:
        # Output specific error that Node.js can detect and parse
        error_msg = f"DEPENDENCY_ERROR: Missing packages: {', '.join(missing_packages)}"
        print(error_msg, file=sys.stderr, flush=True)
        sys.exit(1)

# Run dependency check immediately
check_dependencies()

# ★ COMPREHENSIVE APPLE SILICON FIX: Set environment before ANY imports
# Based on extensive GitHub research - this fixes intermittent failures
# These MUST be set before importing torch, sentence-transformers, transformers, etc.

# Primary fix for MPS operation compatibility
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'

# Memory management for Apple Silicon unified memory
os.environ['PYTORCH_MPS_HIGH_WATERMARK_RATIO'] = '0.0'

# Additional stability settings from community research
os.environ['TOKENIZERS_PARALLELISM'] = 'false'  # Avoid tokenizer deadlocks
os.environ['OMP_NUM_THREADS'] = '1'  # Prevent threading conflicts

# Force consistent behavior regardless of environment
os.environ['PYTHONHASHSEED'] = '0'  # Deterministic behavior

import asyncio
import json
import logging
import signal
import time
import threading
import traceback
from typing import Dict, Any, Optional

# Configure logging to stderr only
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)

logger = logging.getLogger(__name__)

# Now we can safely import jsonrpclib since we already checked it exists
from jsonrpclib.SimpleJSONRPCServer import SimpleJSONRPCServer
from jsonrpclib import jsonrpc

import os
# Add the current directory to Python path so we can import our modules
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from handlers.embedding_handler import EmbeddingHandler
from handlers.semantic_handler import SemanticExtractionHandler
from models.embedding_request import (
    EmbeddingRequest,
    EmbeddingResponse,
    HealthCheckRequest,
    HealthCheckResponse,
    ShutdownRequest,
    ShutdownResponse
)


class EmbeddingRPCServer:
    """JSON-RPC server for embedding operations"""

    def __init__(self, model_name: Optional[str] = None):
        # Model name is now optional - Python can start without a model
        self.model_name = model_name
        self.handler: Optional[EmbeddingHandler] = None
        self.semantic_handler: Optional[SemanticExtractionHandler] = None
        self.is_running = False
        self.request_count = 0

        # State management for model transitions
        # Start in 'idle' if no model, 'loading' if model provided
        self.state = 'idle' if not model_name else 'loading'
        self.loading_progress = 0
        self.start_time = time.time()
        self.model_loaded_event = threading.Event()
        
    async def initialize(self) -> bool:
        """Initialize the RPC server and optionally load initial model"""
        try:
            # If no model specified, just start in idle state
            if not self.model_name:
                logger.info("Initializing EmbeddingRPCServer in idle state (no model)")
                self.state = 'idle'
                self.loading_progress = 0
                self.is_running = True
                logger.info("EmbeddingRPCServer initialized in idle state, ready to load models on demand")
                return True

            # If model specified, load it
            logger.info(f"Initializing EmbeddingRPCServer with model: {self.model_name}")

            # Update state to loading
            self.state = 'loading'
            self.loading_progress = 10

            # Create and initialize handler
            self.handler = EmbeddingHandler(self.model_name)
            self.loading_progress = 30

            success = await self.handler.initialize()

            if not success:
                logger.error("Failed to initialize embedding handler")
                self.state = 'error'
                return False

            # Update state to ready
            self.state = 'ready'
            self.loading_progress = 100
            self.model_loaded_event.set()

            # Initialize semantic handler if model is loaded
            if self.handler and self.handler.model:
                from handlers.semantic_handler import SemanticExtractionHandler
                self.semantic_handler = SemanticExtractionHandler(self.handler.model)

            self.is_running = True
            logger.info("EmbeddingRPCServer initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize EmbeddingRPCServer: {e}")
            logger.error(traceback.format_exc())
            return False
    
    async def generate_embeddings(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate embeddings for the given texts.
        
        JSON-RPC method: generate_embeddings
        
        Args:
            request_data: Dictionary containing EmbeddingRequest data
            
        Returns:
            Dictionary containing EmbeddingResponse data
        """
        try:
            if not self.handler or not self.is_running:
                return {
                    'embeddings': [],
                    'success': False,
                    'processing_time_ms': 0,
                    'model_info': {},
                    'error': 'Server not initialized or not running'
                }
            
            # Parse request
            request = EmbeddingRequest.from_dict(request_data)
            self.request_count += 1
            
            logger.info(
                f"Processing embedding request {self.request_count}: "
                f"{len(request.texts)} texts, immediate={request.immediate}"
            )
            
            # Generate embeddings - since we're in an async context, await directly
            response = await self.handler.generate_embeddings(request)

            logger.info(
                f"Completed request {self.request_count}: "
                f"success={response.success}, time={response.processing_time_ms}ms"
            )
            
            return response.to_dict()
            
        except Exception as e:
            logger.error(f"Error in generate_embeddings: {e}")
            logger.error(traceback.format_exc())
            return {
                'embeddings': [],
                'success': False,
                'processing_time_ms': 0,
                'model_info': {},
                'error': str(e)
            }
    
    def health_check(self, request_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Get health status of the embedding service.

        JSON-RPC method: health_check

        Args:
            request_data: Optional HealthCheckRequest data

        Returns:
            Dictionary containing HealthCheckResponse data
        """
        try:
            # Build base response with state information
            response = {
                'status': 'healthy' if self.state == 'ready' else self.state,
                'state': self.state,  # Current state machine state
                'loading_progress': self.loading_progress,  # Loading progress percentage
                'current_model': self.model_name,  # Currently loaded model name
                'model_loaded': self.state == 'ready',
                'gpu_available': False,
                'memory_usage_mb': 0.0,
                'uptime_seconds': time.time() - self.start_time if hasattr(self, 'start_time') else 0,
                'queue_size': 0,
                'request_id': request_data.get('request_id') if request_data else None
            }

            # Get additional info from handler if available
            if self.handler:
                handler_health = self.handler.get_health_status()
                response.update({
                    'gpu_available': handler_health.gpu_available,
                    'memory_usage_mb': handler_health.memory_usage_mb,
                    'queue_size': handler_health.queue_size
                })

            return response

        except Exception as e:
            logger.error(f"Error in health_check: {e}")
            return {
                'status': 'error',
                'state': 'error',
                'loading_progress': 0,
                'current_model': self.model_name,
                'model_loaded': False,
                'gpu_available': False,
                'memory_usage_mb': 0.0,
                'uptime_seconds': 0,
                'queue_size': 0,
                'error': str(e)
            }

    def extract_keyphrases(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract key phrases using KeyBERT.

        JSON-RPC method: extract_keyphrases

        Args:
            request_data: Dictionary containing:
                - text: Input text
                - ngram_range: Optional tuple [min, max] (default: [1, 3])
                - use_mmr: Optional bool for diversity (default: True)
                - diversity: Optional float 0-1 (default: 0.5)
                - top_n: Optional int for number of phrases (default: 10)

        Returns:
            Dictionary containing:
                - keyphrases: List of extracted phrases
                - success: Boolean indicating success
                - error: Optional error message
        """
        try:
            # Ensure semantic handler is initialized if model is available
            self._ensure_semantic_handler()

            if not self.semantic_handler:
                return {
                    'keyphrases': [],
                    'success': False,
                    'error': 'Semantic handler not initialized'
                }

            if not self.semantic_handler.is_available():
                return {
                    'keyphrases': [],
                    'success': False,
                    'error': 'KeyBERT not available'
                }

            # Extract parameters
            text = request_data.get('text', '')
            ngram_range = tuple(request_data.get('ngram_range', [1, 3]))
            use_mmr = request_data.get('use_mmr', True)
            diversity = request_data.get('diversity', 0.5)
            top_n = request_data.get('top_n', 10)

            # Extract key phrases
            keyphrases = self.semantic_handler.extract_keyphrases(
                text=text,
                ngram_range=ngram_range,
                use_mmr=use_mmr,
                diversity=diversity,
                top_n=top_n
            )

            return {
                'keyphrases': keyphrases,
                'success': True
            }

        except Exception as e:
            logger.error(f"Error in extract_keyphrases: {e}")
            return {
                'keyphrases': [],
                'success': False,
                'error': str(e)
            }

    def _ensure_semantic_handler(self):
        """
        Ensure semantic handler is initialized with the current model.
        The semantic handler is now managed by the embedding handler.
        """
        # Wait for model to be loaded if not already
        if self.handler and not self.handler.model_loaded:
            logger.info("Waiting for model to load before accessing semantic handler...")
            success = self.handler.model_loaded_event.wait(timeout=30)
            if not success:
                logger.error("Timeout waiting for model to load")
                return

        # Update our reference to the handler's semantic handler
        if self.handler and self.handler.semantic_handler:
            self.semantic_handler = self.handler.semantic_handler
            logger.info(f"Using semantic handler from embedding handler, is_available={self.semantic_handler.is_available()}")
        else:
            logger.error(f"Semantic handler not available: handler={self.handler is not None}, model_loaded={self.handler.model_loaded if self.handler else False}, handler.semantic_handler={self.handler.semantic_handler is not None if self.handler else False}")

    def extract_keyphrases_keybert_batch(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract key phrases using KeyBERT for multiple texts (batch processing).

        JSON-RPC method: extract_keyphrases_keybert_batch

        Args:
            request_data: Dictionary containing:
                - texts: List of input texts
                - ngram_range: Optional tuple [min, max] (default: [1, 3])
                - use_mmr: Optional bool for diversity (default: True)
                - diversity: Optional float 0-1 (default: 0.5)
                - top_n: Optional int for number of phrases per text (default: 10)

        Returns:
            Dictionary containing:
                - keyphrases_batch: List of lists - key phrases for each input text
                - success: Boolean indicating success
                - error: Optional error message
        """
        try:
            # Ensure semantic handler is initialized if model is available
            self._ensure_semantic_handler()

            if not self.semantic_handler:
                return {
                    'keyphrases_batch': [],
                    'success': False,
                    'error': 'Semantic handler not initialized'
                }

            if not self.semantic_handler.is_available():
                return {
                    'keyphrases_batch': [],
                    'success': False,
                    'error': 'KeyBERT not available'
                }

            # Extract parameters
            texts = request_data.get('texts', [])
            if not texts:
                return {
                    'keyphrases_batch': [],
                    'success': False,
                    'error': 'No texts provided for batch processing'
                }

            ngram_range = tuple(request_data.get('ngram_range', [1, 3]))
            use_mmr = request_data.get('use_mmr', True)
            diversity = request_data.get('diversity', 0.5)
            top_n = request_data.get('top_n', 10)

            logger.info(f"Processing KeyBERT batch request: {len(texts)} texts")
            start_time = time.time()

            # Process each text to extract key phrases
            keyphrases_batch = []
            for i, text in enumerate(texts):
                try:
                    keyphrases = self.semantic_handler.extract_keyphrases(
                        text=text,
                        ngram_range=ngram_range,
                        use_mmr=use_mmr,
                        diversity=diversity,
                        top_n=top_n
                    )
                    keyphrases_batch.append(keyphrases)

                    if (i + 1) % 10 == 0:  # Log progress every 10 texts
                        logger.debug(f"Processed {i + 1}/{len(texts)} texts")

                except Exception as e:
                    logger.warning(f"Failed to extract keyphrases for text {i}: {e}")
                    keyphrases_batch.append([])  # Add empty list for failed extraction

            processing_time = (time.time() - start_time) * 1000
            logger.info(f"Completed KeyBERT batch processing: {len(texts)} texts in {processing_time:.1f}ms")

            return {
                'keyphrases_batch': keyphrases_batch,
                'success': True,
                'processing_time_ms': processing_time
            }

        except Exception as e:
            logger.error(f"Error in extract_keyphrases_keybert_batch: {e}")
            logger.error(traceback.format_exc())
            return {
                'keyphrases_batch': [],
                'success': False,
                'error': str(e)
            }

    def is_keybert_available(self) -> Dict[str, Any]:
        """
        Check if KeyBERT is available.

        JSON-RPC method: is_keybert_available

        Returns:
            Dictionary containing:
                - available: Boolean indicating if KeyBERT is available
        """
        try:
            logger.debug("is_keybert_available RPC method called")

            # Ensure semantic handler is initialized if model is available
            self._ensure_semantic_handler()

            available = (
                self.semantic_handler is not None and
                self.semantic_handler.is_available()
            )

            logger.info(f"KeyBERT availability check: semantic_handler={self.semantic_handler is not None}, available={available}")

            return {'available': available}
        except Exception as e:
            logger.error(f"Error checking KeyBERT availability: {e}")
            logger.error(traceback.format_exc())
            return {'available': False}

    async def shutdown(self, request_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Gracefully shutdown the embedding service.
        
        JSON-RPC method: shutdown
        
        Args:
            request_data: Optional ShutdownRequest data
            
        Returns:
            Dictionary containing ShutdownResponse data
        """
        try:
            timeout_seconds = 30
            request_id = None
            
            if request_data:
                shutdown_request = ShutdownRequest.from_dict(request_data)
                timeout_seconds = shutdown_request.timeout_seconds
                request_id = shutdown_request.request_id
            
            logger.info(f"Shutdown requested with timeout: {timeout_seconds}s")
            
            success = True
            message = "Shutdown completed successfully"
            
            if self.handler:
                success = await self.handler.shutdown(timeout_seconds)
                if not success:
                    message = "Shutdown completed with warnings"
            
            self.is_running = False
            
            response = ShutdownResponse(
                success=success,
                message=message,
                request_id=request_id
            )
            
            return response.to_dict()
            
        except Exception as e:
            logger.error(f"Error in shutdown: {e}")
            return {
                'success': False,
                'message': f"Shutdown error: {str(e)}",
                'request_id': request_data.get('request_id') if request_data else None
            }
    
    def download_model(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Download a model if not already cached.
        
        JSON-RPC method: download_model
        
        Args:
            request_data: Dictionary containing model_name
            
        Returns:
            Dictionary containing download result
        """
        try:
            if not self.handler:
                return {
                    'success': False,
                    'error': 'Handler not initialized'
                }
            
            logger.info(f"Download model request: {request_data}")
            
            # Call handler's download_model method
            result = self.handler.download_model(request_data)
            
            logger.info(f"Download model result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in download_model: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    def is_model_cached(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check if a model is already cached.
        
        JSON-RPC method: is_model_cached
        
        Args:
            request_data: Dictionary containing model_name
            
        Returns:
            Dictionary containing cache status
        """
        try:
            if not self.handler:
                return {
                    'cached': False,
                    'error': 'Handler not initialized'
                }
            
            model_name = request_data.get('model_name', '')
            
            logger.info(f"Checking cache for model: {model_name}")
            
            # Call handler's is_model_cached method
            is_cached = self.handler.is_model_cached(model_name)
            
            result = {
                'cached': is_cached,
                'model_name': model_name
            }
            
            logger.info(f"Cache check result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in is_model_cached: {e}")
            logger.error(traceback.format_exc())
            return {
                'cached': False,
                'error': str(e)
            }
    
    def unload_model(self, request_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Unload the current model from memory to free resources.
        The process remains alive for faster reloading.

        JSON-RPC method: unload_model

        Args:
            request_data: Optional dictionary (not used)

        Returns:
            Dictionary containing unload status
        """
        try:
            if self.state == 'idle':
                return {
                    'success': True,
                    'message': 'No model loaded',
                    'state': 'idle'
                }

            if not self.handler:
                logger.warning("No handler but state is not idle, resetting to idle")
                self.state = 'idle'
                self.model_name = None
                return {
                    'success': True,
                    'message': 'Reset to idle state',
                    'state': 'idle'
                }

            logger.info(f"Unloading model {self.model_name} from memory")

            # Set state to unloading
            self.state = 'unloading'

            # Use the internal unload method
            self.handler._unload_model()

            # Clean up handler and semantic handler
            self.handler = None
            self.semantic_handler = None

            # Force memory cleanup
            import gc
            gc.collect()

            # Reset to idle state
            self.state = 'idle'
            self.model_name = None
            self.loading_progress = 0

            result = {
                'success': True,
                'message': 'Model unloaded successfully',
                'state': 'idle'
            }

            logger.info(f"Model unload result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in unload_model: {e}")
            logger.error(traceback.format_exc())
            self.state = 'error'
            return {
                'success': False,
                'error': str(e),
                'state': 'error'
            }

    async def load_model(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Load a different model, properly unloading the current one and freeing memory.
        The Python process stays alive for fast model switching.

        JSON-RPC method: load_model

        Args:
            request_data: Dictionary with 'model_name' key

        Returns:
            Dictionary with success status and model info
        """
        try:
            new_model = request_data.get('model_name')
            if not new_model:
                return {
                    'success': False,
                    'error': 'model_name parameter required'
                }

            # If same model already loaded, just return success
            if self.model_name == new_model and self.handler and self.handler.model_loaded:
                logger.info(f"Model {new_model} already loaded, skipping reload")
                return {
                    'success': True,
                    'message': 'Model already loaded',
                    'current_model': self.model_name,
                    'state': 'ready'
                }

            logger.info(f"=== MODEL SWITCH: {self.model_name} → {new_model} ===")

            # Step 1: Set state to unloading
            self.state = 'unloading'
            self.loading_progress = 0

            # Step 2: Unload current model if exists
            if self.handler:
                logger.info(f"Unloading current model: {self.model_name}")

                # Unload the model (frees PyTorch tensors)
                if hasattr(self.handler, 'model') and self.handler.model:
                    self.handler._unload_model()
                    logger.info("Model unloaded from handler")

                # Clean up semantic handler
                if self.semantic_handler:
                    self.semantic_handler = None
                    logger.info("Semantic handler cleared")

                # Stop handler threads
                if hasattr(self.handler, 'shutdown_event'):
                    self.handler.shutdown_event.set()

                # Clear handler reference
                self.handler = None
                logger.info("Handler reference cleared")

            # Step 3: Force memory cleanup
            import gc
            import torch

            # Clear CUDA cache if using GPU
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                logger.info("CUDA cache cleared")

            # Clear MPS cache if on Apple Silicon
            if hasattr(torch, 'mps') and torch.mps.is_available():
                # MPS doesn't have empty_cache, but we can try to free memory
                torch.mps.synchronize()
                logger.info("MPS synchronized")

            # Force garbage collection (multiple passes for thorough cleanup)
            for i in range(3):
                gc.collect()

            logger.info(f"Memory cleanup completed (3 GC passes)")

            # Step 4: Update state to loading
            self.state = 'loading'
            self.loading_progress = 10
            self.model_name = new_model

            logger.info(f"Loading new model: {new_model}")

            # Extract capabilities from request (configuration-driven approach)
            capabilities = request_data.get('capabilities', {})
            logger.info(f"Model capabilities: {capabilities}")

            # Step 5: Create new handler with new model and capabilities
            self.handler = EmbeddingHandler(new_model, capabilities=capabilities)
            self.loading_progress = 30

            # Step 6: Initialize the new handler (loads model)
            success = await self.handler.initialize()

            if success:
                self.state = 'ready'
                self.loading_progress = 100
                self.model_loaded_event.set()

                # Initialize semantic handler with new model
                if self.handler.model:
                    from handlers.semantic_handler import SemanticExtractionHandler
                    self.semantic_handler = SemanticExtractionHandler(self.handler.model)
                    logger.info("Semantic handler initialized with new model")

                logger.info(f"✓ Model {new_model} loaded successfully")

                return {
                    'success': True,
                    'message': f'Model switched to {new_model}',
                    'current_model': self.model_name,
                    'state': 'ready'
                }
            else:
                self.state = 'error'
                logger.error(f"Failed to load model {new_model}")

                return {
                    'success': False,
                    'error': f'Failed to initialize model {new_model}',
                    'state': 'error'
                }

        except Exception as e:
            logger.error(f"Error in load_model: {e}")
            logger.error(traceback.format_exc())
            self.state = 'error'

            return {
                'success': False,
                'error': str(e),
                'state': 'error'
            }


    def get_status(self, request_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Get simple status of the Python embedding service.

        JSON-RPC method: get_status

        Returns:
            Dictionary containing state information
        """
        try:
            # Simple status without psutil dependency
            # Map internal states to the expected state machine states
            if self.state == 'loading':
                state = 'loading'
            elif self.state == 'ready':
                state = 'ready'
            elif self.state == 'unloading':
                state = 'unloading'
            elif self.state == 'error':
                state = 'error'
            else:
                state = 'idle'  # Default to idle for any other state

            status = {
                'state': state,
                'model': self.model_name,
                'progress': self.loading_progress
            }

            logger.info(f"Status: {status}")
            return status

        except Exception as e:
            logger.error(f"Error in get_status: {e}")
            return {
                'state': 'error',
                'model': self.model_name,
                'error': str(e)
            }


class StdioJSONRPCServer:
    """JSON-RPC server that communicates over stdin/stdout"""
    
    def __init__(self, embedding_server: EmbeddingRPCServer):
        self.embedding_server = embedding_server
        self.is_running = False
        
    async def start(self):
        """Start the stdio JSON-RPC server"""
        logger.info("Starting stdio JSON-RPC server")
        self.is_running = True
        
        try:
            while self.is_running:
                # Read line from stdin
                line = await asyncio.get_event_loop().run_in_executor(
                    None, sys.stdin.readline
                )
                
                if not line:
                    logger.info("EOF received, shutting down")
                    break
                
                line = line.strip()
                if not line:
                    continue
                
                # Process JSON-RPC request
                response = await self._process_request(line)
                
                if response:
                    # Write response to stdout
                    print(json.dumps(response), flush=True)
                    
        except Exception as e:
            logger.error(f"Error in stdio server: {e}")
            logger.error(traceback.format_exc())
        finally:
            self.is_running = False
            logger.info("Stdio JSON-RPC server stopped")
    
    async def _process_request(self, request_line: str) -> Optional[Dict[str, Any]]:
        """Process a single JSON-RPC request"""
        try:
            # Parse JSON-RPC request
            request = json.loads(request_line)
            
            if not isinstance(request, dict):
                return self._error_response(None, -32600, "Invalid Request")
            
            # Extract components
            method = request.get('method')
            params = request.get('params', {})
            request_id = request.get('id')
            
            if not method:
                return self._error_response(request_id, -32600, "Missing method")
            
            # Route to appropriate handler
            if method == 'generate_embeddings':
                result = await self.embedding_server.generate_embeddings(params)
            elif method == 'health_check':
                result = self.embedding_server.health_check(params)
            elif method == 'download_model':
                result = self.embedding_server.download_model(params)
            elif method == 'is_model_cached':
                result = self.embedding_server.is_model_cached(params)
            elif method == 'unload_model':
                result = self.embedding_server.unload_model(params)
            elif method == 'load_model':
                result = await self.embedding_server.load_model(params)
            elif method == 'extract_keyphrases_keybert':
                result = self.embedding_server.extract_keyphrases(params)
            elif method == 'extract_keyphrases_keybert_batch':
                result = self.embedding_server.extract_keyphrases_keybert_batch(params)
            elif method == 'is_keybert_available':
                result = self.embedding_server.is_keybert_available()
            elif method == 'get_status':
                result = self.embedding_server.get_status(params)
            elif method == 'shutdown':
                # Note: Shutdown method is preserved for explicit shutdown requests
                # but keep-alive timeout no longer triggers shutdown
                result = await self.embedding_server.shutdown(params)
                # Signal shutdown after sending response
                asyncio.create_task(self._delayed_shutdown())
            else:
                return self._error_response(request_id, -32601, f"Method not found: {method}")
            
            # Return success response
            return {
                'jsonrpc': '2.0',
                'result': result,
                'id': request_id
            }
            
        except json.JSONDecodeError:
            return self._error_response(None, -32700, "Parse error")
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            return self._error_response(
                request.get('id') if 'request' in locals() else None,
                -32603,
                f"Internal error: {str(e)}"
            )
    
    def _error_response(self, request_id: Any, code: int, message: str) -> Dict[str, Any]:
        """Create JSON-RPC error response"""
        return {
            'jsonrpc': '2.0',
            'error': {
                'code': code,
                'message': message
            },
            'id': request_id
        }
    
    async def _delayed_shutdown(self):
        """Shutdown after a small delay to allow response to be sent"""
        await asyncio.sleep(0.1)
        self.is_running = False


async def main():
    """Main entry point"""
    # Model name is now OPTIONAL - can start without a model
    model_name = None
    if len(sys.argv) >= 2:
        model_name = sys.argv[1]
        logger.info(f"Starting Python embeddings service with model: {model_name}")
    else:
        logger.info("Starting Python embeddings service in idle state (no model)")

    try:
        # Create and initialize embedding server (model is optional)
        embedding_server = EmbeddingRPCServer(model_name)
        
        if not await embedding_server.initialize():
            logger.error("Failed to initialize embedding server")
            sys.exit(1)
        
        # Create stdio server
        stdio_server = StdioJSONRPCServer(embedding_server)
        
        # Set up signal handlers for graceful shutdown
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down...")
            stdio_server.is_running = False
        
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
        
        # Start stdio server
        await stdio_server.start()
        
        logger.info("Python embeddings service stopped")
        
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    # Dependencies already checked at startup
    # Run the server
    asyncio.run(main())