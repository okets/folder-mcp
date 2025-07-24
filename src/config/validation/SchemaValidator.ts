/**
 * Schema Validator
 * 
 * Wraps the existing ValidationRegistry to provide schema validation
 * as the first step in the validation pipeline.
 */

import { IValidator } from './IValidationPipeline';
import { ValidationResult } from '../ConfigurationComponent';
import { ValidationRegistry } from '../ValidationRegistry';

export class SchemaValidator implements IValidator {
    name = 'SchemaValidator';
    priority = 100; // Run first
    
    canValidate(path: string): boolean {
        // Schema validator can validate any registered path
        return ValidationRegistry.hasRule(path);
    }
    
    async validate(path: string, value: any, context?: any): Promise<ValidationResult> {
        // Convert value to string for ValidationRegistry (it expects strings)
        const stringValue = String(value);
        
        // Use ValidationRegistry for schema validation
        const registryResult = ValidationRegistry.validateValue(path, stringValue);
        
        if (registryResult.isValid) {
            return { valid: true };
        }
        
        return {
            valid: false,
            errors: [{
                path,
                message: registryResult.error || 'Schema validation failed'
            }]
        };
    }
}