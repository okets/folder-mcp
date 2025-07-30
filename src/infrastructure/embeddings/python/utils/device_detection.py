"""
Device detection utilities for optimal embedding performance.
Automatically detects CUDA, MPS (Apple Silicon), or falls back to CPU.
"""

import torch
import logging
from typing import Tuple, Dict, Any


logger = logging.getLogger(__name__)


def detect_optimal_device() -> Tuple[str, Dict[str, Any]]:
    """
    Detect the optimal device for embedding computation.
    
    Returns:
        Tuple of (device_string, device_info_dict)
    """
    device_info = {
        'device_type': 'cpu',
        'device_name': 'CPU',
        'memory_available': False,
        'compute_capability': None
    }
    
    try:
        # Check for CUDA (NVIDIA GPU)
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            if device_count > 0:
                device_name = torch.cuda.get_device_name(0)
                device_info.update({
                    'device_type': 'cuda',
                    'device_name': device_name,
                    'memory_available': True,
                    'device_count': device_count,
                    'cuda_version': torch.version.cuda
                })
                
                # Get compute capability if available
                try:
                    capability = torch.cuda.get_device_capability(0)
                    device_info['compute_capability'] = f"{capability[0]}.{capability[1]}"
                except:
                    pass
                
                logger.info(f"CUDA detected: {device_name} (devices: {device_count})")
                return 'cuda', device_info
        
        # Check for MPS (Apple Silicon)
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            device_info.update({
                'device_type': 'mps',
                'device_name': 'Apple Silicon GPU',
                'memory_available': True
            })
            logger.info("Apple Silicon MPS detected")
            return 'mps', device_info
            
    except Exception as e:
        logger.warning(f"Error during device detection: {e}")
    
    # Fallback to CPU
    logger.info("Using CPU for embeddings")
    return 'cpu', device_info


def get_memory_info(device: str) -> Dict[str, Any]:
    """
    Get memory information for the specified device.
    
    Args:
        device: Device string ('cuda', 'mps', or 'cpu')
        
    Returns:
        Dictionary with memory information
    """
    memory_info = {
        'total_mb': 0,
        'available_mb': 0,
        'used_mb': 0
    }
    
    try:
        if device == 'cuda' and torch.cuda.is_available():
            # Get GPU memory info
            total = torch.cuda.get_device_properties(0).total_memory
            reserved = torch.cuda.memory_reserved(0)
            allocated = torch.cuda.memory_allocated(0)
            
            memory_info.update({
                'total_mb': total / (1024 * 1024),
                'reserved_mb': reserved / (1024 * 1024),
                'allocated_mb': allocated / (1024 * 1024),
                'available_mb': (total - reserved) / (1024 * 1024)
            })
            
        elif device == 'mps':
            # MPS has unified memory architecture - get system memory info
            # Apple Silicon shares memory between CPU and GPU
            try:
                # Get unified memory stats (available in PyTorch 2.0+)
                if hasattr(torch.backends.mps, 'driver_allocated_memory'):
                    allocated = torch.backends.mps.driver_allocated_memory()
                    memory_info.update({
                        'allocated_mb': allocated / (1024 * 1024),
                        'total_mb': 'unified_memory',
                        'available_mb': 'dynamic',
                        'used_mb': allocated / (1024 * 1024)
                    })
                else:
                    # Fallback for older PyTorch versions
                    memory_info.update({
                        'total_mb': 'unified_memory',
                        'available_mb': 'dynamic',
                        'used_mb': 'unknown'
                    })
            except:
                # If MPS memory functions not available
                memory_info.update({
                    'total_mb': 'unified_memory',
                    'available_mb': 'dynamic', 
                    'used_mb': 'unknown'
                })
            
        else:
            # CPU memory would require psutil, keep simple for now
            memory_info.update({
                'total_mb': 'unknown',
                'available_mb': 'unknown', 
                'used_mb': 'unknown'
            })
            
    except Exception as e:
        logger.warning(f"Error getting memory info for {device}: {e}")
    
    return memory_info


def optimize_torch_settings(device: str) -> None:
    """
    Apply optimal PyTorch settings for the detected device.
    
    Args:
        device: Device string from detect_optimal_device()
    """
    try:
        if device == 'cuda':
            # Optimize for CUDA
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
            logger.info("Applied CUDA optimizations")
            
        elif device == 'mps':
            # CRITICAL: Enable MPS fallback for unsupported operations
            # sentence-transformers uses operations not yet implemented in MPS
            import os
            os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
            
            # MPS-specific optimizations for unified memory architecture
            # Apple Silicon benefits from larger batch sizes due to unified memory
            torch.backends.mps.empty_cache()  # Clear any existing cache
            
            # Set optimal memory fraction (Apple Silicon has unified memory)
            # No explicit setting needed - MPS automatically manages unified memory
            
            logger.info("Applied MPS optimizations with CPU fallback enabled")
            
        else:
            # CPU optimizations
            # Set number of threads for CPU inference
            torch.set_num_threads(torch.get_num_threads())
            logger.info(f"CPU threads set to: {torch.get_num_threads()}")
            
    except Exception as e:
        logger.warning(f"Error applying optimizations for {device}: {e}")


def get_optimal_batch_size(device: str, model_name: str = None) -> int:
    """
    Get optimal batch size for the device and model.
    
    Args:
        device: Device string ('cuda', 'mps', 'cpu')
        model_name: Optional model name for size-specific optimization
        
    Returns:
        Recommended batch size
    """
    try:
        if device == 'mps':
            # Apple Silicon unified memory - but need to be conservative
            # Research shows batch size should scale with total system memory
            try:
                import psutil
                # Get total system memory (unified on Apple Silicon)
                total_memory_gb = psutil.virtual_memory().total / (1024**3)
                
                if total_memory_gb >= 32:
                    return 64  # Mac Studio/Pro with 32GB+
                elif total_memory_gb >= 16:
                    return 48  # 16GB MacBook Pro/Air
                elif total_memory_gb >= 8:
                    return 24  # 8GB MacBook Air (conservative)
                else:
                    return 16  # Very low memory systems
                    
            except ImportError:
                # Fallback without psutil - be conservative
                logger.warning("psutil not available, using conservative MPS batch size")
                return 32  # Conservative default for MPS
                
        elif device == 'cuda':
            # CUDA batch size depends on GPU memory
            if torch.cuda.is_available():
                # Get GPU memory in GB
                gpu_memory_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                if gpu_memory_gb >= 16:
                    return 64
                elif gpu_memory_gb >= 8:
                    return 32
                else:
                    return 16
            return 32
        else:
            # CPU - conservative batch size
            return 16
            
    except Exception as e:
        logger.warning(f"Error determining optimal batch size: {e}")
        return 32  # Safe default


def validate_device_compatibility(model_name: str, device: str) -> bool:
    """
    Validate that the model is compatible with the detected device.
    
    Args:
        model_name: Name of the sentence-transformer model
        device: Device string
        
    Returns:
        True if compatible, False otherwise
    """
    try:
        # Basic compatibility checks
        if device == 'cuda' and not torch.cuda.is_available():
            return False
            
        if device == 'mps' and not (hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()):
            return False
            
        # All models should work on CPU
        return True
        
    except Exception as e:
        logger.warning(f"Error validating device compatibility: {e}")
        return False