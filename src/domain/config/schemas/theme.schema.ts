/**
 * Theme Configuration Schema
 * 
 * Defines the schema for theme configuration validation
 */

import { ConfigItem, ConfigGroup, ConfigSchema } from '../IConfigSchema.js';

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
    enum: ['light', 'dark', 'auto'],
    errorMessage: 'Theme must be one of: light, dark, auto'
  },
  ui: {
    label: 'Theme',
    component: 'select',
    helpText: 'Choose your preferred color theme',
    options: [
      { value: 'light', label: 'Light Mode' },
      { value: 'dark', label: 'Dark Mode' },
      { value: 'auto', label: 'Auto (System)' }
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