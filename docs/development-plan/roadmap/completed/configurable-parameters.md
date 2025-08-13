# User-Configurable Parameters

This document describes all user-configurable parameters using our schema-based configuration system. Each configuration option is defined with its structure, validation rules, and UI behavior.

## Configuration Schema Structure

Each configuration item in our schema contains:
- **Type**: The data type (string, number, boolean, select, array, etc.)
- **Label**: Display name in the UI
- **Description**: Help text explaining the setting
- **Validation**: Rules for valid values
- **UI Hints**: How to display in the interface
- **Conditions**: When to show/hide the setting

## Basic Settings

### Embedding Model Selection

```typescript
modelName: {
  type: 'select',
  label: 'Embedding Model',
  description: 'AI model used for semantic search and document understanding',
  ui: {
    component: 'detailed-select',
    destructive: {
      level: 'critical',
      message: 'Changing models will trigger a full reindex',
      consequences: [
        'All existing embeddings will be deleted',
        'Documents will be reprocessed',
        'Operation may take 15-30 minutes'
      ]
    }
  },
  detailsSource: 'data/embedding-models.json',
  detailsColumns: ['provider', 'speed', 'cost', 'quality'],
  valueColumn: 'id'
}
```

**What this means**: Users can choose their embedding model from a detailed comparison table showing provider, speed, cost, and quality. The available models are loaded from an external JSON file. Changing this setting triggers a confirmation dialog warning about reindexing.

### File Type Configuration

```typescript
fileExtensions: {
  type: 'array',
  label: 'File Types to Process',
  description: 'Document types to include in indexing',
  validation: {
    minLength: 1,
    pattern: '^\\.[a-zA-Z0-9]+$'
  },
  ui: {
    helpText: 'Add extensions like .py, .js for code files'
  }
}
```

**What this means**: Users can specify which file types to process. Must include at least one extension, and each must start with a dot followed by alphanumeric characters.

### Ignore Patterns

```typescript
ignorePatterns: {
  type: 'array',
  label: 'Folders/Files to Ignore',
  description: 'Glob patterns for content to exclude from indexing',
  ui: {
    helpText: 'Use patterns like *.log, build/**, or specific filenames',
    placeholder: 'node_modules/**'
  }
}
```

**What this means**: Users can exclude files and folders using glob patterns. Helpful for skipping build artifacts, logs, and dependencies.

## User Interface Settings

### Theme Selection

```typescript
theme: {
  type: 'select',
  label: 'Color Theme',
  description: 'Visual appearance of the interface',
  validation: {
    options: ['light', 'dark', 'auto']
  },
  ui: {
    component: 'radio'  // Shows as radio buttons instead of dropdown
  }
}
```

**What this means**: Simple theme selector with three options. Auto mode follows system preferences.

### Progress Display

```typescript
showProgress: {
  type: 'boolean',
  label: 'Show Progress Bars',
  description: 'Display progress indicators during operations'
}
```

**What this means**: Toggle for progress bars. When disabled, operations run silently.

### Logging Verbosity

```typescript
logLevel: {
  type: 'select',
  label: 'Output Detail Level',
  description: 'How much information to display',
  validation: {
    options: ['quiet', 'normal', 'verbose']
  }
}
```

**What this means**: Controls output verbosity. Quiet shows minimal info, verbose includes debug details.

## Folder Management

### Indexed Folders

```typescript
folders: {
  type: 'array',
  label: 'Indexed Folders',
  description: 'Folders to index and make searchable',
  ui: {
    component: 'folder-manager'  // Custom component for folder management
  },
  // Each folder has this structure:
  itemSchema: {
    path: {
      type: 'string',
      label: 'Folder Path',
      ui: { component: 'folder' }
    },
    name: {
      type: 'string',
      label: 'Display Name',
      description: 'Friendly name for this folder'
    },
    enabled: {
      type: 'boolean',
      label: 'Active',
      description: 'Include this folder in searches'
    },
    exclude: {
      type: 'array',
      label: 'Additional Excludes',
      description: 'Extra patterns to ignore in this folder'
    }
  }
}
```

**What this means**: Users can manage multiple folders with individual settings. Each folder can be enabled/disabled and have its own exclude patterns.

## Development Settings

### Debug Mode

```typescript
developmentEnabled: {
  type: 'boolean',
  label: 'Development Mode',
  description: 'Enable debug output and development features',
  ui: {
    helpText: 'Enables verbose logging, hot reload, and debugging tools'
  }
}
```

**What this means**: Master switch for development features. Useful for troubleshooting.

## Future Settings (Conditional Examples)

### AI Provider Configuration

```typescript
// Provider selection drives which fields appear
aiProvider: {
  type: 'select',
  label: 'AI Provider',
  description: 'Choose your AI service provider',
  validation: {
    options: ['openai', 'anthropic', 'local', 'azure']
  },
  ui: {
    component: 'detailed-select'
  },
  detailsSource: 'data/ai-providers.json',
  detailsColumns: ['type', 'requirements', 'pricing'],
  valueColumn: 'id'
}

// Only shows when OpenAI is selected
openaiApiKey: {
  type: 'string',
  label: 'OpenAI API Key',
  description: 'Your OpenAI API key for authentication',
  required: true,
  conditions: {
    when: { 'aiProvider': 'openai' }
  },
  ui: {
    component: 'password',
    placeholder: 'sk-...'
  },
  validation: {
    pattern: '^sk-[a-zA-Z0-9]{48}$'
  }
}

// Only shows when local is selected
localModel: {
  type: 'select',
  label: 'Local Model',
  description: 'Ollama model to use',
  conditions: {
    when: { 'aiProvider': 'local' }
  },
  validation: {
    custom: 'ollamaModels'  // Dynamically populated from ollama list
  }
}
```

**What this means**: The UI adapts based on provider selection. Choose OpenAI → see API key field. Choose Local → see model selector. No manual UI state management needed!

### Remote Access Settings

```typescript
remoteEnabled: {
  type: 'boolean',
  label: 'Enable Remote Access',
  description: 'Allow access from other devices'
}

// These only appear when remote is enabled
remotePort: {
  type: 'number',
  label: 'Port',
  description: 'Network port for remote connections',
  conditions: {
    when: { 'remoteEnabled': true }
  },
  validation: {
    min: 1024,
    max: 65535
  }
}

remoteAuth: {
  type: 'boolean',
  label: 'Require Authentication',
  description: 'Secure remote connections with API keys',
  conditions: {
    when: { 'remoteEnabled': true }
  }
}
```

**What this means**: Remote access settings only appear when the feature is enabled, keeping the interface clean.

### Feature Toggles

```typescript
features: {
  topicDiscovery: {
    type: 'boolean',
    label: 'Automatic Topic Discovery',
    description: 'Find and group related content automatically',
    ui: {
      helpText: 'Uses clustering to identify document themes'
    }
  },
  codeIntelligence: {
    type: 'boolean',
    label: 'Code-Aware Search',
    description: 'Enhanced search for source code',
    ui: {
      helpText: 'Understands functions, classes, and code structure'
    }
  }
}
```

**What this means**: Users can enable/disable major features. Each toggle may reveal additional configuration options.

## How the Schema Works

### Validation
- **Automatic**: Values are validated against schema rules before saving
- **Helpful**: Clear error messages guide users to valid inputs
- **Consistent**: Same rules apply in CLI and TUI

### UI Generation
- **Dynamic**: UI components are created from schema definitions
- **Adaptive**: Fields appear/disappear based on conditions
- **Rich**: Supports passwords, file pickers, detailed lists, and more

### Persistence
- **Two Files**: `config-defaults.yaml` (built-in) + `config.yaml` (user)
- **Smart Merge**: User settings override defaults
- **Live Updates**: Changes apply immediately

## Configuration Best Practices

1. **Start Simple**: Use defaults, change only what you need
2. **Use the TUI**: Visual configuration is easier than editing YAML
3. **Check Conditions**: Some settings only appear when others are set
4. **Review Warnings**: Destructive changes show consequences
5. **Validate First**: CLI validates before saving

## Example Configuration Flow

1. User opens TUI configuration screen
2. Schema generates UI components automatically
3. User selects "OpenAI" as AI provider
4. API Key field appears (conditional logic)
5. User enters key, validation checks format
6. Save updates `config.yaml` with new values
7. Application reloads configuration
8. Changes take effect immediately

This schema-based approach ensures consistency, reduces code duplication, and provides a superior user experience with self-organizing interfaces.

## External Data Sources

### Embedding Models (`data/embedding-models.json`)

Stores available embedding models with their characteristics:

```json
[
  {
    "id": "nomic-embed-text",
    "label": "Nomic Embed Text",
    "provider": "Nomic",
    "speed": "Fast",
    "cost": "$",
    "quality": "Good"
  },
  {
    "id": "all-MiniLM-L6-v2",
    "label": "MiniLM L6 v2",
    "provider": "Sentence-Transformers",
    "speed": "Very Fast",
    "cost": "Free",
    "quality": "Fair"
  }
  // ... more models
]
```

### AI Providers (`data/ai-providers.json`)

Stores AI provider information:

```json
[
  {
    "id": "openai",
    "label": "OpenAI",
    "type": "Cloud API",
    "requirements": "API Key Required",
    "pricing": "Pay per use"
  },
  {
    "id": "local",
    "label": "Local (Ollama)",
    "type": "On-device",
    "requirements": "Ollama Required",
    "pricing": "Free"
  }
  // ... more providers
]
```

### Data Management

The external data files can be updated through:
- Manual editing
- API scripts that fetch latest information
- TUI refresh button (when implemented)
- CLI commands for data updates