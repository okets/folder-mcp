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

import asyncio
import json
import logging
import signal
import sys
import traceback
from typing import Dict, Any, Optional

# Configure logging to stderr only
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)

logger = logging.getLogger(__name__)

try:
    from jsonrpclib.SimpleJSONRPCServer import SimpleJSONRPCServer
    from jsonrpclib import jsonrpc
    JSONRPC_AVAILABLE = True
except ImportError:
    JSONRPC_AVAILABLE = False
    logger.error("jsonrpclib-pelix not available. Please install: pip install jsonrpclib-pelix")

import os
# Add the current directory to Python path so we can import our modules
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from handlers.embedding_handler import EmbeddingHandler
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
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.handler: Optional[EmbeddingHandler] = None
        self.is_running = False
        self.request_count = 0
        
    async def initialize(self) -> bool:
        """Initialize the RPC server and embedding handler"""
        try:
            logger.info(f"Initializing EmbeddingRPCServer with model: {self.model_name}")
            
            # Create and initialize handler
            self.handler = EmbeddingHandler(self.model_name)
            success = await self.handler.initialize()
            
            if not success:
                logger.error("Failed to initialize embedding handler")
                return False
            
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
            if not self.handler:
                return {
                    'status': 'unhealthy',
                    'model_loaded': False,
                    'gpu_available': False,
                    'memory_usage_mb': 0.0,
                    'uptime_seconds': 0,
                    'queue_size': 0,
                    'request_id': request_data.get('request_id') if request_data else None
                }
            
            response = self.handler.get_health_status()
            if request_data:
                response.request_id = request_data.get('request_id')
            
            return response.to_dict()
            
        except Exception as e:
            logger.error(f"Error in health_check: {e}")
            return {
                'status': 'unhealthy',
                'model_loaded': False,
                'gpu_available': False,
                'memory_usage_mb': 0.0,
                'uptime_seconds': 0,
                'queue_size': 0,
                'error': str(e)
            }
    
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
            elif method == 'shutdown':
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
    # Get model name from command line args
    model_name = "all-MiniLM-L6-v2"  # Default model
    if len(sys.argv) > 1:
        model_name = sys.argv[1]
    
    logger.info(f"Starting Python embeddings service with model: {model_name}")
    
    try:
        # Create and initialize embedding server
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
    # Check dependencies
    if not JSONRPC_AVAILABLE:
        logger.error("Required dependencies not available")
        sys.exit(1)
    
    # Run the server
    asyncio.run(main())