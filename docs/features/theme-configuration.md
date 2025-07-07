# Theme Configuration

The TUI (Terminal User Interface) supports configurable themes that persist across sessions through the configuration system.

## Configuration

Theme preferences are stored in the user configuration file (`config.yaml`):

```yaml
# config.yaml
theme: dark  # Options: light, dark, auto
```

The `auto` option will use the system's default theme (currently defaults to the standard theme).

## Available Themes

- **light** - Light theme with dark text on light backgrounds
- **dark** - Dark theme with bright colors for better contrast
- **auto** - Automatically selects theme based on system preferences (default)

## CLI Override

You can override the theme temporarily using the CLI:

```bash
node dist/src/mcp-server.js --theme dark /path/to/folder
```

## Programmatic Usage

### ConfigurableThemeService

The `ConfigurableThemeService` integrates with the configuration system:

```typescript
import { ConfigurableThemeService } from './services/ConfigurableThemeService';
import { IConfigManager } from '../../domain/config/IConfigManager';

const themeService = new ConfigurableThemeService(configManager);

// Get current theme
const themeName = themeService.getThemeName();

// Change theme (persists to config)
await themeService.setTheme('dark');
```

### React Integration

The `ConfigurationThemeProvider` component provides theme configuration to React components:

```tsx
import { ConfigurationThemeProvider } from './contexts/ConfigurationThemeProvider';

<ConfigurationThemeProvider configManager={configManager}>
  <YourApp />
</ConfigurationThemeProvider>
```

Within your components, use the `useTheme` hook:

```tsx
import { useTheme } from './contexts/ThemeContext';

const MyComponent = () => {
  const { theme, themeName, setTheme } = useTheme();
  
  return (
    <Text color={theme.colors.primary}>
      Current theme: {themeName}
    </Text>
  );
};
```

## Demo

Run the theme configuration demo:

```bash
tsx src/interfaces/tui-ink/demo-theme-config.tsx
```

This will:
1. Create a demo configuration directory
2. Load theme from configuration
3. Allow changing themes with the 't' key
4. Save theme changes back to configuration

## Implementation Details

The theme configuration system consists of:

1. **ConfigurableThemeService** - Service that loads themes from configuration
2. **ConfigurationThemeProvider** - React provider that integrates with configuration
3. **ThemeContext** - React context with enhanced persistence support
4. **Theme Schema** - Validation schema for theme configuration values

Theme changes are automatically validated against the schema and persisted to the user's configuration file.