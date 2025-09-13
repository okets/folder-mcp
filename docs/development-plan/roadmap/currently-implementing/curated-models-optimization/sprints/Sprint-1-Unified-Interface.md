# Sprint 1: Unified Semantic Interface Foundation

**Sprint ID**: CMO-Sprint-1
**Epic**: [Curated Models Optimization](../EPIC-OVERVIEW.md)
**Duration**: 1 week
**Status**: Ready to Start

## Sprint Goal

Create a unified interface that enables each of our 5 curated models to deliver elite semantic extraction using their own optimal techniques while providing consistent, standardized output to folder-mcp.

## Problem Statement

Currently, each model would require custom integration code, leading to:
- Inconsistent output formats
- Duplication of extraction logic
- No standardized quality validation
- Difficulty comparing model performance
- Complex selection logic for optimal model choice

## Sprint Objectives

1. **Define Universal Interface**: Create ISemanticProvider interface that all models implement
2. **Build Provider Factory**: Auto-detect available models and provide intelligent selection
3. **Implement Quality Framework**: LLM-as-judge evaluation with standardized test corpus
4. **Create Type System**: Comprehensive TypeScript types for semantic data
5. **Establish Testing Infrastructure**: Validation framework for quality gates

## Deliverables

### 1. Core Interface System
```
src/domain/semantic/
├── interfaces/
│   ├── ISemanticProvider.ts          # Core interface contract
│   ├── types.ts                      # All semantic data types
│   └── options.ts                    # Configuration and option types
```

### 2. Provider Infrastructure
```
src/domain/semantic/
├── providers/
│   ├── base/
│   │   ├── BaseSemanticProvider.ts   # Common functionality
│   │   └── ProviderCapabilities.ts   # Capability declarations
│   ├── pytorch/                      # PyTorch provider implementations
│   ├── onnx/                         # ONNX provider implementations
│   └── ollama/                       # Ollama provider implementations
```

### 3. Factory and Selection Logic
```
src/domain/semantic/
├── factory/
│   ├── SemanticProviderFactory.ts    # Auto-detection and creation
│   ├── ModelRegistry.ts              # Available models registry
│   └── ProviderSelector.ts           # Intelligent selection logic
```

### 4. Quality Assurance Framework
```
src/domain/semantic/
├── testing/
│   ├── QualityTestFramework.ts       # LLM-as-judge evaluation
│   ├── TestCorpus.ts                 # Standardized test documents
│   └── BenchmarkSuite.ts             # Performance testing
```

### 5. Supporting Utilities
```
src/domain/semantic/
└── utils/
    ├── TextPreprocessing.ts           # Common text processing utilities
    ├── EmbeddingUtils.ts              # Embedding operations and math
    └── QualityMetrics.ts              # Quality scoring algorithms
```

## Technical Implementation Details

### ISemanticProvider Interface Specification

```typescript
interface ISemanticProvider {
  // Provider Identification
  readonly name: string;                    // e.g., "BGE-M3"
  readonly type: ProviderType;              // 'pytorch' | 'onnx' | 'ollama' | 'external'
  readonly modelId: string;                 // e.g., "BAAI/bge-m3"
  readonly capabilities: ProviderCapabilities;

  // Lifecycle Management
  initialize(config?: ProviderConfig): Promise<void>;
  dispose(): Promise<void>;
  isReady(): boolean;

  // Core Embedding Methods
  embed(text: string): Promise<EmbeddingVector>;
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;

  // Semantic Extraction Methods (model-specific implementations)
  getTopics(text: string, options?: TopicOptions): Promise<Topic[]>;
  getKeyPhrases(text: string, options?: PhraseOptions): Promise<KeyPhrase[]>;
  getReadability(text: string): Promise<ReadabilityScore>;
  getDomain(text: string): Promise<DomainClassification>;
  getSummary?(text: string, maxLength?: number): Promise<string>;

  // Batch Operations
  getSemanticData(text: string, options?: SemanticOptions): Promise<SemanticData>;
  getSemanticDataBatch(texts: string[], options?: SemanticOptions): Promise<SemanticData[]>;

  // Quality and Performance
  validateOutput(data: SemanticData): QualityValidation;
  getOptimalBatchSize(): number;
  getOptimalChunkSize(): number;
}
```

### Standardized Output Types

```typescript
interface SemanticData {
  // Core Extraction Results
  topics: Topic[];                    // Ranked by relevance
  keyPhrases: KeyPhrase[];            // Ranked by importance
  readability: ReadabilityScore;      // Complexity metrics
  domain: DomainClassification;       // Domain identification

  // Optional Enhanced Data
  summary?: string;                   // If requested
  entities?: NamedEntity[];           // People, orgs, locations
  concepts?: Concept[];               // High-level concepts

  // Quality and Metadata
  quality: QualityMetrics;            // Confidence scores
  modelMetadata: ModelMetadata;       // Processing information
  extractionMetadata: ExtractionMetadata; // Timestamps, options
}

interface Topic {
  label: string;                      // "remote work policy"
  score: number;                      // 0.0 - 1.0 confidence
  type: 'primary' | 'secondary' | 'related';
  category?: string;                  // "HR", "Policy"
  frequency?: number;                 // Occurrence count
}

interface KeyPhrase {
  phrase: string;                     // "three days per week"
  score: number;                      // 0.0 - 1.0 importance
  frequency: number;                  // Occurrence count
  type: PhraseType;                   // 'policy' | 'metric' | 'requirement'
  context?: string;                   // Surrounding text
  positions?: number[];               // Character positions
}

interface ReadabilityScore {
  score: number;                      // 0-100 Flesch-Kincaid
  level: ComplexityLevel;             // 'basic' | 'intermediate' | 'advanced' | 'expert'
  metrics: {
    avgSentenceLength: number;
    avgWordLength: number;
    complexWordRatio: number;
    technicalDensity: number;         // Technical terms ratio
  };
}

interface DomainClassification {
  primary: string;                    // "HR"
  confidence: number;                 // 0.0 - 1.0
  secondary?: string[];               // ["policy", "compliance"]
  reasoning?: string;                 // Why this classification
}
```

### Provider Factory Implementation

```typescript
class SemanticProviderFactory {
  private providers: Map<string, ISemanticProvider> = new Map();
  private registry: ModelRegistry;
  private selector: ProviderSelector;

  constructor(logger: ILoggingService) {
    this.registry = new ModelRegistry();
    this.selector = new ProviderSelector(logger);
  }

  // Auto-discovery and Registration
  async autoDetectProviders(): Promise<void> {
    // 1. Detect GPU availability and PyTorch models
    if (await this.isGPUAvailable()) {
      await this.registerPyTorchModels();
    }

    // 2. Detect and register ONNX models
    await this.registerONNXModels();

    // 3. Check for Ollama connectivity
    if (await this.isOllamaAvailable()) {
      await this.registerOllamaModels();
    }

    this.logRegisteredProviders();
  }

  // Intelligent Provider Selection
  getBestProvider(criteria?: ProviderSelectionCriteria): ISemanticProvider {
    return this.selector.selectOptimalProvider(
      Array.from(this.providers.values()),
      criteria
    );
  }

  // Provider Management
  listAvailableProviders(): ProviderInfo[] {
    return Array.from(this.providers.values()).map(p => ({
      name: p.name,
      type: p.type,
      modelId: p.modelId,
      capabilities: p.capabilities,
      ready: p.isReady()
    }));
  }
}

interface ProviderSelectionCriteria {
  preferGPU?: boolean;                // Prefer GPU models for quality
  maxLatency?: number;                // Maximum acceptable latency (ms)
  minDimensions?: number;             // Minimum embedding dimensions
  requiredLanguages?: string[];       // Must support these languages
  domainSpecialty?: string;           // Prefer models specialized for domain
  contentLength?: number;             // Expected content length
}
```

### Quality Testing Framework

```typescript
class QualityTestFramework {
  private testCorpus: TestDocument[];
  private llmJudge: LLMJudgeEvaluator;

  constructor(logger: ILoggingService) {
    this.testCorpus = this.loadTestCorpus();
    this.llmJudge = new LLMJudgeEvaluator();
  }

  // Test Provider Quality
  async evaluateProvider(
    provider: ISemanticProvider,
    options?: TestOptions
  ): Promise<QualityReport> {
    const results: TestResult[] = [];

    for (const document of this.testCorpus) {
      const semanticData = await provider.getSemanticData(document.content);
      const score = await this.llmJudge.evaluateExtraction(
        document,
        semanticData
      );

      results.push({
        documentId: document.id,
        domain: document.expectedDomain,
        scores: score,
        semanticData
      });
    }

    return this.generateQualityReport(provider, results);
  }

  // Comparative Testing
  async compareProviders(providers: ISemanticProvider[]): Promise<ComparisonReport> {
    const reports = await Promise.all(
      providers.map(p => this.evaluateProvider(p))
    );

    return this.generateComparisonReport(reports);
  }
}

interface QualityReport {
  provider: ProviderInfo;
  overallScore: number;               // 0-10 average
  dimensionScores: {
    topicSpecificity: number;         // 0-10
    keyPhraseRelevance: number;       // 0-10
    domainDifferentiation: number;    // 0-10
    searchUtility: number;            // 0-10
    readabilityAccuracy: number;      // 0-10
  };
  passedQualityGate: boolean;         // >= 8.0 average
  recommendations: string[];
  testResults: TestResult[];
}
```

## Test Corpus Specification

### Standardized Test Documents

1. **Remote_Work_Policy.md** (HR Domain)
   - Expected Topics: ["remote work policy", "HR compliance", "employee flexibility"]
   - Expected Phrases: ["three days per week", "core business hours", "secure location"]
   - Expected Readability: 72 (Clear business writing)

2. **API_Documentation.md** (Technical Domain)
   - Expected Topics: ["REST API", "authentication", "endpoint documentation"]
   - Expected Phrases: ["HTTP methods", "API endpoints", "JSON responses"]
   - Expected Readability: 45 (Technical documentation)

3. **Quarterly_Budget.xlsx** (Finance Domain)
   - Expected Topics: ["financial planning", "budget allocation", "quarterly targets"]
   - Expected Phrases: ["budget variance", "quarterly projections", "cost centers"]
   - Expected Readability: 68 (Business analysis)

4. **Sales_Playbook.md** (Business Domain)
   - Expected Topics: ["sales process", "lead qualification", "customer acquisition"]
   - Expected Phrases: ["sales pipeline", "discovery calls", "closing techniques"]
   - Expected Readability: 75 (Clear business communication)

5. **Legal_Agreement.pdf** (Legal Domain)
   - Expected Topics: ["contract terms", "legal obligations", "compliance requirements"]
   - Expected Phrases: ["terms and conditions", "liability limitations", "governing law"]
   - Expected Readability: 35 (Complex legal language)

## Implementation Timeline

### Day 1-2: Core Interface Design
- [ ] Define ISemanticProvider interface with all methods
- [ ] Create comprehensive TypeScript type definitions
- [ ] Implement base provider class with common functionality
- [ ] Design provider capability system

### Day 3-4: Provider Factory & Auto-Detection
- [ ] Implement SemanticProviderFactory with auto-discovery
- [ ] Create model registry for tracking available providers
- [ ] Build intelligent provider selection logic
- [ ] Add provider lifecycle management (initialize, dispose)

### Day 5: Quality Framework & Testing
- [ ] Create LLM-as-judge evaluation system
- [ ] Implement standardized test corpus
- [ ] Build quality reporting and comparison tools
- [ ] Add performance benchmarking suite

## Acceptance Criteria

### Interface Compliance
- [ ] ISemanticProvider interface is complete and well-documented
- [ ] All type definitions are comprehensive and type-safe
- [ ] Base provider class provides common functionality
- [ ] Interface supports both sync and async operations

### Provider Factory
- [ ] Auto-detects all available model types (PyTorch, ONNX, Ollama)
- [ ] Intelligently selects optimal provider based on criteria
- [ ] Provides graceful fallbacks when preferred provider unavailable
- [ ] Handles provider initialization and cleanup properly

### Quality Framework
- [ ] LLM-as-judge evaluation produces consistent scores
- [ ] Test corpus covers diverse domains and complexity levels
- [ ] Quality reports provide actionable insights
- [ ] Comparison reports enable model selection decisions

### Performance
- [ ] Factory operations complete in < 5 seconds
- [ ] Provider selection logic executes in < 100ms
- [ ] Quality evaluation scales to test corpus size
- [ ] Memory usage remains stable during testing

## Quality Gates

### Interface Design Gate
- All interfaces compile without TypeScript errors
- Documentation coverage > 95%
- Interface supports all required semantic operations
- Type safety enforced throughout

### Functionality Gate
- Provider factory successfully detects available models
- Provider selection returns optimal provider for given criteria
- Quality framework produces consistent evaluation scores
- All unit tests pass with > 90% coverage

### Performance Gate
- Auto-detection completes within acceptable timeframes
- Provider selection scales to large numbers of providers
- Quality evaluation handles test corpus efficiently
- Memory leaks detected and resolved

## Risks and Mitigations

### Technical Risks
1. **Interface Too Complex**: Interface becomes unwieldy
   - *Mitigation*: Iterative design, focus on essential methods only
   - *Fallback*: Simplify interface, move complexity to implementation

2. **Provider Auto-Detection Fails**: Cannot reliably detect available models
   - *Mitigation*: Robust error handling, fallback detection methods
   - *Fallback*: Manual provider registration as backup

3. **Quality Framework Inconsistent**: LLM-as-judge produces varying results
   - *Mitigation*: Structured prompts, multiple evaluation rounds
   - *Fallback*: Traditional metrics as quality baseline

### Integration Risks
1. **Breaking Changes**: Interface changes break existing code
   - *Mitigation*: Backward compatibility layers, gradual migration
   - *Fallback*: Adapter patterns for existing integrations

2. **Performance Degradation**: New abstraction layer slows operations
   - *Mitigation*: Performance monitoring, optimization focus
   - *Fallback*: Direct provider access for performance-critical paths

## Success Metrics

- **Interface Adoption**: All 5 models can implement the interface
- **Quality Consistency**: Test results show consistent scoring methodology
- **Performance Impact**: < 10ms overhead from abstraction layer
- **Developer Experience**: Interface is intuitive and well-documented

## Dependencies

- Existing embedding infrastructure
- Test corpus documents
- LLM-as-judge evaluation system
- TypeScript type system
- Logging infrastructure

## Next Sprint Preparation

This sprint creates the foundation for Sprint 2 (BGE-M3 Elite Implementation). Success criteria:
- ISemanticProvider interface ready for BGE-M3 implementation
- Quality framework ready for BGE-M3 evaluation
- Provider factory ready for BGE-M3 registration
- Test corpus ready for BGE-M3 validation

---

**Sprint Owner**: Development Team
**Quality Reviewer**: LLM Judge + Manual Validation
**Technical Reviewer**: Architecture Team

**Related Documents**:
- [Epic Overview](../EPIC-OVERVIEW.md)
- [Sprint 2: BGE-M3 Implementation](Sprint-2-BGE-M3-Implementation.md)
- [Interface Specification](../implementation/interface-specification.md)