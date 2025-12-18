/**
 * Theme Configuration Schema
 *
 * Defines the schema for theme configuration validation.
 * Uses ThemeContext as single source of truth for valid theme names.
 */

import { ConfigItem, ConfigGroup, ConfigSchema } from '../IConfigSchema.js';
import { themes, ThemeName } from '../../../interfaces/tui-ink/contexts/ThemeContext.js';

// Valid themes from ThemeContext - single source of truth
const validThemes = Object.keys(themes) as ThemeName[];

/**
 * Theme configuration item schema
 */
export const themeConfigItem: ConfigItem = {
  name: 'theme',
  type: 'enum',
  label: 'Theme',
  description: 'Application color theme preference',
  required: false,
  validation: {
    enum: validThemes,
    errorMessage: `Theme must be one of: ${validThemes.join(', ')}`
  },
  ui: {
    label: 'Theme',
    component: 'select',
    helpText: 'Choose your preferred color theme',
    // Generated from ThemeContext - each theme has a .name property for display label
    options: validThemes.map(key => ({
      value: key,
      label: themes[key].name
    }))
  }
};

/**
 * Appearance group containing theme and related settings
 */
export const appearanceGroup: ConfigGroup = {
  name: 'appearance',
  label: 'Appearance',
  description: 'Visual appearance settings',
  order: 1,
  items: {
    theme: themeConfigItem
  }
};

/**
 * Complete theme schema
 */
export const themeSchema: ConfigSchema = {
  version: '1.0.0',
  groups: {
    appearance: appearanceGroup
  }
};

/**
 * Validate a theme value against the schema
 */
export function validateThemeValue(value: any): { valid: boolean; error?: string } {
  if (!themeConfigItem.validation?.enum?.includes(value)) {
    return {
      valid: false,
      error: themeConfigItem.validation?.errorMessage || 'Invalid theme value'
    };
  }
  
  return { valid: true };
}

/**
 * Get theme options for UI
 */
export function getThemeOptions(): Array<{ value: string; label: string }> {
  return themeConfigItem.ui?.options || [];
}