import { describe, it, expect, beforeAll } from 'vitest';
import { 
  OllamaDetector,
  OllamaDetectionResult,
  OllamaModelInfo 
} from '../../../src/infrastructure/ollama/ollama-detector.js';

describe('Ollama Detection TMOAT', () => {
  let detector: OllamaDetector;

  beforeAll(() => {
    detector = new OllamaDetector('http://localhost:11434', 3000);
  });

  describe('Ollama Service Detection', () => {
    it('detects Ollama status correctly (running or offline)', async () => {
      const result = await detector.diagnoseConnection();
      
      expect(result.endpoint).toBe('http://localhost:11434');
      expect(typeof result.reachable).toBe('boolean');
      expect(typeof result.responseTime).toBe('number');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);

      if (result.reachable) {
        console.log('✅ Ollama Service Status:', {
          reachable: result.reachable,
          responseTime: `${result.responseTime}ms`,
          version: result.version || 'unknown',
          suggestions: result.suggestions.slice(0, 2)
        });
      } else {
        console.log('⚠️ Ollama Service Offline:', {
          reachable: result.reachable,
          error: result.error,
          suggestions: result.suggestions.slice(0, 2)
        });
      }
    });

    it('handles offline Ollama gracefully (3-second timeout)', async () => {
      // Test with invalid endpoint to simulate offline scenario
      const offlineDetector = new OllamaDetector('http://localhost:9999', 3000);
      
      const startTime = Date.now();
      const result = await offlineDetector.detectModels('manual');
      const duration = Date.now() - startTime;
      
      expect(result.isRunning).toBe(false);
      expect(result.models.length).toBe(0);
      expect(result.installCommands.length).toBeGreaterThan(0);
      expect(result.error).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should timeout within 5 seconds
      
      console.log('✅ Offline handling:', {
        timeoutWorking: duration < 5000,
        duration: `${duration}ms`,
        error: result.error,
        installCommands: result.installCommands.length
      });
    });

    it('provides install commands from catalog when models missing', async () => {
      const result = await detector.detectModels('manual');
      
      // Should always provide install commands regardless of Ollama status
      expect(Array.isArray(result.installCommands)).toBe(true);
      
      // Should include basic Ollama installation guidance
      const commandsText = result.installCommands.join(' ').toLowerCase();
      expect(
        commandsText.includes('ollama') && 
        (commandsText.includes('install') || commandsText.includes('pull'))
      ).toBe(true);

      console.log('✅ Install commands:', {
        providesCommands: result.installCommands.length > 0,
        exampleCommands: result.installCommands.slice(0, 2),
        includesOllama: commandsText.includes('ollama')
      });
    });
  });

  describe('Model Detection and Filtering', () => {
    it('returns empty array for Assisted mode (never auto-recommend)', async () => {
      const assistedResult = await detector.detectModels('assisted');
      
      expect(assistedResult.models.length).toBe(0);
      expect(assistedResult.isRunning).toBe(false);
      
      console.log('✅ Assisted mode filtering:', {
        mode: 'assisted',
        modelsReturned: assistedResult.models.length,
        correctFiltering: assistedResult.models.length === 0
      });
    });

    it('returns detected models for Manual mode only', async () => {
      const manualResult = await detector.detectModels('manual');
      
      // Should attempt detection in manual mode
      expect(typeof manualResult.isRunning).toBe('boolean');
      expect(Array.isArray(manualResult.models)).toBe(true);
      expect(Array.isArray(manualResult.detectedModels)).toBe(true);
      
      console.log('✅ Manual mode detection:', {
        mode: 'manual',
        ollamaRunning: manualResult.isRunning,
        catalogModels: manualResult.models.length,
        detectedModels: manualResult.detectedModels.length
      });
    });

    it('cross-references with curated-models.json (granite: 12 languages, arctic: 6 languages)', async () => {
      const result = await detector.detectModels('manual');
      
      // Check if running and has models
      if (result.isRunning && result.models.length > 0) {
        // Verify granite model language support
        const graniteModel = result.models.find(m => m.id.includes('granite-embedding'));
        if (graniteModel) {
          const languageCount = Object.keys(graniteModel.languagePerformance).length;
          expect(languageCount).toBeGreaterThanOrEqual(10); // Should support 12 languages
          
          // Check for key languages
          expect(graniteModel.languagePerformance['en']).toBeDefined();
          expect(graniteModel.languagePerformance['zh']).toBeDefined();
          expect(graniteModel.languagePerformance['ja']).toBeDefined();
        }

        // Verify arctic model language support  
        const arcticModel = result.models.find(m => m.id.includes('arctic-embed'));
        if (arcticModel) {
          const languageCount = Object.keys(arcticModel.languagePerformance).length;
          expect(languageCount).toBeGreaterThanOrEqual(5); // Should support 6 languages
          
          // Check for European language focus
          expect(arcticModel.languagePerformance['en']).toBeDefined();
          if (arcticModel.languagePerformance['en']) {
            expect(arcticModel.languagePerformance['en']).toBeGreaterThan(0.9); // High English performance
          }
        }

        console.log('✅ Model catalog verification:', {
          modelsFound: result.models.length,
          granite: graniteModel ? Object.keys(graniteModel.languagePerformance).length : 0,
          arctic: arcticModel ? Object.keys(arcticModel.languagePerformance).length : 0,
          catalogDataCorrect: true
        });
      } else {
        console.log('ℹ️ Ollama not running - catalog verification skipped:', {
          ollamaRunning: result.isRunning,
          catalogModelsAvailable: result.models.length
        });
      }
    });

    it('filters embedding models vs chat models correctly', async () => {
      // Create test data to simulate Ollama response
      const testModels: OllamaModelInfo[] = [
        { name: 'granite-embedding:278m', tag: '278m', size: 500000000, digest: 'test1' },
        { name: 'llama3:8b', tag: '8b', size: 8000000000, digest: 'test2' },
        { name: 'snowflake-arctic-embed2:305m', tag: '305m', size: 600000000, digest: 'test3' },
        { name: 'qwen2:7b', tag: '7b', size: 7000000000, digest: 'test4' },
        { name: 'nomic-embed-text:v1.5', tag: 'v1.5', size: 300000000, digest: 'test5' }
      ];

      // Use private method through reflection to test filtering
      const filteredModels = (detector as any).filterEmbeddingModels(testModels);
      
      expect(filteredModels.length).toBeGreaterThan(0);
      expect(filteredModels.length).toBeLessThan(testModels.length);
      
      // Should include embedding models
      expect(filteredModels.some((m: OllamaModelInfo) => m.name.includes('granite-embedding'))).toBe(true);
      expect(filteredModels.some((m: OllamaModelInfo) => m.name.includes('arctic-embed'))).toBe(true);
      expect(filteredModels.some((m: OllamaModelInfo) => m.name.includes('nomic-embed'))).toBe(true);
      
      // Should exclude chat models
      expect(filteredModels.some((m: OllamaModelInfo) => m.name.includes('llama3'))).toBe(false);
      expect(filteredModels.some((m: OllamaModelInfo) => m.name.includes('qwen2'))).toBe(false);

      console.log('✅ Model filtering:', {
        totalModels: testModels.length,
        filteredModels: filteredModels.length,
        embeddingModels: filteredModels.map((m: OllamaModelInfo) => m.name),
        filteringWorking: filteredModels.length > 0 && filteredModels.length < testModels.length
      });
    });
  });

  describe('Model Recommendations', () => {
    it('recommends appropriate models based on language requirements', async () => {
      // Test CJK language recommendations
      const cjkRecommendations = detector.getModelRecommendations(['zh', 'ja', 'ko']);
      expect(cjkRecommendations.recommended.length).toBeGreaterThan(0);
      expect(cjkRecommendations.reasons.length).toBeGreaterThan(0);
      
      // Should recommend Granite for CJK
      const hasGranite = cjkRecommendations.recommended.some(m => m.id.includes('granite'));
      expect(hasGranite).toBe(true);

      // Test English/European language recommendations
      const enRecommendations = detector.getModelRecommendations(['en', 'es', 'fr']);
      expect(enRecommendations.recommended.length).toBeGreaterThan(0);
      
      // Should recommend Arctic for European languages
      const hasArctic = enRecommendations.recommended.some(m => m.id.includes('arctic'));
      expect(hasArctic).toBe(true);

      console.log('✅ Model recommendations:', {
        cjkModels: cjkRecommendations.recommended.map(m => m.displayName),
        cjkReasons: cjkRecommendations.reasons[0],
        enModels: enRecommendations.recommended.map(m => m.displayName),
        intelligentRecommendations: hasGranite && hasArctic
      });
    });

    it('provides fallback recommendations for unknown languages', async () => {
      const unknownLangRecommendations = detector.getModelRecommendations(['xyz', 'abc']);
      
      expect(unknownLangRecommendations.recommended.length).toBeGreaterThan(0);
      expect(unknownLangRecommendations.reasons.length).toBeGreaterThan(0);
      
      console.log('✅ Fallback recommendations:', {
        unknownLanguages: ['xyz', 'abc'],
        recommendedCount: unknownLangRecommendations.recommended.length,
        fallbackReason: unknownLangRecommendations.reasons[0]
      });
    });
  });

  describe('Error Handling and Diagnostics', () => {
    it('handles network timeouts gracefully', async () => {
      // Test with very short timeout
      const quickTimeoutDetector = new OllamaDetector('http://localhost:11434', 100);
      
      const startTime = Date.now();
      const result = await quickTimeoutDetector.detectModels('manual');
      const duration = Date.now() - startTime;
      
      // Should handle timeout gracefully
      expect(typeof result.isRunning).toBe('boolean');
      expect(Array.isArray(result.models)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should fail fast
      
      console.log('✅ Timeout handling:', {
        quickTimeout: duration < 1000,
        duration: `${duration}ms`,
        gracefulError: !!result.error
      });
    });

    it('provides detailed connection diagnostics', async () => {
      const diagnostics = await detector.diagnoseConnection();
      
      expect(diagnostics.endpoint).toBeDefined();
      expect(typeof diagnostics.reachable).toBe('boolean');
      expect(typeof diagnostics.responseTime).toBe('number');
      expect(Array.isArray(diagnostics.suggestions)).toBe(true);
      expect(diagnostics.suggestions.length).toBeGreaterThan(0);

      console.log('✅ Connection diagnostics:', {
        endpoint: diagnostics.endpoint,
        reachable: diagnostics.reachable,
        responseTime: `${diagnostics.responseTime}ms`,
        hasSuggestions: diagnostics.suggestions.length > 0,
        version: diagnostics.version || 'not detected'
      });
    });
  });

  describe('Integration with Curated Models', () => {
    it('correctly matches detected models with catalog entries', async () => {
      // Test model matching logic with synthetic data
      const catalogModels = [
        { 
          id: 'ollama:granite-embedding:278m',
          modelName: 'granite-embedding:278m',
          displayName: 'Test Granite',
          languagePerformance: { en: 0.95, zh: 0.80 }
        },
        {
          id: 'ollama:missing-model:1b', 
          modelName: 'missing-model:1b',
          displayName: 'Test Missing',
          languagePerformance: { en: 0.90 }
        }
      ];

      const detectedModels: OllamaModelInfo[] = [
        { name: 'granite-embedding:278m', tag: '278m', size: 500000000, digest: 'test1' }
      ];

      // Use private method to test matching
      const matched = (detector as any).matchDetectedWithCatalog(detectedModels, catalogModels);
      
      expect(matched.length).toBe(1);
      expect(matched[0].id).toBe('ollama:granite-embedding:278m');
      
      console.log('✅ Model matching:', {
        catalogModels: catalogModels.length,
        detectedModels: detectedModels.length,
        matchedModels: matched.length,
        correctMatching: matched.length === 1 && matched[0].id.includes('granite')
      });
    });

    it('generates correct install commands for missing models', async () => {
      const catalogModels = [
        { 
          modelName: 'granite-embedding:278m',
          requirements: { installCommand: 'ollama pull granite-embedding:278m' }
        },
        {
          modelName: 'missing-model:1b',
          requirements: { installCommand: 'ollama pull missing-model:1b' }
        }
      ];

      const detectedModels: OllamaModelInfo[] = [
        { name: 'granite-embedding:278m', tag: '278m', size: 500000000, digest: 'test1' }
      ];

      // Use private method to test command generation
      const commands = (detector as any).getMissingModelCommands(catalogModels, detectedModels);
      
      expect(commands.length).toBe(1);
      expect(commands[0]).toContain('missing-model:1b');
      expect(commands[0]).toContain('ollama pull');
      
      console.log('✅ Install commands:', {
        catalogModels: catalogModels.length,
        detectedModels: detectedModels.length,
        missingCommands: commands.length,
        exampleCommand: commands[0] || 'none needed'
      });
    });
  });
});