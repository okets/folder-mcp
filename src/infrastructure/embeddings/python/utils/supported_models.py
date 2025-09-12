"""
Utility functions for managing supported embedding models from system configuration.
"""

import json
import os
from typing import List, Optional, Dict, Any


def get_supported_models() -> List[str]:
    """
    Get supported models from curated-models.json registry.
    
    Returns:
        List of supported model names (huggingface IDs)
    """
    config_path = os.path.join(os.path.dirname(__file__), '../../../../config', 'curated-models.json')
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # Extract huggingfaceId from GPU models (Python uses these)
    models = []
    gpu_models = config.get('gpuModels', {}).get('models', [])
    for model in gpu_models:
        if 'huggingfaceId' in model:
            models.append(model['huggingfaceId'])
    
    return models


def validate_model(model_name: str) -> bool:
    """
    Validate model against supported list.
    
    Args:
        model_name: Name of the model to validate
        
    Returns:
        True if model is supported, False otherwise
    """
    if not model_name or not isinstance(model_name, str):
        return False
    
    supported_models = get_supported_models()
    return model_name in supported_models


def get_default_model() -> str:
    """
    Get the default model (first in the supported list).
    
    Returns:
        Default model name
    """
    models = get_supported_models()
    return models[0]


def get_model_info(model_name: Optional[str] = None) -> dict:
    """
    Get information about a model or all supported models.
    
    Args:
        model_name: Specific model to get info for, or None for all models
        
    Returns:
        Model information dictionary
    """
    supported_models = get_supported_models()
    
    if model_name:
        if validate_model(model_name):
            return {
                'name': model_name,
                'supported': True,
                'is_default': model_name == supported_models[0]
            }
        else:
            return {
                'name': model_name,
                'supported': False,
                'is_default': False
            }
    
    return {
        'supported_models': supported_models,
        'default_model': supported_models[0] if supported_models else None,
        'total_count': len(supported_models)
    }


def get_process_management_config() -> Dict[str, int]:
    """
    Get process management configuration with fallback defaults.
    
    Supports environment variable overrides for testing:
    - FOLDER_MCP_TEST_CRAWLING_PAUSE_SECONDS
    - FOLDER_MCP_TEST_KEEP_ALIVE_SECONDS
    - FOLDER_MCP_TEST_SHUTDOWN_GRACE_PERIOD_SECONDS
    
    Returns:
        Dictionary with process management settings
    """
    config_path = os.path.join(os.path.dirname(__file__), '../../../../..', 'system-configuration.json')
    
    # Default values (in seconds for internal use)
    defaults = {
        'crawling_pause_seconds': 60,      # 1 minute
        'keep_alive_seconds': 3600,        # 60 minutes - extended for large indexing jobs
        'shutdown_grace_period_seconds': 30
    }
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        process_config = config.get('embeddings', {}).get('python', {}).get('processManagement', {})
        
        # Convert minutes to seconds and merge with defaults
        result = defaults.copy()
        
        if 'crawlingPauseMinutes' in process_config:
            result['crawling_pause_seconds'] = process_config['crawlingPauseMinutes'] * 60
            
        if 'keepAliveMinutes' in process_config:
            result['keep_alive_seconds'] = process_config['keepAliveMinutes'] * 60
            
        if 'shutdownGracePeriodSeconds' in process_config:
            result['shutdown_grace_period_seconds'] = process_config['shutdownGracePeriodSeconds']
            
        # Check for test environment variable overrides
        if 'FOLDER_MCP_TEST_CRAWLING_PAUSE_SECONDS' in os.environ:
            result['crawling_pause_seconds'] = int(os.environ['FOLDER_MCP_TEST_CRAWLING_PAUSE_SECONDS'])
            
        if 'FOLDER_MCP_TEST_KEEP_ALIVE_SECONDS' in os.environ:
            result['keep_alive_seconds'] = int(os.environ['FOLDER_MCP_TEST_KEEP_ALIVE_SECONDS'])
            
        if 'FOLDER_MCP_TEST_SHUTDOWN_GRACE_PERIOD_SECONDS' in os.environ:
            result['shutdown_grace_period_seconds'] = int(os.environ['FOLDER_MCP_TEST_SHUTDOWN_GRACE_PERIOD_SECONDS'])
            
        return result
        
    except Exception as e:
        # Log error but continue with defaults
        print(f"Warning: Failed to read process management configuration: {e}")
        return defaults


if __name__ == '__main__':
    # Test the utility functions
    print("Supported models:", get_supported_models())
    default_model = get_default_model()
    print("Default model:", default_model)
    print(f"Validate '{default_model}':", validate_model(default_model))
    print("Validate 'invalid-model':", validate_model('invalid-model'))
    print("All models info:", get_model_info())
    print("Process management config:", get_process_management_config())