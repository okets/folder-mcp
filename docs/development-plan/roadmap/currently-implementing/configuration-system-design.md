# Configuration System Design

## Goal

A schema-based configuration system for user-controlled configurations that:
- Automatically generates UI components from configuration schema
- Provides consistent validation across CLI and TUI
- Maintains clear separation of concerns
- Simplifies configuration management to just two YAML files

## System Flow

The configuration system follows this simple flow:

1. **Config manager loads defaults** from `config-defaults.yaml`
2. **Config manager loads user overrides** from `config.yaml`
3. **Config manager merges them** (user wins)
4. **UI requests current value** from config manager
5. **UI validates changes** against schema
6. **UI saves changes** back to `config.yaml`

## How Schema Drives UI and Validation

The configuration schema serves as the single source of truth for:

### UI Generation
- **Component Selection**: `type` field determines base component (text, select, boolean)
- **Enhanced Components**: `ui.component` overrides with specific variants (password, file picker, detailed-select)
- **Visual Hints**: Labels, descriptions, placeholders, help text
- **Conditional Display**: Show/hide fields based on other configuration values
- **Grouping**: Organize related settings into logical sections

### Validation
- **Type Checking**: Ensures values match expected types
- **Constraints**: Min/max values, string patterns, array lengths
- **Options**: Valid choices for select/multiselect fields
- **Custom Rules**: Reference to custom validation functions
- **Dynamic Rules**: Validation that changes based on other config values
- **Required Fields**: Conditionally required based on context

## Architecture

### 1. Schema Definition (`config-schema.ts`)

Defines the structure, validation rules, and UI hints for all configuration options:

```typescript
interface ConfigSchema {
  [groupName: string]: ConfigGroup;
}

interface ConfigGroup {
  label: string;           // Display name
  description: string;     // What this group configures
  icon?: string;          // Optional icon for TUI
  order: number;          // Display order
  items: {
    [key: string]: ConfigItem;
  };
}

interface ConfigItem {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'path' | 'array';
  label: string;
  description: string;
  required?: boolean;
  
  // Validation rules (no defaults!)
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
    minLength?: number;
    maxLength?: number;
    custom?: string;
  };
  
  // UI generation hints
  ui?: {
    component?: 'text' | 'password' | 'select' | 'checkbox' | 'radio' | 'file' | 'folder' | 'detailed-select';
    placeholder?: string;
    helpText?: string;
    columns?: string[];      // For detailed views
    destructive?: {          // For dangerous changes
      level: 'warning' | 'critical';
      message: string;
      consequences?: string[];
    };
  };
  
  // Conditional display/requirements
  conditions?: {
    when?: { [configPath: string]: any | any[] };
    requires?: { 
      gpu?: boolean;
      platform?: string[];
      feature?: string[];
    };
  };
  
  // For detailed list displays - references external data
  detailsSource?: string;      // Path to JSON file with option details
  detailsColumns?: string[];   // Columns to display from the data
  valueColumn?: string;        // Which column contains the option value (default: 'value')
}
```

### 2. Default Values (`config-defaults.yaml`)

Simple key-value pairs with sensible defaults:

```yaml
# Basic Settings
modelName: "nomic-embed-text"
fileExtensions: [".txt", ".md", ".pdf", ".docx"]
ignorePatterns: ["node_modules/**", ".git/**"]

# UI Preferences
theme: "auto"
showProgress: true
logLevel: "normal"

# Development
developmentEnabled: false

# Folders (empty by default)
folders: []
```

### 3. User Configuration (`config.yaml`)

Only contains user overrides:

```yaml
# User's choices
modelName: "all-MiniLM-L6-v2"
theme: "dark"
developmentEnabled: true

folders:
  - path: "~/Documents"
    name: "My Documents"
    enabled: true
```

### 4. Configuration Manager (`ConfigManager.ts`)

Minimal implementation that:
- Loads both YAML files
- Merges with user preferences taking precedence
- Provides current values
- Watches for changes
- NO validation logic (that's the schema's job)

```typescript
class ConfigManager {
  private defaults: any = {};
  private userConfig: any = {};
  private merged: any = {};
  
  async load(): Promise<void> {
    this.defaults = await this.loadYaml('config-defaults.yaml');
    if (fs.existsSync(this.configPath)) {
      this.userConfig = await this.loadYaml(this.configPath);
    }
    this.merged = { ...this.defaults, ...this.userConfig };
  }
  
  get(key: string): any {
    return _.get(this.merged, key);
  }
  
  async set(key: string, value: any): Promise<void> {
    _.set(this.userConfig, key, value);
    await this.saveYaml(this.configPath, this.userConfig);
    this.merged = { ...this.defaults, ...this.userConfig };
  }
}
```

### 5. Schema-to-UI Bridge (`ConfigurationItemFactory.ts`)

Converts schema definitions into TUI components:

```typescript
class ConfigurationItemFactory {
  static createFromSchema(
    groupKey: string, 
    itemKey: string, 
    schema: ConfigItem, 
    currentValue: any,  // From config manager (includes defaults)
    onSave: (value: any) => void
  ): IListItem {
    
    switch (schema.ui?.component || schema.type) {
      case 'select':
        return new SelectionListItem(
          '■',
          schema.label,
          schema.validation?.options?.map(opt => ({ 
            value: opt, 
            label: opt 
          })) || [],
          [currentValue],
          false,
          'radio',
          'horizontal',
          (values) => onSave(values[0])
        );
        
      case 'boolean':
        return new SelectionListItem(
          '■',
          schema.label,
          [
            { value: 'true', label: 'Enabled' },
            { value: 'false', label: 'Disabled' }
          ],
          [String(currentValue)],
          false,
          'radio',
          'horizontal',
          (values) => onSave(values[0] === 'true')
        );
        
      // ... other component mappings
    }
  }
}
```

## Example: Basic Configuration

### Schema Definition
```typescript
const configSchema: ConfigSchema = {
  basic: {
    label: "Basic Settings",
    description: "Core application settings",
    icon: "⚙️",
    order: 1,
    items: {
      modelName: {
        type: 'select',
        label: 'Embedding Model',
        description: 'Model used for semantic search',
        validation: {
          options: ['nomic-embed-text', 'all-MiniLM-L6-v2']
        }
      },
      fileExtensions: {
        type: 'array',
        label: 'File Types',
        description: 'Extensions to process',
        validation: {
          minLength: 1,
          pattern: '^\\.[a-zA-Z0-9]+$'
        }
      }
    }
  }
};
```

### TUI Generation
```typescript
function generateConfigurationItems(): IListItem[] {
  const items: IListItem[] = [];
  
  for (const [groupKey, group] of Object.entries(configSchema)) {
    // Add group header
    items.push(new LogItem(group.icon, group.label, group.description));
    
    // Add items
    for (const [itemKey, schema] of Object.entries(group.items)) {
      const currentValue = configManager.get(`${groupKey}.${itemKey}`);
      
      items.push(ConfigurationItemFactory.createFromSchema(
        groupKey,
        itemKey,
        schema,
        currentValue,
        async (value) => {
          await configManager.set(`${groupKey}.${itemKey}`, value);
        }
      ));
    }
  }
  
  return items;
}
```

## Advanced Patterns

### Detailed Lists with External Data

For options that benefit from comparison, data comes from JSON files:

```typescript
modelName: {
  type: 'select',
  label: 'Embedding Model',
  ui: {
    component: 'detailed-select'
  },
  detailsSource: 'data/embedding-models.json',
  detailsColumns: ['provider', 'speed', 'cost', 'quality'],
  valueColumn: 'id'  // Which field in the JSON contains the option value
}
```

#### External Data File Format

```json
// data/embedding-models.json
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
  },
  {
    "id": "text-embedding-3-small",
    "label": "OpenAI Text Embedding 3 Small",
    "provider": "OpenAI",
    "speed": "Fast",
    "cost": "$$",
    "quality": "Very Good"
  }
]
```

#### Data Loading in ConfigurationItemFactory

```typescript
class ConfigurationItemFactory {
  static async createFromSchema(
    groupKey: string,
    itemKey: string,
    schema: ConfigItem,
    currentValue: any,
    onSave: (value: any) => void
  ): IListItem {
    
    // Load external data if needed
    let options = schema.validation?.options;
    let optionDetails: any[] = [];
    
    if (schema.detailsSource) {
      try {
        const fileContent = await fs.readFile(schema.detailsSource, 'utf-8');
        const data = JSON.parse(fileContent);
        
        // Extract options from the data
        const valueCol = schema.valueColumn || 'value';
        options = data.map((item: any) => item[valueCol]);
        optionDetails = data;
      } catch (error) {
        logger.warn(`Failed to load details from ${schema.detailsSource}`, error);
      }
    }
    
    // Create detailed select if we have columns and data
    if (schema.ui?.component === 'detailed-select' && optionDetails.length > 0) {
      return new SelectionListItem(
        '■',
        schema.label,
        optionDetails.map(item => ({
          value: item[schema.valueColumn || 'value'],
          label: item.label || item.name,
          details: schema.detailsColumns?.reduce((acc, col) => {
            acc[col] = item[col];
            return acc;
          }, {} as any)
        })),
        [currentValue],
        false,
        'radio',
        'vertical',
        (values) => onSave(values[0]),
        undefined,
        undefined,
        false,
        true,  // showDetails
        schema.detailsColumns
      );
    }
    
    // ... handle other component types
  }
}
```

### Conditional Configuration

Show/hide fields based on other values:

```typescript
provider: {
  type: 'select',
  label: 'AI Provider',
  validation: { options: ['openai', 'local'] }
},
apiKey: {
  type: 'string',
  label: 'API Key',
  required: true,
  conditions: {
    when: { 'ai.provider': 'openai' }  // Only show for OpenAI
  },
  ui: { component: 'password' }
},
localModel: {
  type: 'select',
  label: 'Local Model',
  conditions: {
    when: { 'ai.provider': 'local' }   // Only show for local
  },
  validation: { 
    custom: 'ollamaModels'  // Dynamic options
  }
}
```

#### How Condition Validation Works

The condition checker is simple and efficient:

```typescript
function shouldShowItem(
  schema: ConfigItem,
  configValues: any
): boolean {
  if (!schema.conditions?.when) return true;
  
  // Check each condition
  for (const [path, expectedValue] of Object.entries(schema.conditions.when)) {
    const actualValue = _.get(configValues, path);
    
    // Handle array of acceptable values
    if (Array.isArray(expectedValue)) {
      if (!expectedValue.includes(actualValue)) return false;
    } else {
      if (actualValue !== expectedValue) return false;
    }
  }
  
  return true;
}
```

#### UI Self-Generation Example

The TUI automatically updates when conditions change:

```typescript
function generateConfigurationItems(): IListItem[] {
  const items: IListItem[] = [];
  const currentConfig = configManager.getAll();
  
  for (const [groupKey, group] of Object.entries(configSchema)) {
    // Add group header
    items.push(new LogItem(group.icon, group.label, group.description));
    
    // Add items that meet conditions
    for (const [itemKey, schema] of Object.entries(group.items)) {
      if (shouldShowItem(schema, currentConfig)) {
        const currentValue = configManager.get(`${groupKey}.${itemKey}`);
        
        items.push(ConfigurationItemFactory.createFromSchema(
          groupKey,
          itemKey,
          schema,
          currentValue,
          async (value) => {
            await configManager.set(`${groupKey}.${itemKey}`, value);
            // Re-render UI to show/hide dependent fields
            rerenderUI();
          }
        ));
      }
    }
  }
  
  return items;
}
```

This means:
- When user selects "openai" → API Key field appears automatically
- When user selects "local" → API Key disappears, Local Model field appears
- No manual UI state management needed!

### Dynamic Validation

Validation rules that change based on context:

```typescript
outputPath: {
  type: 'string',
  label: 'Output Path',
  dynamicValidation: {
    pathRequirements: (context) => {
      const provider = context.get('ai.provider');
      if (provider === 'openai') {
        return {
          pattern: '^/',  // Require absolute paths
          error: 'Cloud providers require absolute paths'
        };
      }
      return null;  // No additional validation
    }
  }
}
```

## Benefits

1. **Single Source of Truth**: Schema defines everything about configuration structure
2. **Automatic UI Generation**: No manual UI code for configuration screens
3. **Consistent Validation**: Same rules everywhere
4. **Clear Separation**: Each component has one job
5. **Type Safety**: TypeScript ensures consistency
6. **Conditional Logic**: Smart configuration based on user choices
7. **Rich UI Support**: Detailed lists, file pickers, password fields
8. **User-Focused**: Only exposes settings users should control

## Implementation Steps

1. Define configuration schema for all user settings
2. Create config-defaults.yaml with sensible defaults
3. Implement ConfigManager (loads, merges, watches)
4. Build ConfigurationItemFactory (schema → UI components)
5. Create validation system using schema rules
6. Update CLI commands to use schema validation
7. Generate TUI configuration panel from schema
8. Test conditional logic and dynamic validation
9. Support loading option details from JSON files