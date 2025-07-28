/**
 * Implementation of ValidationPipeline
 * 
 * Runs validators in priority order and combines results
 */

import { IValidator, IValidationPipeline, ValidationPipelineOptions } from './IValidationPipeline';
import { ValidationResult } from '../ConfigurationComponent.js';

export class ValidationPipeline implements IValidationPipeline {
    private validators: Map<string, IValidator> = new Map();
    private options: Required<ValidationPipelineOptions>;
    
    constructor(options: ValidationPipelineOptions = {}) {
        this.options = {
            stopOnError: options.stopOnError ?? true,
            accumulateWarnings: options.accumulateWarnings ?? false
        };
    }
    
    registerValidator(validator: IValidator): void {
        this.validators.set(validator.name, validator);
    }
    
    unregisterValidator(name: string): void {
        this.validators.delete(name);
    }
    
    async validate(path: string, value: any, context?: any): Promise<ValidationResult> {
        // Get applicable validators sorted by priority
        const applicableValidators = Array.from(this.validators.values())
            .filter(v => v.canValidate(path))
            .sort((a, b) => a.priority - b.priority);
        
        if (applicableValidators.length === 0) {
            // No validators for this path - assume valid
            return { valid: true };
        }
        
        const errors: Array<{ path: string; message: string }> = [];
        const warnings: Array<{ path: string; message: string }> = [];
        
        for (const validator of applicableValidators) {
            try {
                const result = await validator.validate(path, value, context);
                
                if (!result.valid && result.errors) {
                    errors.push(...result.errors);
                    
                    if (this.options.stopOnError && !this.options.accumulateWarnings) {
                        // Stop immediately on error
                        return {
                            valid: false,
                            errors
                        };
                    }
                }
                
                if (result.warnings) {
                    warnings.push(...result.warnings);
                }
                
                // If we have errors and stopOnError is true, break after accumulating warnings
                if (errors.length > 0 && this.options.stopOnError) {
                    break;
                }
            } catch (error) {
                // Validator threw an error - treat as validation error
                errors.push({
                    path,
                    message: `Validator '${validator.name}' failed: ${error instanceof Error ? error.message : String(error)}`
                });
                
                if (this.options.stopOnError) {
                    return {
                        valid: false,
                        errors
                    };
                }
            }
        }
        
        const result: ValidationResult = {
            valid: errors.length === 0
        };
        
        if (errors.length > 0) {
            result.errors = errors;
        }
        
        if (warnings.length > 0) {
            result.warnings = warnings;
        }
        
        return result;
    }
    
    getValidators(): IValidator[] {
        return Array.from(this.validators.values())
            .sort((a, b) => a.priority - b.priority);
    }
}