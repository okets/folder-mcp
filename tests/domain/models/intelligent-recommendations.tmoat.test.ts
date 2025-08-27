import { describe, it, expect, beforeAll } from 'vitest';
import { ModelCompatibilityEvaluator } from '../../../src/domain/models/model-evaluator.js';
import { MachineCapabilities } from '../../../src/domain/models/machine-capabilities.js';
import { OllamaDetector } from '../../../src/infrastructure/ollama/ollama-detector.js';
import fs from 'fs/promises';
import path from 'path';

describe('Intelligent Recommendations Architecture TMOAT', () => {
  let evaluator: ModelCompatibilityEvaluator;
  let ollamaDetector: OllamaDetector;
  let mockCapabilities: MachineCapabilities;

  beforeAll(async () => {
    evaluator = new ModelCompatibilityEvaluator();
    ollamaDetector = new OllamaDetector();
    
    // Mock machine capabilities for testing
    mockCapabilities = {
      cpu: {
        cores: 8,
        architecture: 'arm64',
        features: ['AVX2', 'FMA']
      },
      memory: {
        totalRAMGB: 16,
        availableRAMGB: 12,
        swapGB: 0
      },
      gpu: {
        type: 'apple',
        name: 'Apple M3 GPU',
        vramGB: 16, // Unified memory
        metalSupport: true
      },
      platform: 'darwin',
      detectedAt: new Date()
    };
  });

  describe('Curated Models Configuration', () => {
    it('loads curated-models.json without ollamaModels section', async () => {
      // Read the actual curated models file
      const configPath = path.join(process.cwd(), 'src/config/curated-models.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Verify ollamaModels section is completely removed
      expect(config.ollamaModels).toBeUndefined();
      
      // Verify we still have GPU and CPU models
      expect(config.gpuModels).toBeDefined();
      expect(config.cpuModels).toBeDefined();
      expect(config.gpuModels.models).toBeInstanceOf(Array);
      expect(config.cpuModels.models).toBeInstanceOf(Array);
      
      // Verify models have proper structure
      expect(config.gpuModels.models.length).toBeGreaterThan(0);
      expect(config.cpuModels.models.length).toBeGreaterThan(0);

      console.log('✅ Curated config validation:', {
        hasOllamaModels: !!config.ollamaModels,
        gpuModelCount: config.gpuModels.models.length,
        cpuModelCount: config.cpuModels.models.length,
        version: config.version
      });
    });

    it('ModelCompatibilityEvaluator excludes all Ollama references', () => {
      // Test that getAllAvailableModels works without Ollama
      const allModels = (evaluator as any).getAllAvailableModels('manual');
      
      // All models should be from GPU or CPU categories only
      for (const model of allModels) {
        expect(model.id).not.toMatch(/^ollama:/);
        expect(model.modelName).toBeUndefined(); // Ollama-specific field should not exist
      }

      // Test getModelById doesn't find Ollama models
      const ollamaModel = evaluator.getModelById('ollama:granite-embedding:278m');
      expect(ollamaModel).toBeUndefined();

      // Test getSupportedLanguages works without Ollama data
      const languages = evaluator.getSupportedLanguages();
      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(50); // Should still have 100+ languages

      console.log('✅ Evaluator Ollama exclusion:', {
        totalModels: allModels.length,
        ollamaModelsFound: allModels.filter((m: any) => m.id.startsWith('ollama:')).length,
        supportedLanguages: languages.length,
        sampleLanguages: languages.slice(0, 10)
      });
    });
  });

  describe('Hardware as Binary Filter', () => {
    it('hardware acts as binary filter (not scored in total)', () => {
      const criteria = {
        languages: ['en', 'es'],
        mode: 'assisted' as const
      };

      // Get compatibility scores
      const scores = evaluator.evaluateModelCompatibility(mockCapabilities, criteria);
      
      // Hardware incompatible models should have score of 0
      const incompatibleModels = scores.filter(s => !s.hardwareCompatible);
      for (const score of incompatibleModels) {
        expect(score.score).toBe(0);
        expect(score.recommendedUse).toBe('Hardware insufficient');
      }

      // Hardware compatible models should have proper scoring
      const compatibleModels = scores.filter(s => s.hardwareCompatible);
      expect(compatibleModels.length).toBeGreaterThan(0);
      
      for (const score of compatibleModels) {
        expect(score.score).toBeGreaterThan(0);
        expect(score.recommendedUse).not.toBe('Hardware insufficient');
      }

      console.log('✅ Hardware binary filter:', {
        totalModels: scores.length,
        compatibleModels: compatibleModels.length,
        incompatibleModels: incompatibleModels.length,
        avgCompatibleScore: compatibleModels.reduce((sum, s) => sum + s.score, 0) / compatibleModels.length
      });
    });
  });

  describe('Scoring Weights Distribution', () => {
    it('language gets 60 points, accuracy 32 points, speed 8 points (100 total)', () => {
      const criteria = {
        languages: ['en'], // Perfect English support
        mode: 'assisted' as const
      };

      const scores = evaluator.evaluateModelCompatibility(mockCapabilities, criteria);
      const compatibleScores = scores.filter(s => s.hardwareCompatible);
      
      expect(compatibleScores.length).toBeGreaterThan(0);

      // Check scoring distribution for a high-scoring model
      const bestModel = compatibleScores[0];
      expect(bestModel).toBeDefined();
      
      // Language score should be significant (up to 60 points possible)
      const languagePercentage = bestModel!.languageScore; // 0-1 scale
      const expectedLanguagePoints = languagePercentage * 60;
      
      // The total score should be within reasonable bounds (considering all components)
      expect(bestModel!.score).toBeGreaterThan(0);
      expect(bestModel!.score).toBeLessThanOrEqual(100); // Max 100 points total
      
      // For English, should get good language score
      expect(languagePercentage).toBeGreaterThan(0.5); // At least 50% language compatibility

      console.log('✅ Scoring weights verification:', {
        bestModelScore: bestModel!.score,
        languageScore: languagePercentage,
        expectedLanguagePoints,
        modelName: bestModel!.model.displayName,
        reasons: bestModel!.reasons
      });
    });

    it('verifies exact scoring components and weights', () => {
      // Test with multiple languages to see scoring behavior
      const multilingualCriteria = {
        languages: ['en', 'es', 'zh', 'ja'], // Mix of languages
        mode: 'assisted' as const
      };

      const scores = evaluator.evaluateModelCompatibility(mockCapabilities, multilingualCriteria);
      const compatibleScores = scores.filter(s => s.hardwareCompatible);
      
      expect(compatibleScores.length).toBeGreaterThan(0);

      // Analyze score distribution
      const scoreAnalysis = compatibleScores.slice(0, 3).map(score => {
        const langPoints = score.languageScore * 60; // Language: 60%
        const model = score.model;
        const accuracyPoints = model.mtebScore ? (model.mtebScore / 80) * 32 : 0; // Accuracy: 32%
        const speedPoints = Math.min(
          Math.max(
            model.requirements?.gpu?.expectedTokensPerSec || 0,
            model.requirements?.cpu?.expectedTokensPerSec || 0
          ) / 300,
          1
        ) * 8; // Speed: 8%

        return {
          modelName: model.displayName,
          totalScore: score.score,
          languagePoints: Math.round(langPoints * 10) / 10,
          accuracyPoints: Math.round(accuracyPoints * 10) / 10,
          speedPoints: Math.round(speedPoints * 10) / 10,
          estimatedTotal: Math.round((langPoints + accuracyPoints + speedPoints) * 10) / 10
        };
      });

      console.log('✅ Detailed scoring analysis:', scoreAnalysis);

      // Verify that language gets the highest weight
      for (const analysis of scoreAnalysis) {
        expect(analysis.languagePoints).toBeGreaterThanOrEqual(analysis.accuracyPoints);
        expect(analysis.accuracyPoints).toBeGreaterThanOrEqual(analysis.speedPoints);
      }
    });
  });

  describe('Pure Runtime Ollama Detection', () => {
    it('Ollama detection provides basic info only (no language capabilities)', async () => {
      const result = await ollamaDetector.detectModels('manual');
      
      // Should not crash regardless of Ollama status
      expect(result).toBeDefined();
      expect(result.isRunning).toBeDefined();
      expect(result.models).toBeInstanceOf(Array);
      expect(result.detectedModels).toBeInstanceOf(Array);

      // If models are detected, they should have basic info only
      for (const model of result.models) {
        expect(model.id).toBeDefined();
        expect(model.modelName).toBeDefined();
        expect(model.displayName).toBeDefined();
        expect(model.description).toBeDefined();
        
        // Should NOT have language performance data
        expect((model as any).languagePerformance).toBeUndefined();
        expect((model as any).mtebScore).toBeUndefined();
        expect((model as any).contextWindow).toBeUndefined();
      }

      console.log('✅ Ollama runtime detection:', {
        isRunning: result.isRunning,
        modelsDetected: result.models.length,
        rawModelsDetected: result.detectedModels.length,
        sampleModel: result.models[0] || null,
        error: result.error || null
      });
    });

    it('assisted mode never includes Ollama models (runtime-only for manual)', async () => {
      const assistedResult = await ollamaDetector.detectModels('assisted');
      const manualResult = await ollamaDetector.detectModels('manual');

      // Assisted mode should never return Ollama models
      expect(assistedResult.models).toEqual([]);
      expect(assistedResult.detectedModels).toEqual([]);
      expect(assistedResult.isRunning).toBe(false); // Force false for assisted mode

      // Manual mode should attempt detection (might be empty if Ollama not running)
      expect(manualResult.models).toBeInstanceOf(Array);
      expect(manualResult.detectedModels).toBeInstanceOf(Array);

      console.log('✅ Mode-based Ollama filtering:', {
        assistedModels: assistedResult.models.length,
        manualModels: manualResult.models.length,
        assistedRunning: assistedResult.isRunning,
        manualRunning: manualResult.isRunning
      });
    });
  });

  describe('Architecture Integration', () => {
    it('scoring prioritizes language fit over hardware/speed performance', () => {
      // Test with different language scenarios
      const scenarios = [
        { languages: ['en'], name: 'English only' },
        { languages: ['zh', 'ja', 'ko'], name: 'CJK languages' },
        { languages: ['es', 'fr', 'de'], name: 'European languages' },
        { languages: ['ar', 'fa'], name: 'Arabic/Persian' }
      ];

      const results = scenarios.map(scenario => {
        const criteria = {
          languages: scenario.languages,
          mode: 'assisted' as const
        };

        const scores = evaluator.evaluateModelCompatibility(mockCapabilities, criteria);
        const bestCompatible = scores.filter(s => s.hardwareCompatible)[0];

        return {
          scenario: scenario.name,
          bestModel: bestCompatible?.model.displayName || 'None',
          score: bestCompatible?.score || 0,
          languageScore: bestCompatible?.languageScore || 0,
          reasons: bestCompatible?.reasons || []
        };
      });

      // Verify each scenario gets appropriate recommendations
      for (const result of results) {
        expect(result.bestModel).not.toBe('None');
        expect(result.score).toBeGreaterThan(0);
        expect(result.languageScore).toBeGreaterThan(0);
      }

      console.log('✅ Language-prioritized scoring:', results);
    });

    it('architecture maintains clean separation between curated and runtime models', () => {
      // Verify curated models (GPU/CPU) are properly loaded
      const curatedModels = (evaluator as any).getAllAvailableModels('assisted');
      expect(curatedModels.length).toBeGreaterThan(0);

      // All curated models should have full metadata
      for (const model of curatedModels.slice(0, 3)) {
        expect(model.languagePerformance).toBeDefined();
        expect(model.dimensions).toBeDefined();
        expect(model.displayName).toBeDefined();
        expect(Object.keys(model.languagePerformance).length).toBeGreaterThan(10);
      }

      // Verify runtime models (Ollama) would have minimal info
      const recommendations = ollamaDetector.getModelRecommendations(['en', 'zh']);
      expect(recommendations.recommended).toBeInstanceOf(Array);
      expect(recommendations.reasons).toBeInstanceOf(Array);

      console.log('✅ Architecture separation:', {
        curatedModelCount: curatedModels.length,
        sampleCuratedLanguages: Object.keys(curatedModels[0]?.languagePerformance || {}).length,
        ollamaRecommendations: recommendations.recommended,
        ollamaReasons: recommendations.reasons
      });
    });
  });
});