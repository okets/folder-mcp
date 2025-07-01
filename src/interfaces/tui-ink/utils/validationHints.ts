import type { IValidationRule } from '../models/configuration.js';

/**
 * Generates a helpful placeholder hint for password fields
 */
export function generatePasswordHint(validationRules?: IValidationRule<string>[]): string {
    // Visual, intuitive placeholder showing password requirements
    return 'Aa · >8 · 1-9 · %$#';
}

/**
 * Generates validation hints for other field types
 */
export function generateValidationHint(validationRules?: IValidationRule<string>[]): string {
    return 'Enter value...';
}
