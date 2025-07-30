# Embedding Backend Configuration

## Overview

The embedding system now supports user-controlled backend selection instead of automatic fallback chains. Users can explicitly choose which embedding service to use based on their needs and environment.

## Configuration Options

### Embedding Backend Types

| Backend | Description | When to Use |
|---------|-------------|-------------|
| `python` | Direct Python sentence-transformers | High performance, local processing, requires Python setup |
| `ollama` | Ollama API service | More model choices, requires Ollama installation |

### Configuration Methods

#### 1. Environment Variables
```bash
export FOLDER_MCP_PROCESSING_EMBEDDING_BACKEND=python
export FOLDER_MCP_PROCESSING_MODEL_NAME=all-MiniLM-L6-v2
```

#### 2. CLI Arguments
```bash
folder-mcp --embedding-backend python --model-name all-MiniLM-L6-v2
```

#### 3. Configuration File (~/.folder-mcp/config.yaml)
```yaml
processing:
  embeddingBackend: python
  modelName: all-MiniLM-L6-v2
```

## Backend-Specific Behavior

### Python Backend (`embeddingBackend: "python"`)

**Advantages:**
- High performance local processing
- No external dependencies (once Python packages installed)
- Priority-based processing with crawling pause
- Automatic GPU/MPS/CPU detection

**Requirements:**
- Python 3.8+
- sentence-transformers, torch, transformers packages

**Model Name Mapping:**
The system automatically maps common Ollama model names to sentence-transformer equivalents:
- `nomic-embed-text` → `all-MiniLM-L6-v2`
- `mxbai-embed-large` → `all-mpnet-base-v2`
- Or use sentence-transformer model names directly

**Error Behavior:**
If Python backend is explicitly selected but fails to initialize, the system will throw an error (no fallback).

### Ollama Backend (`embeddingBackend: "ollama"`)

**Advantages:**
- Wide variety of models available
- Established Ollama ecosystem
- Easy model management with `ollama pull`

**Requirements:**
- Ollama installed and running
- Desired embedding model pulled (`ollama pull nomic-embed-text`)

**Error Behavior:**
If Ollama backend is explicitly selected but fails to initialize, the system will throw an error (no fallback).

## Implementation Details

### Service Initialization Logic

```typescript
// Respect user's explicit backend choice
if (backend === 'python') {
  await this.initializePythonService();
} else if (backend === 'ollama') {
  await this.initializeOllamaService();
} else {
  throw new Error(`Unknown embedding backend: ${backend}. Supported backends: python, ollama`);
}
```

### Model Name Translation

For Python backend, the system includes intelligent model name mapping:

```typescript
const modelMap = {
  'nomic-embed-text': 'all-MiniLM-L6-v2',
  'nomic-embed-text-v1.5': 'all-MiniLM-L12-v2', 
  'mxbai-embed-large': 'all-mpnet-base-v2',
  // ... more mappings
};
```

## Migration from Previous Versions

### Before (Automatic Fallback Chain)
```typescript
// Old behavior: Always tried Python → Ollama → Mock
const service = new EmbeddingService(config, logger);
await service.initialize(); // Would try all backends automatically
```

### After (User-Controlled Selection)
```typescript
// New behavior: Respects user's explicit choice  
const config = {
  embeddingBackend: 'python', // User must explicitly choose
  modelName: 'all-MiniLM-L6-v2'
};
const service = new EmbeddingService(config, logger);
await service.initialize(); // Only tries Python backend, fails if not available
```

## Testing

### Test Scripts

1. **Backend Selection Demo**: `./test-embedding-backend-selection.js`
   - Tests all three backend modes
   - Shows configuration examples
   - Demonstrates error handling

2. **Python Integration Test**: `./test-python-embeddings.js`
   - Comprehensive Python backend testing
   - Priority-based processing validation
   - Health monitoring and shutdown

### Running Tests

```bash
# Test backend selection
node test-embedding-backend-selection.js

# Test Python backend specifically (requires Python setup)
node test-python-embeddings.js
```

## Troubleshooting

### Python Backend Issues

**Error**: "Python dependencies not available"
**Solution**: 
```bash
cd src/infrastructure/embeddings/python
pip install -r requirements.txt
```

**Error**: "Python process failed to start"
**Solution**: Check Python 3.8+ is installed and accessible as `python3`

### Ollama Backend Issues

**Error**: "Ollama API not accessible"
**Solution**: 
```bash
# Install and start Ollama
ollama serve
# Pull required model
ollama pull nomic-embed-text
```

### Configuration Issues

**Error**: "Unknown embedding backend: xyz"
**Solution**: Use only supported values: `python` or `ollama`

## Best Practices

1. **Use `python` for production** - Better performance and reliability  
2. **Use `ollama` for model experimentation** - Easy access to many models
3. **Always specify model names** - Don't rely on defaults for production
4. **Test your configuration** - Use the demo scripts to verify setup
5. **Make explicit choices** - No automatic fallbacks, clear error messages

## Future Enhancements

- Support for additional embedding services (OpenAI, Cohere, etc.)
- Dynamic backend switching based on model availability
- Performance benchmarking and auto-optimization
- Model recommendation based on use case