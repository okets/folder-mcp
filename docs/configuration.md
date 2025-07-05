# Configuration System

The folder-mcp configuration system provides a comprehensive, hierarchical approach to managing application settings with support for multiple sources, validation, profiles, and hot reload.

## Overview

The configuration system follows a layered hierarchy where higher priority sources override lower priority ones:

1. **Defaults** (Priority 0) - Smart defaults embedded in code
2. **System Config** (Priority 1) - `/etc/folder-mcp/config.yaml` (optional)  
3. **User Config** (Priority 2) - `~/.folder-mcp/config.yaml`
4. **Environment Variables** (Priority 4) - `FOLDER_MCP_*` variables
5. **Runtime** (Priority 5) - CLI flags and programmatic changes

## Configuration File Format

Configuration files use YAML format with a flat structure:

```yaml
# Model Configuration
modelName: "nomic-embed-text"
batchSize: 32
chunkSize: 1000
overlap: 200

# File Processing
fileExtensions: ["pdf", "docx", "xlsx", "pptx", "txt", "md"]
ignorePatterns: ["*.tmp", "node_modules", ".git"]
maxFileSize: 52428800  # 50MB in bytes

# Development Settings
development:
  enableDebugOutput: true
  hotReload: true

# Performance
performanceMode: "balanced"  # "fast", "balanced", "accurate"
```

## Environment Variables

All configuration values can be overridden using `FOLDER_MCP_*` environment variables:

### Core Settings
- `FOLDER_MCP_MODEL_NAME` - Embedding model name
- `FOLDER_MCP_BATCH_SIZE` - Processing batch size (number)
- `FOLDER_MCP_CHUNK_SIZE` - Text chunk size (number)
- `FOLDER_MCP_OVERLAP` - Chunk overlap size (number)

### File Processing
- `FOLDER_MCP_FILE_EXTENSIONS` - Supported file extensions (JSON array)
- `FOLDER_MCP_IGNORE_PATTERNS` - File ignore patterns (JSON array)
- `FOLDER_MCP_MAX_FILE_SIZE` - Maximum file size (number)

### Development
- `FOLDER_MCP_DEVELOPMENT_ENABLED` - Enable development mode (boolean)
- `FOLDER_MCP_HOT_RELOAD` - Enable hot reload (boolean)
- `FOLDER_MCP_PERFORMANCE_MODE` - Performance mode ("fast", "balanced", "accurate")

### Legacy Support
- `ENABLE_ENHANCED_MCP_FEATURES` - Legacy environment variable (boolean)

### Type Parsing

Environment variables are automatically parsed to appropriate types:
- **Numbers**: `FOLDER_MCP_BATCH_SIZE=64` → `64` (number)
- **Booleans**: `FOLDER_MCP_DEVELOPMENT_ENABLED=true` → `true` (boolean)
- **JSON Arrays**: `FOLDER_MCP_FILE_EXTENSIONS='["pdf","txt"]'` → `["pdf","txt"]` (array)
- **Strings**: Default type for all other values

## CLI Commands

### Get Configuration Values

```bash
# Get specific value
folder-mcp config get modelName

# Get with source information
folder-mcp config get modelName --source

# Get all configuration
folder-mcp config get --all

# Output as JSON
folder-mcp config get --json
```

### Set Configuration Values

```bash
# Set string value
folder-mcp config set modelName "custom-model"

# Set number value
folder-mcp config set batchSize 128 --type number

# Set boolean value
folder-mcp config set development.enableDebugOutput true --type boolean

# Set JSON array
folder-mcp config set fileExtensions '["pdf","docx"]' --type json
```

### Show Current Configuration

```bash
# Show effective configuration
folder-mcp config show

# Show with source information
folder-mcp config show --sources

# Show as flat key-value pairs
folder-mcp config show --flat

# Output as JSON
folder-mcp config show --json
```

### Validate Configuration

```bash
# Validate current configuration
folder-mcp config validate

# Validate specific file
folder-mcp config validate ~/.folder-mcp/config.yaml

# Detailed validation output
folder-mcp config validate --verbose
```

### Environment Variables

```bash
# List current environment variables
folder-mcp config env list

# Show available environment variables
folder-mcp config env list --available

# Check environment variable configuration
folder-mcp config env check
```

### Profile Management

```bash
# List available profiles
folder-mcp config profile list

# Create new profile
folder-mcp config profile create my-profile

# Show profile configuration
folder-mcp config profile show my-profile

# Delete profile
folder-mcp config profile delete my-profile
```

## Configuration Sources

The system tracks which source provided each configuration value:

```bash
folder-mcp config show --sources
```

Output:
```
📊 Configuration Sources:
========================
0. DEFAULT
   Path: N/A
   Loaded: 2025-07-05T10:30:00.000Z
   Keys: 15

2. USER
   Path: ~/.folder-mcp/config.yaml
   Loaded: 2025-07-05T10:30:01.000Z
   Keys: 3

4. ENVIRONMENT
   Path: N/A
   Loaded: 2025-07-05T10:30:01.000Z
   Keys: 2
```

## Validation

The configuration system includes comprehensive validation:

### Automatic Validation
- Type checking (string, number, boolean, array)
- Range validation (positive numbers, valid enums)
- Format validation (file paths, patterns)

### Error Messages
```bash
❌ Configuration validation failed:
❌ batchSize: Must be a positive number, got: -1
⚠️ modelName: Model 'deprecated-model' is deprecated
   💡 Suggestion: Use 'nomic-embed-text' instead
```

## Hot Reload

Configuration changes are detected automatically:

```typescript
// Listen for configuration changes
configManager.on('configChanged', (event) => {
  console.log('Configuration changed:', event.changedPaths);
  console.log('Source:', event.source);
});

// Enable file watching
await configManager.enableWatch();

// Disable file watching
await configManager.disableWatch();
```

## Programmatic Usage

### Basic Usage

```typescript
import { DependencyContainer } from './di/container.js';
import { registerConfigurationServices } from './config/di-setup.js';
import { CONFIG_TOKENS } from './config/interfaces.js';

// Setup
const container = new DependencyContainer();
registerConfigurationServices(container);

const configManager = container.resolve<IConfigurationManager>(
  CONFIG_TOKENS.CONFIGURATION_MANAGER
);

// Load configuration
await configManager.load();

// Get values
const modelName = configManager.get('modelName');
const batchSize = configManager.get('batchSize');

// Set runtime values
await configManager.set('batchSize', 64, 'runtime');

// Get configuration source
const source = configManager.getSourceForPath('modelName');
```

### Advanced Usage

```typescript
// Get all sources
const sources = configManager.getSources();

// Get complete configuration
const config = configManager.getConfig();

// Validate configuration
const validator = container.resolve<IConfigValidator>(
  CONFIG_TOKENS.CONFIG_VALIDATOR
);

const result = await validator.validate(config);
if (!result.valid) {
  console.error('Validation failed:', result.results);
}
```

## Performance Considerations

### Loading Performance
- Configuration loads in under 1 second for typical setups
- Minimal memory footprint (< 50MB increase per load cycle)
- Efficient file watching with debounced updates

### Optimization Tips
- Use environment variables for frequently changing values
- Enable hot reload only in development
- Validate configuration on startup to catch errors early

## Troubleshooting

### Common Issues

**Configuration Not Loading**
```bash
# Check if configuration file exists
ls -la ~/.folder-mcp/config.yaml

# Validate configuration syntax
folder-mcp config validate
```

**Environment Variables Not Working**
```bash
# Check environment variables
folder-mcp config env list

# Verify environment variable format
folder-mcp config env check
```

**Validation Errors**
```bash
# Get detailed validation information
folder-mcp config validate --verbose

# Check configuration sources
folder-mcp config show --sources
```

### Debug Mode

Enable debug output for troubleshooting:

```bash
FOLDER_MCP_DEVELOPMENT_ENABLED=true folder-mcp config show
```

## Security Considerations

- Configuration files should be readable only by the user (`chmod 600`)
- Avoid storing sensitive data in configuration files
- Use environment variables for secrets and API keys
- Validate all configuration inputs to prevent injection attacks

## Examples

### Development Setup

```yaml
# ~/.folder-mcp/config.yaml
modelName: "nomic-embed-text"
batchSize: 16
development:
  enableDebugOutput: true
  hotReload: true
performanceMode: "fast"
```

### Production Setup

```yaml
# ~/.folder-mcp/config.yaml
modelName: "nomic-embed-text"
batchSize: 64
chunkSize: 2000
maxFileSize: 104857600  # 100MB
performanceMode: "balanced"
development:
  enableDebugOutput: false
  hotReload: false
```

### Environment Override

```bash
# Override for specific run
FOLDER_MCP_BATCH_SIZE=128 \
FOLDER_MCP_PERFORMANCE_MODE="accurate" \
folder-mcp serve /path/to/folder
```