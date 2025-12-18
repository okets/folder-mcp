/**
 * Theme Configuration Schema
 * 
 * Defines the schema for theme configuration validation
 */

import { ConfigItem, ConfigGroup, ConfigSchema } from '../IConfigSchema.js';

// All valid theme values (current + legacy for migration)
const validThemes = [
  // Current themes
  'auto', 'default', 'light', 'minimal',
  'high-contrast', 'colorblind',
  'ocean', 'forest', 'sunset',
  'dracula', 'nord', 'monokai', 'solarized', 'gruvbox',
  // Legacy names (mapped to current themes on load)
  'dark', 'light-optimized', 'dark-optimized'
];

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
    errorMessage: 'Theme must be one of: default, light, minimal, high-contrast, colorblind, ocean, forest, sunset, dracula, nord, monokai, solarized, gruvbox'
  },
  ui: {
    label: 'Theme',
    component: 'select',
    helpText: 'Choose your preferred color theme',
    options: [
      // Core
      { value: 'default', label: 'Default' },
      { value: 'light', label: 'Light' },
      { value: 'minimal', label: 'Minimal' },
      // Accessibility
      { value: 'high-contrast', label: 'High Contrast' },
      { value: 'colorblind', label: 'Colorblind' },
      // Nature
      { value: 'ocean', label: 'Ocean' },
      { value: 'forest', label: 'Forest' },
      { value: 'sunset', label: 'Sunset' },
      // Classic Editor
      { value: 'dracula', label: 'Dracula' },
      { value: 'nord', label: 'Nord' },
      { value: 'monokai', label: 'Monokai' },
      { value: 'solarized', label: 'Solarized' },
      { value: 'gruvbox', label: 'Gruvbox' }
    ]
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