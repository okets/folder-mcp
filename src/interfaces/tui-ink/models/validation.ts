// Validation result type
export interface IValidationResult {
    isValid: boolean;
    errors: string[];
}

// Common validation rules
export class ValidationRules {
    static required<T>(message = 'This field is required'): IValidationRule<T> {
        return {
            validate: (value: T) => {
                if (typeof value === 'string') {
                    return value.trim().length > 0;
                }
                if (Array.isArray(value)) {
                    return value.length > 0;
                }
                return value !== null && value !== undefined;
            },
            message
        };
    }

    static minLength(min: number, message?: string): IValidationRule<string> {
        return {
            validate: (value: string) => value.length >= min,
            message: message || `Must be at least ${min} characters`
        };
    }

    static maxLength(max: number, message?: string): IValidationRule<string> {
        return {
            validate: (value: string) => value.length <= max,
            message: message || `Must be no more than ${max} characters`
        };
    }

    static range(min: number, max: number, message?: string): IValidationRule<number> {
        return {
            validate: (value: number) => value >= min && value <= max,
            message: message || `Must be between ${min} and ${max}`
        };
    }

    static pattern(regex: RegExp, message: string): IValidationRule<string> {
        return {
            validate: (value: string) => regex.test(value),
            message
        };
    }

    static portNumber(): IValidationRule<number> {
        return {
            validate: (value: number) => value >= 1024 && value <= 65535,
            message: 'Port must be between 1024 and 65535'
        };
    }

    static path(): IValidationRule<string> {
        return {
            validate: (value: string) => {
                // Basic path validation - can be enhanced
                return value.length > 0 && !value.includes('\0');
            },
            message: 'Invalid path'
        };
    }
}

// Re-export from configuration for convenience
export type { IValidationRule } from './configuration.js';