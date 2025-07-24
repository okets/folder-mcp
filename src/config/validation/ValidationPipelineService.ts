/**
 * Singleton ValidationPipeline Service
 * 
 * Provides a pre-configured validation pipeline with all standard validators registered.
 * Used by ConfigurationComponent for all validation operations.
 */

import { ValidationPipeline } from './ValidationPipeline';
import { SchemaValidator } from './SchemaValidator';
import { FolderBusinessValidator } from './FolderBusinessValidator';
import { IValidationPipeline } from './IValidationPipeline';

export class ValidationPipelineService {
    private static instance: IValidationPipeline;
    
    /**
     * Get the singleton validation pipeline instance
     */
    static getInstance(): IValidationPipeline {
        if (!this.instance) {
            this.instance = this.createPipeline();
        }
        return this.instance;
    }
    
    /**
     * Create and configure the validation pipeline
     */
    private static createPipeline(): IValidationPipeline {
        const pipeline = new ValidationPipeline({
            stopOnError: true,
            accumulateWarnings: true // Collect warnings even if there are errors
        });
        
        // Register validators in priority order
        pipeline.registerValidator(new SchemaValidator());
        pipeline.registerValidator(new FolderBusinessValidator());
        
        // Future validators can be added here:
        // pipeline.registerValidator(new ModelValidator());
        // pipeline.registerValidator(new ApiKeyValidator());
        // pipeline.registerValidator(new NetworkValidator());
        
        return pipeline;
    }
    
    /**
     * Reset the pipeline (mainly for testing)
     */
    static reset(): void {
        this.instance = this.createPipeline();
    }
}