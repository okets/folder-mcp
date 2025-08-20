import { MachineCapabilities, GPUCapabilities } from './machine-capabilities.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CuratedModel {
  id: string;
  displayName: string;
  description: string;
  huggingfaceId?: string;
  modelName?: string; // For Ollama models
  dimensions: number;
  modelSizeMB: number;
  languagePerformance: Record<string, number>;
  mtebScore?: number;
  contextWindow?: number;
  requirements?: {
    prefixes?: boolean;
    cpu?: {
      minRAM?: number;
      recRAM?: number;
      expectedTokensPerSec?: number;
      optimalCpuFeatures?: string[];
    };
    gpu?: {
      minVRAM?: number;
      expectedTokensPerSec?: number;
    };
    vram?: number; // For Ollama models
    installCommand?: string; // For Ollama models
  };
  downloadInfo?: {
    url: string;
    architecture: string;
  };
  quantization?: string;
}

export interface ModelCatalog {
  version: string;
  lastUpdated: string;
  dataSource: string;
  gpuModels: {
    description: string;
    provider: string;
    downloadMethod: string;
    models: CuratedModel[];
  };
  cpuModels: {
    description: string;
    provider: string;
    downloadMethod: string;
    baseUrl: string;
    models: CuratedModel[];
  };
  metadata: any;
}

export interface ModelCompatibilityScore {
  model: CuratedModel;
  score: number;
  reasons: string[];
  hardwareCompatible: boolean;
  languageScore: number;
  recommendedUse: string;
}

export interface EvaluationCriteria {
  languages: string[];
  mode: 'assisted' | 'manual';
  prioritizeSpeed?: boolean;
  prioritizeAccuracy?: boolean;
}

export class ModelCompatibilityEvaluator {
  private catalog!: ModelCatalog;

  constructor() {
    // Load catalog synchronously using dynamic import
    this.loadCatalogSync();
  }

  private loadCatalogSync(): void {
    try {
      const catalogPath = join(__dirname, '../../config/curated-models.json');
      const jsonContent = readFileSync(catalogPath, 'utf-8');
      this.catalog = JSON.parse(jsonContent) as ModelCatalog;
    } catch (error) {
      const errorMessage = `Failed to load curated-models.json: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[DAEMON] ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  evaluateModelCompatibility(
    capabilities: MachineCapabilities,
    criteria: EvaluationCriteria
  ): ModelCompatibilityScore[] {
    const allModels = this.getAllAvailableModels(criteria.mode);
    const scores: ModelCompatibilityScore[] = [];

    for (const model of allModels) {
      const score = this.scoreModel(model, capabilities, criteria);
      scores.push(score);
    }

    // Sort by score (highest first)
    return scores.sort((a, b) => b.score - a.score);
  }

  private getAllAvailableModels(mode: 'assisted' | 'manual'): CuratedModel[] {
    const models: CuratedModel[] = [];

    // Always include GPU and CPU models from curated catalog
    models.push(...this.catalog.gpuModels.models);
    models.push(...this.catalog.cpuModels.models);

    // Ollama models are handled separately via runtime detection
    // They are not included in the curated catalog anymore

    return models;
  }

  private scoreModel(
    model: CuratedModel,
    capabilities: MachineCapabilities,
    criteria: EvaluationCriteria
  ): ModelCompatibilityScore {
    let score = 0;
    const reasons: string[] = [];
    let languageScore = 0;
    let recommendedUse = 'Not recommended';

    // Check hardware compatibility (BINARY FILTER - not scored)
    const hardwareResult = this.evaluateHardwareCompatibility(model, capabilities);
    const hardwareCompatible = hardwareResult.compatible;
    reasons.push(...hardwareResult.reasons);

    // If hardware is incompatible, return early with minimal score
    if (!hardwareCompatible) {
      return {
        model,
        score: 0,
        reasons,
        hardwareCompatible: false,
        languageScore: 0,
        recommendedUse: 'Hardware insufficient'
      };
    }

    // Language Performance: 60% weight (0-60 points)
    const langScore = this.evaluateLanguagePerformance(model, criteria.languages);
    languageScore = langScore.averageScore;
    const languagePoints = langScore.averageScore * 60; // 60% weight
    score += languagePoints;
    reasons.push(`Language compatibility: ${(langScore.averageScore * 100).toFixed(0)}%`);

    // Accuracy (MTEB): 32% weight (0-32 points)
    if (model.mtebScore) {
      const accuracyPoints = (model.mtebScore / 80) * 32; // 32% weight, normalized from MTEB scores
      score += accuracyPoints;
      reasons.push(`Accuracy: MTEB ${model.mtebScore}`);
    }

    // Speed: 8% weight (0-8 points) - Use best available speed benchmark
    const gpuSpeed = model.requirements?.gpu?.expectedTokensPerSec;
    const cpuSpeed = model.requirements?.cpu?.expectedTokensPerSec;
    const bestSpeed = Math.max(gpuSpeed || 0, cpuSpeed || 0);
    
    if (bestSpeed > 0) {
      const speedPoints = Math.min(bestSpeed / 300, 1) * 8; // 8% weight, normalized to ~300 tokens/sec max
      score += speedPoints;
      reasons.push(`Speed: ${bestSpeed} tokens/sec`);
    }

    // Determine recommended use
    if (hardwareCompatible && languageScore > 0.7) {
      recommendedUse = 'Excellent choice';
    } else if (hardwareCompatible && languageScore > 0.6) {
      recommendedUse = 'Good option';
    } else if (hardwareCompatible) {
      recommendedUse = 'Usable with limitations';
    } else {
      recommendedUse = 'Hardware insufficient';
    }

    return {
      model,
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      reasons,
      hardwareCompatible,
      languageScore,
      recommendedUse
    };
  }

  private evaluateHardwareCompatibility(
    model: CuratedModel,
    capabilities: MachineCapabilities
  ): { compatible: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;
    let compatible = false;

    // Check if this is a GPU model
    if (this.catalog.gpuModels.models.includes(model)) {
      const gpuReq = model.requirements?.gpu;
      if (gpuReq && capabilities.gpu.type !== 'none') {
        const requiredVRAM = gpuReq.minVRAM || 4096; // Default 4GB requirement
        const availableVRAM = capabilities.gpu.vramGB || 0;

        if (availableVRAM * 1024 >= requiredVRAM) {
          compatible = true;
          score += 15; // High score for GPU compatibility
          reasons.push(`GPU compatible: ${availableVRAM}GB VRAM available`);
        } else {
          reasons.push(`Insufficient VRAM: need ${requiredVRAM/1024}GB, have ${availableVRAM}GB`);
        }
      } else if (capabilities.gpu.type === 'none') {
        // Fall back to CPU requirements
        const cpuReq = model.requirements?.cpu;
        if (cpuReq) {
          const requiredRAM = cpuReq.minRAM || cpuReq.recRAM || 2048;
          if (capabilities.memory.availableRAMGB * 1024 >= requiredRAM) {
            compatible = true;
            score += 8; // Lower score for CPU fallback
            reasons.push(`CPU fallback: ${capabilities.memory.availableRAMGB}GB RAM available`);
          } else {
            reasons.push(`Insufficient RAM: need ${requiredRAM/1024}GB`);
          }
        }
      }
    }
    
    // Check if this is a CPU/ONNX model
    else if (this.catalog.cpuModels.models.includes(model)) {
      const cpuReq = model.requirements?.cpu;
      if (cpuReq) {
        const requiredRAM = cpuReq.minRAM || 512;
        if (capabilities.memory.availableRAMGB * 1024 >= requiredRAM) {
          compatible = true;
          score += 12; // Good score for CPU compatibility
          reasons.push(`CPU optimized: ${capabilities.memory.availableRAMGB}GB RAM available`);

          // Bonus for CPU features
          if (cpuReq.optimalCpuFeatures) {
            const hasFeatures = cpuReq.optimalCpuFeatures.some(feature => 
              capabilities.cpu.features.some(cpuFeature => 
                cpuFeature.toLowerCase().includes(feature.toLowerCase())
              )
            );
            if (hasFeatures) {
              score += 3;
              reasons.push('Optimized CPU features available (AVX2/FMA)');
            }
          }
        } else {
          reasons.push(`Insufficient RAM: need ${requiredRAM/1024}GB`);
        }
      } else {
        // Assume minimal requirements for ONNX models
        compatible = true;
        score += 10;
        reasons.push('CPU model with minimal requirements');
      }
    }
    
    // Ollama models are no longer in the curated catalog
    // They are handled separately via runtime detection

    return { compatible, score, reasons };
  }

  private evaluateLanguagePerformance(
    model: CuratedModel,
    languages: string[]
  ): { score: number; averageScore: number } {
    if (languages.length === 0) {
      return { score: 0.5, averageScore: 0.5 }; // Neutral score (will become 30 points when multiplied by 60)
    }

    const languageScores: number[] = [];
    
    for (const lang of languages) {
      const langCode = lang.toLowerCase();
      const performance = model.languagePerformance[langCode];
      
      if (performance !== undefined) {
        languageScores.push(performance);
      } else {
        // Try to find similar language codes or fallback to English
        const fallbackScore = model.languagePerformance['en'] || 0.5;
        languageScores.push(fallbackScore * 0.7); // Reduce for unsupported language
      }
    }

    const averageScore = languageScores.length > 0 
      ? languageScores.reduce((a, b) => a + b) / languageScores.length
      : 0.5;

    // Return raw averageScore (0-1 scale), will be multiplied by 60 in scoreModel
    const score = averageScore; // Return raw score for proper calculation

    return { score, averageScore };
  }

  // Get model by ID across curated categories only
  getModelById(modelId: string): CuratedModel | undefined {
    const allModels = [
      ...this.catalog.gpuModels.models,
      ...this.catalog.cpuModels.models
    ];

    return allModels.find(model => model.id === modelId);
  }

  // Get available languages across curated models only
  getSupportedLanguages(): string[] {
    const languages = new Set<string>();
    
    const allModels = [
      ...this.catalog.gpuModels.models,
      ...this.catalog.cpuModels.models
    ];

    for (const model of allModels) {
      Object.keys(model.languagePerformance).forEach(lang => languages.add(lang));
    }

    return Array.from(languages).sort();
  }
}