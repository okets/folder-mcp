import type { IValidationRule } from './configuration.js';

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

    static email(message = 'Invalid email format'): IValidationRule<string> {
        return {
            validate: (value: string) => {
                // Simple email validation regex
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message
        };
    }

    static ipAddress(version: 'v4' | 'v6' | 'both' = 'both', message?: string): IValidationRule<string> {
        return {
            validate: (value: string) => {
                if (version === 'v4' || version === 'both') {
                    // IPv4 validation
                    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    if (ipv4Regex.test(value)) {
                        const octets = value.split('.').map(Number);
                        const isValidIPv4 = octets.every(octet => octet >= 0 && octet <= 255);
                        if (isValidIPv4) return true;
                    }
                }
                
                if (version === 'v6' || version === 'both') {
                    // Basic IPv6 validation
                    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/;
                    if (ipv6Regex.test(value)) return true;
                }
                
                return false;
            },
            message: message || `Invalid IP${version === 'both' ? 'v4/v6' : version} address`
        };
    }

    static number(options?: { min?: number; max?: number; integer?: boolean }, message?: string): IValidationRule<string> {
        return {
            validate: (value: string) => {
                // Empty string is not a valid number
                if (value === '') return false;
                
                const num = Number(value);
                
                // Check if it's a valid number
                if (isNaN(num)) return false;
                
                // Check integer constraint
                if (options?.integer && !Number.isInteger(num)) return false;
                
                // Check min constraint
                if (options?.min !== undefined && num < options.min) return false;
                
                // Check max constraint
                if (options?.max !== undefined && num > options.max) return false;
                
                return true;
            },
            message: message || (() => {
                if (options?.min !== undefined && options?.max !== undefined) {
                    return `Must be a${options.integer ? 'n integer' : ' number'} between ${options.min} and ${options.max}`;
                } else if (options?.min !== undefined) {
                    return `Must be a${options.integer ? 'n integer' : ' number'} greater than or equal to ${options.min}`;
                } else if (options?.max !== undefined) {
                    return `Must be a${options.integer ? 'n integer' : ' number'} less than or equal to ${options.max}`;
                } else if (options?.integer) {
                    return 'Must be an integer';
                }
                return 'Must be a number';
            })()
        };
    }

    static customRegex(pattern: string | RegExp, flags?: string, message = 'Does not match required pattern'): IValidationRule<string> {
        return {
            validate: (value: string) => {
                try {
                    const regex = typeof pattern === 'string' ? new RegExp(pattern, flags) : pattern;
                    return regex.test(value);
                } catch {
                    // Invalid regex pattern
                    return false;
                }
            },
            message
        };
    }
}