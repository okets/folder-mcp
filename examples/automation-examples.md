# CLI Automation Examples

This document provides examples of using folder-mcp CLI commands with JSON output for automation and scripting.

## JSON Output Format

All commands support the `--json` flag for machine-readable output:

```bash
# Basic JSON output
folder-mcp config get embeddings.backend --json

# Compact JSON (single line)
folder-mcp config get embeddings.backend --json --compact

# JSON with metadata
folder-mcp config get embeddings.backend --json --metadata
```

## Configuration Automation

### Get Configuration Values
```bash
# Get current backend
BACKEND=$(folder-mcp config get embeddings.backend --json | jq -r '.data')

# Get all configuration
folder-mcp config show --json > current-config.json

# Check configuration sources
folder-mcp config show --sources --json | jq '.data.sources'
```

### Set Configuration Values
```bash
# Set configuration and capture result
folder-mcp config set embeddings.batchSize 64 --json | jq '.success'

# Validate configuration
VALID=$(folder-mcp config validate --json | jq '.data.valid')
if [ "$VALID" = "true" ]; then
  echo "Configuration is valid"
fi
```

## Profile Management Automation

### Profile Operations
```bash
# List all profiles
folder-mcp config profile list --json | jq '.data.profiles[].name'

# Get active profile
ACTIVE_PROFILE=$(folder-mcp config profile list --json | jq -r '.data.activeProfile')

# Create profile with template
folder-mcp config profile create ci-profile --template production --json

# Switch profiles programmatically
for profile in development production testing; do
  folder-mcp config profile set $profile --json
  folder-mcp search "test query" --json > "results-$profile.json"
done
```

## Search Automation

### Batch Processing
```bash
# Search with different configurations
QUERIES=("machine learning" "deployment" "optimization")

for query in "${QUERIES[@]}"; do
  folder-mcp search "$query" --json --metadata > "search-$(echo $query | tr ' ' '-').json"
done

# Search with performance settings
folder-mcp search "large dataset" --batch-size 128 --max-concurrent 8 --json
```

### Result Processing
```bash
# Extract file paths from search results
folder-mcp search "config" --json | jq -r '.data.results[].filePath'

# Count results by similarity threshold
folder-mcp search "testing" --json | jq '.data.results | map(select(.similarity > 0.8)) | length'

# Get highest scoring result
folder-mcp search "documentation" --json | jq '.data.results | max_by(.similarity)'
```

## Integration Examples

### CI/CD Pipeline
```bash
#!/bin/bash
# Configuration validation in CI

# Check if configuration is valid
if ! folder-mcp config validate --json | jq -e '.data.valid'; then
  echo "Configuration validation failed"
  folder-mcp config validate --json | jq '.data.issues.errors[]'
  exit 1
fi

# Run tests with different profiles
for profile in development production; do
  echo "Testing with profile: $profile"
  folder-mcp config profile set $profile --json
  
  # Run your tests here
  npm test
done
```

### Monitoring Script
```bash
#!/bin/bash
# Monitor configuration and performance

# Collect current configuration
CONFIG_DATA=$(folder-mcp config show --json --metadata)
echo "$CONFIG_DATA" > "config-$(date +%Y%m%d-%H%M%S).json"

# Test search performance
SEARCH_RESULT=$(folder-mcp search "performance test" --json --metadata)
PROCESSING_TIME=$(echo "$SEARCH_RESULT" | jq '.data.processingTime')

if [ "$PROCESSING_TIME" -gt 5000 ]; then
  echo "Warning: Search performance degraded (${PROCESSING_TIME}ms)"
fi
```

### Configuration Backup
```bash
#!/bin/bash
# Backup all configuration and profiles

BACKUP_DIR="config-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup main configuration
folder-mcp config show --sources --json > "$BACKUP_DIR/config.json"

# Backup all profiles
PROFILES=$(folder-mcp config profile list --json | jq -r '.data.profiles[].name')
for profile in $PROFILES; do
  folder-mcp config profile show "$profile" --json > "$BACKUP_DIR/profile-$profile.json"
done

echo "Configuration backed up to $BACKUP_DIR"
```

### Error Handling
```bash
#!/bin/bash
# Robust error handling with JSON output

run_command() {
  local cmd="$1"
  local result
  
  if result=$(eval "$cmd" 2>&1); then
    if echo "$result" | jq -e '.success' > /dev/null 2>&1; then
      echo "✅ Command succeeded"
      return 0
    else
      echo "❌ Command failed:"
      echo "$result" | jq '.error.message'
      return 1
    fi
  else
    echo "❌ Command execution failed: $result"
    return 1
  fi
}

# Example usage
run_command "folder-mcp config set embeddings.backend ollama --json"
run_command "folder-mcp config validate --json"
```

## Output Schema Examples

### Configuration Get Response
```json
{
  "success": true,
  "data": "ollama",
  "metadata": {
    "timestamp": "2025-07-06T10:30:00.000Z",
    "command": "config get embeddings.backend",
    "version": "1.0.0",
    "executionTime": 45
  }
}
```

### Search Results Response
```json
{
  "success": true,
  "data": {
    "query": "machine learning",
    "results": [
      {
        "filePath": "/docs/ml-guide.md",
        "similarity": 0.92,
        "chunkIndex": 0,
        "content": "Machine learning fundamentals..."
      }
    ],
    "totalResults": 5,
    "processingTime": 150,
    "pagination": {
      "count": 5,
      "hasMore": false
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Configuration validation failed",
    "details": {
      "field": "embeddings.batchSize",
      "issues": ["Must be a positive number"]
    }
  },
  "metadata": {
    "timestamp": "2025-07-06T10:30:00.000Z",
    "command": "config set embeddings.batchSize invalid",
    "version": "1.0.0"
  }
}
```