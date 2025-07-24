/**
 * Validation Pipeline Interface
 * 
 * Provides an extensible validation system that combines schema validation
 * with business logic validation. Validators are executed in priority order.
 */

import { ValidationResult } from '../ConfigurationComponent';

/**
 * Individual validator that can validate specific configuration paths
 */
export interface IValidator {
    /**
     * Check if this validator can handle the given configuration path
     */
    canValidate(path: string): boolean;
    
    /**
     * Perform validation on the value
     * @param path Configuration path being validated
     * @param value Value to validate
     * @param context Optional context (e.g., existing configuration)
     * @returns Validation result with errors/warnings
     */
    validate(path: string, value: any, context?: any): Promise<ValidationResult>;
    
    /**
     * Priority of this validator (lower numbers run first)
     * Schema validation should run before business logic validation
     */
    priority: number;
    
    /**
     * Human-readable name for debugging
     */
    name: string;
}

/**
 * Validation pipeline that runs multiple validators in sequence
 */
export interface IValidationPipeline {
    /**
     * Register a new validator
     */
    registerValidator(validator: IValidator): void;
    
    /**
     * Unregister a validator by name
     */
    unregisterValidator(name: string): void;
    
    /**
     * Run all applicable validators for a path
     * @param path Configuration path to validate
     * @param value Value to validate
     * @param context Optional context for validation
     * @returns Combined validation result
     */
    validate(path: string, value: any, context?: any): Promise<ValidationResult>;
    
    /**
     * Get all registered validators (for debugging)
     */
    getValidators(): IValidator[];
}

/**
 * Options for creating validation pipeline
 */
export interface ValidationPipelineOptions {
    /**
     * Stop on first error (default: true)
     */
    stopOnError?: boolean;
    
    /**
     * Accumulate warnings even if errors occur (default: false)
     */
    accumulateWarnings?: boolean;
}