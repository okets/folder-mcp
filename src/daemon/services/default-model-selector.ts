/**
 * Default Model Selector Service
 * 
 * Dynamically selects the optimal default model based on machine capabilities.
 * Ensures no hardcoded model names and adapts to hardware configuration.
 */

import { ILoggingService } from '../../di/interfaces.js';
import { 
    MachineCapabilitiesDetector, 
    MachineCapabilities 
} from '../../domain/models/machine-capabilities.js';
import { 
    ModelCompatibilityEvaluator,
    EvaluationCriteria
} from '../../domain/models/model-evaluator.js';
import { CuratedModelInfo } from '../models/fmdm.js';
import { 
    getSupportedGpuModelIds,
    getSupportedCpuModelIds,
    getModelById,
    findSmallestCpuModel
} from '../../config/model-registry.js';

/**
 * Default model selection metadata
 */
export interface DefaultModelSelection {
    modelId: string;
    selectedAt: string;
    selectionReason: string;
    hardwareProfile: {
        hasGPU: boolean;
        gpuType?: string;
        totalRAMGB: number;
        availableRAMGB: number;
        pythonAvailable: boolean;
    };
}

/**
 * Service for selecting optimal default model based on hardware
 */
export class DefaultModelSelector {
    private capabilitiesDetector: MachineCapabilitiesDetector;
    private compatibilityEvaluator: ModelCompatibilityEvaluator;
    
    constructor(
        private logger: ILoggingService,
        private curatedModels: CuratedModelInfo[] = [],
        private pythonAvailable: boolean = false
    ) {
        this.capabilitiesDetector = new MachineCapabilitiesDetector();
        this.compatibilityEvaluator = new ModelCompatibilityEvaluator();
    }
    
    /**
     * Determine the optimal default model for current hardware
     */
    async determineOptimalDefault(): Promise<DefaultModelSelection> {
        try {
            // 1. Detect hardware capabilities
            const capabilities = await this.capabilitiesDetector.detectCapabilities();
            this.logger.debug('Hardware capabilities detected:', {
                gpu: capabilities.gpu.type,
                vram: capabilities.gpu.vramGB,
                ram: capabilities.memory.totalRAMGB
            });
            
            // 2. Determine Python availability (only relevant if GPU exists)
            // Note: Python availability is passed in constructor from ModelCacheChecker
            // We don't check it here to avoid loading Python unnecessarily
            const effectivePythonAvailable = capabilities.gpu.type !== 'none' ? this.pythonAvailable : false;
            
            // 3. Select best model based on capabilities
            const modelId = await this.selectBestModel(capabilities, effectivePythonAvailable);
            
            // 4. Build selection reason
            const selectionReason = this.buildSelectionReason(capabilities, effectivePythonAvailable, modelId);
            
            // 5. Return selection with metadata
            return {
                modelId,
                selectedAt: new Date().toISOString(),
                selectionReason,
                hardwareProfile: {
                    hasGPU: capabilities.gpu.type !== 'none',
                    gpuType: capabilities.gpu.type,
                    totalRAMGB: capabilities.memory.totalRAMGB,
                    availableRAMGB: capabilities.memory.availableRAMGB,
                    pythonAvailable: effectivePythonAvailable
                }
            };
            
        } catch (error) {
            this.logger.error('Failed to determine optimal default model:', error instanceof Error ? error : new Error(String(error)));
            
            // Fallback to smallest CPU model
            const fallbackId = findSmallestCpuModel();
            return {
                modelId: fallbackId,
                selectedAt: new Date().toISOString(),
                selectionReason: 'Fallback to smallest CPU model due to error',
                hardwareProfile: {
                    hasGPU: false,
                    totalRAMGB: 0,
                    availableRAMGB: 0,
                    pythonAvailable: false
                }
            };
        }
    }
    
    /**
     * Select the best model based on capabilities and constraints
     */
    private async selectBestModel(
        capabilities: MachineCapabilities, 
        pythonAvailable: boolean
    ): Promise<string> {
        // Build evaluation criteria
        const criteria: EvaluationCriteria = {
            languages: [], // Default model should work for any language
            mode: 'assisted'
        };
        
        // Get all compatible models scored by quality
        const scores = this.compatibilityEvaluator.evaluateModelCompatibility(
            capabilities,
            criteria
        );
        
        // Filter to only compatible models
        const compatible = scores.filter(s => s.hardwareCompatible);
        
        if (compatible.length === 0) {
            this.logger.warn('No compatible models found, using smallest CPU model');
            return findSmallestCpuModel();
        }
        
        // For default selection, we need a model that will work immediately
        if (capabilities.gpu.type !== 'none' && pythonAvailable) {
            // GPU + Python available: prefer installed GPU models
            const installedGpuModel = this.findBestInstalledGpuModel(compatible);
            if (installedGpuModel) {
                return installedGpuModel;
            }
            
            // No installed GPU model, select best GPU model (will download on first use)
            const bestGpuModel = compatible.find(s => s.model.id.startsWith('gpu:'));
            if (bestGpuModel) {
                return bestGpuModel.model.id;
            }
        }
        
        // CPU only or no Python: select best CPU model
        const bestCpuModel = compatible.find(s => s.model.id.startsWith('cpu:'));
        if (bestCpuModel) {
            return bestCpuModel.model.id;
        }
        
        // Ultimate fallback
        return findSmallestCpuModel();
    }
    
    /**
     * Find the best installed GPU model from compatible models
     */
    private findBestInstalledGpuModel(compatibleScores: any[]): string | null {
        for (const score of compatibleScores) {
            if (!score.model.id.startsWith('gpu:')) continue;
            
            // Check if this model is installed
            const modelInfo = this.curatedModels.find(m => m.id === score.model.id);
            if (modelInfo?.installed) {
                return score.model.id;
            }
        }
        return null;
    }
    
    /**
     * Build a human-readable selection reason
     */
    private buildSelectionReason(
        capabilities: MachineCapabilities,
        pythonAvailable: boolean,
        modelId: string
    ): string {
        const model = getModelById(modelId);
        const modelType = modelId.startsWith('gpu:') ? 'GPU' : 'CPU';
        
        if (capabilities.gpu.type === 'none') {
            return `No GPU detected, selected ${modelType} model: ${model?.displayName || modelId}`;
        }
        
        if (!pythonAvailable) {
            return `GPU detected but Python unavailable, selected CPU model: ${model?.displayName || modelId}`;
        }
        
        if (modelType === 'GPU') {
            const vram = capabilities.gpu.vramGB || 'unknown';
            return `GPU detected (${capabilities.gpu.type}, ${vram}GB VRAM) with Python, selected GPU model: ${model?.displayName || modelId}`;
        }
        
        return `Selected ${modelType} model based on available resources: ${model?.displayName || modelId}`;
    }
}