/**
 * Singleton ValidationPipeline Service
 * 
 * Provides a pre-configured validation pipeline with all standard validators registered.
 * Used by ConfigurationComponent for all validation operations.
 */

import { ValidationPipeline } from './ValidationPipeline.js';
import { SchemaValidator } from './SchemaValidator.js';
import { FolderBusinessValidator } from './FolderBusinessValidator.js';
import { IValidationPipeline } from './IValidationPipeline.js';
import { FolderValidationService } from '../../interfaces/tui-ink/services/FolderValidationService.js';

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
        
        // For the folder validator, we need to create the validation service
        // Since this is a singleton service pattern and FolderValidationService 
        // handles its own DI internally, this is acceptable
        const folderValidationService = new FolderValidationService();
        pipeline.registerValidator(new FolderBusinessValidator(folderValidationService));
        
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