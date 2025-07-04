/**
 * Configuration Validator
 * 
 * Provides validation for configuration objects with helpful error messages
 */

import { LocalConfig, ResolvedConfig, RuntimeConfig } from './schema.js';
import { validateConfig as validateConfigUtils } from './validation-utils.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  isValid?: boolean; // For compatibility
  errors: string[];
  warnings: string[];
}

/**
 * Validate a configuration object
 */
export async function validateConfig(
  config: LocalConfig | ResolvedConfig | RuntimeConfig | any
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Use existing validation utils
    const utilsResult = validateConfigUtils(config, 'local');
    
    if (!utilsResult.isValid) {
      errors.push(...utilsResult.errors.map(e => e.message));
    }

    // Add any warnings
    if (utilsResult.warnings) {
      warnings.push(...utilsResult.warnings.map(w => w.message));
    }

    // Additional async validations can be added here
    // For example, checking if Ollama is available when ollama backend is selected

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Validation error: ${error.message}`],
      warnings
    };
  }
}

/**
 * Validate a configuration path exists in the schema
 */
export function isValidConfigPath(path: string): boolean {
  // This would check against a registry of valid paths
  // For now, return true
  return true;
}

/**
 * Get the expected type for a configuration path
 */
export function getConfigPathType(path: string): string {
  // This would return the expected type from the schema
  // For now, return 'any'
  return 'any';
}