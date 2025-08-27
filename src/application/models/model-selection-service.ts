import { 
  MachineCapabilitiesDetector, 
  MachineCapabilities 
} from '../../domain/models/machine-capabilities.js';
import { 
  ModelCompatibilityEvaluator, 
  ModelCompatibilityScore, 
  EvaluationCriteria,
  CuratedModel 
} from '../../domain/models/model-evaluator.js';

export interface ModelRecommendation {
  primaryChoice: ModelCompatibilityScore;
  alternatives: ModelCompatibilityScore[];
  machineCapabilities: MachineCapabilities;
  evaluationCriteria: EvaluationCriteria;
  timestamp: Date;
}

export interface ModelSelectionOptions {
  languages: string[];
  mode: 'assisted' | 'manual';
  prioritizeSpeed?: boolean;
  prioritizeAccuracy?: boolean;
  maxAlternatives?: number;
}

export class ModelSelectionService {
  private capabilitiesDetector: MachineCapabilitiesDetector;
  private compatibilityEvaluator: ModelCompatibilityEvaluator;

  constructor() {
    this.capabilitiesDetector = new MachineCapabilitiesDetector();
    this.compatibilityEvaluator = new ModelCompatibilityEvaluator();
  }

  async recommendModels(options: ModelSelectionOptions): Promise<ModelRecommendation> {
    // Detect machine capabilities (uses 1-hour cache)
    const capabilities = await this.capabilitiesDetector.detectCapabilities();

    // Build evaluation criteria
    const criteria: EvaluationCriteria = {
      languages: options.languages,
      mode: options.mode,
      ...(options.prioritizeSpeed !== undefined && { prioritizeSpeed: options.prioritizeSpeed }),
      ...(options.prioritizeAccuracy !== undefined && { prioritizeAccuracy: options.prioritizeAccuracy })
    };

    // Evaluate all compatible models
    const scores = this.compatibilityEvaluator.evaluateModelCompatibility(
      capabilities, 
      criteria
    );

    // Filter out models that aren't hardware compatible for primary recommendation
    const compatibleScores = scores.filter(s => s.hardwareCompatible);
    
    if (compatibleScores.length === 0) {
      throw new Error('No models are compatible with current hardware configuration');
    }

    // Select primary recommendation (highest scoring compatible model)
    const primaryChoice = compatibleScores[0];
    if (!primaryChoice) {
      throw new Error('No compatible models found for current hardware configuration');
    }

    // Select alternatives (next best options, up to maxAlternatives)
    const maxAlts = options.maxAlternatives || 3;
    const alternatives = compatibleScores.slice(1, maxAlts + 1);

    return {
      primaryChoice,
      alternatives,
      machineCapabilities: capabilities,
      evaluationCriteria: criteria,
      timestamp: new Date()
    };
  }

  async getAssistedModeRecommendation(languages: string[]): Promise<ModelRecommendation> {
    return this.recommendModels({
      languages,
      mode: 'assisted',
      prioritizeAccuracy: true, // Assisted mode prioritizes reliability
      maxAlternatives: 2 // Limit alternatives for assisted mode
    });
  }

  async getManualModeOptions(languages: string[]): Promise<ModelRecommendation> {
    return this.recommendModels({
      languages,
      mode: 'manual',
      maxAlternatives: 5 // Show more options in manual mode
    });
  }

  async getSpeedOptimizedRecommendation(languages: string[]): Promise<ModelRecommendation> {
    return this.recommendModels({
      languages,
      mode: 'assisted',
      prioritizeSpeed: true,
      maxAlternatives: 3
    });
  }

  async getMachineCapabilities(): Promise<MachineCapabilities> {
    return this.capabilitiesDetector.detectCapabilities();
  }

  getEvaluator(): ModelCompatibilityEvaluator {
    return this.compatibilityEvaluator;
  }

  clearCapabilitiesCache(): void {
    this.capabilitiesDetector.clearCache();
  }

  getSupportedLanguages(): string[] {
    return this.compatibilityEvaluator.getSupportedLanguages();
  }

  getModelById(modelId: string): CuratedModel | undefined {
    return this.compatibilityEvaluator.getModelById(modelId);
  }

  // Validate model selection against current hardware
  async validateModelSelection(modelId: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendation?: string;
  }> {
    const model = this.getModelById(modelId);
    if (!model) {
      return {
        valid: false,
        issues: [`Model ${modelId} not found in catalog`]
      };
    }

    const capabilities = await this.getMachineCapabilities();
    
    // Test with neutral language criteria to focus on hardware
    const scores = this.compatibilityEvaluator.evaluateModelCompatibility(
      capabilities,
      { languages: ['en'], mode: 'manual' }
    );

    const modelScore = scores.find(s => s.model.id === modelId);
    if (!modelScore) {
      return {
        valid: false,
        issues: ['Unable to evaluate model compatibility']
      };
    }

    if (modelScore.hardwareCompatible) {
      return {
        valid: true,
        issues: []
      };
    }

    // Find better alternatives
    const compatibleAlternatives = scores.filter(s => s.hardwareCompatible);
    const recommendationText = compatibleAlternatives.length > 0
      ? `Consider ${compatibleAlternatives[0]!.model.displayName} instead`
      : 'No compatible models found for current hardware';

    return {
      valid: false,
      issues: modelScore.reasons.filter(r => r.includes('Insufficient')),
      recommendation: recommendationText
    };
  }

  // Get performance expectations for a model
  getModelPerformanceInfo(modelId: string): {
    model?: CuratedModel;
    expectedSpeed?: string;
    memoryUsage?: string;
    accuracyRating?: string;
    languageSupport?: string;
  } {
    const model = this.getModelById(modelId);
    if (!model) {
      return {};
    }

    const speedInfo = model.requirements?.gpu?.expectedTokensPerSec || 
                     model.requirements?.cpu?.expectedTokensPerSec;
    const speedText = speedInfo ? `~${speedInfo} tokens/sec` : 'Variable';

    const memoryInfo = model.requirements?.gpu?.minVRAM || 
                      model.requirements?.cpu?.minRAM ||
                      model.requirements?.cpu?.recRAM;
    const memoryText = memoryInfo ? `${Math.round(memoryInfo/1024)}GB+ required` : 'Minimal';

    const accuracyText = model.mtebScore ? `MTEB: ${model.mtebScore}` : 'Not benchmarked';

    const languageCount = Object.keys(model.languagePerformance).length;
    const languageText = `${languageCount} languages supported`;

    return {
      model,
      expectedSpeed: speedText,
      memoryUsage: memoryText,
      accuracyRating: accuracyText,
      languageSupport: languageText
    };
  }
}