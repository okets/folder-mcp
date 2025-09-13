# Curated Models Optimization Epic

**Epic ID**: CMO-2025-01
**Duration**: 6 sprints (6 weeks)
**Status**: In Progress
**Started**: January 2025

## Executive Summary

Transform our 5 curated embedding models from basic usage to **ELITE semantic extraction quality**. Each model will be optimized using its specific best practices while conforming to a unified interface that ensures consistent, high-quality output across all models.

## Problem Statement

Our current semantic extraction produces generic, low-quality results:
- **Topics**: Generic categories like "general" and "technology" instead of specific business concepts
- **Key Phrases**: Random words instead of meaningful multi-word phrases
- **Readability**: 71% of content scored as "very difficult" (severely miscalibrated)
- **Domain Differentiation**: Cannot distinguish between Finance, Engineering, HR, etc.

**Root Cause**: We're using powerful models incorrectly, treating them like simple word2vec instead of leveraging their specific capabilities.

## Epic Goals

### Primary Objectives
1. **Elite Quality**: Achieve ≥8.0/10 quality score for each model on standardized test corpus
2. **Unified Interface**: Consistent API that allows model-specific optimizations
3. **Production Ready**: Robust implementations with proper error handling and performance optimization
4. **Clear Guidance**: Documentation on when to use each model for optimal results

### Success Criteria
- **Topics**: Domain-specific, meaningful concepts (e.g., "remote work policy", not "general")
- **Key Phrases**: Multi-word business concepts (e.g., "three days per week", not "days")
- **Readability**: Realistic complexity scores (60-80 for business documents, not 8-30)
- **Domain Classification**: Perfect distinction between folder types/domains
- **Interface Compliance**: All models implement ISemanticProvider interface
- **Performance**: < 100ms per document average processing time

## Our 5 Curated Models

| Model | Type | Strengths | Sprint |
|-------|------|-----------|--------|
| **BGE-M3** | PyTorch | Multi-functionality (dense+sparse+ColBERT), 8192 tokens, 100+ languages | Sprint 2 |
| **all-MiniLM-L12-v2** | PyTorch | Balanced quality/performance, good for general use | Sprint 3 |
| **E5-Large** | PyTorch | High-quality embeddings, excellent for complex content | Sprint 4 |
| **E5-Large** | ONNX | CPU-optimized version of E5-Large | Sprint 5 |
| **E5-Small** | ONNX | Lightweight, efficient for resource-constrained environments | Sprint 6 |

## Epic Structure

### Sprint 1: Unified Semantic Interface Foundation
**Goal**: Create the foundation that enables model-specific optimization
**Duration**: 1 week
**Deliverables**: Complete interface implementation with factory pattern and quality testing framework
**Sprint Doc**: [Sprint-1-Unified-Interface.md](sprints/Sprint-1-Unified-Interface.md)

### Sprint 2: BGE-M3 Elite Implementation
**Goal**: Transform BGE-M3 into elite multi-functionality extraction
**Duration**: 1 week
**Research Focus**: BGE-M3 best practices, hybrid retrieval, multi-vector usage
**Deliverables**: Elite BGE-M3 provider achieving ≥8.0 quality score
**Sprint Doc**: [Sprint-2-BGE-M3-Implementation.md](sprints/Sprint-2-BGE-M3-Implementation.md)

### Sprint 3: MiniLM-L12 PyTorch Optimization
**Goal**: Optimize all-MiniLM-L12-v2 for balanced quality and performance
**Duration**: 1 week
**Research Phase**: Context7 + web research + hands-on experimentation
**Deliverables**: Elite MiniLM-L12 provider implementation
**Sprint Doc**: [Sprint-3-MiniLM-L12-PyTorch.md](sprints/Sprint-3-MiniLM-L12-PyTorch.md)

### Sprint 4: E5-Large PyTorch Optimization
**Goal**: Leverage E5-Large's strengths for high-quality extraction
**Duration**: 1 week
**Research Phase**: Context7 + web research + hands-on experimentation
**Deliverables**: Elite E5-Large provider implementation
**Sprint Doc**: [Sprint-4-E5-Large-PyTorch.md](sprints/Sprint-4-E5-Large-PyTorch.md)

### Sprint 5: E5-Large ONNX Optimization
**Goal**: CPU-optimized E5-Large maintaining high quality
**Duration**: 1 week
**Research Phase**: Context7 + web research + hands-on experimentation
**Deliverables**: Elite E5-Large ONNX provider implementation
**Sprint Doc**: [Sprint-5-E5-Large-ONNX.md](sprints/Sprint-5-E5-Large-ONNX.md)

### Sprint 6: E5-Small ONNX Optimization
**Goal**: Maximum efficiency for resource-constrained environments
**Duration**: 1 week
**Research Phase**: Context7 + web research + hands-on experimentation
**Deliverables**: Elite E5-Small ONNX provider implementation
**Sprint Doc**: [Sprint-6-E5-Small-ONNX.md](sprints/Sprint-6-E5-Small-ONNX.md)

## Quality Assurance Framework

### Standardized Test Corpus
- **Remote Work Policy** (HR domain)
- **API Documentation** (Technical domain)
- **Quarterly Budget** (Finance domain)
- **Sales Playbook** (Business domain)
- **Legal Agreement** (Legal domain)
- **Medical Research** (Healthcare domain)
- **Engineering Architecture** (Technical domain)
- **Marketing Strategy** (Business domain)

### Quality Scoring (0-10 scale)
1. **Topic Specificity**: Are topics domain-specific and meaningful?
2. **Key Phrase Relevance**: Are phrases actual business concepts?
3. **Domain Differentiation**: Can you identify the document's domain clearly?
4. **Search Utility**: Would this improve semantic search results?
5. **Readability Accuracy**: Is the complexity score realistic?

**Pass Criteria**: Average score ≥ 8.0 across all dimensions

### LLM-as-Judge Evaluation
Each model's output is evaluated by LLM judge (Claude) using structured prompts and consistent rubrics to ensure objective quality assessment.

## Architecture Overview

### Interface Design
```typescript
interface ISemanticProvider {
  // Identification
  readonly name: string;
  readonly type: 'pytorch' | 'onnx' | 'ollama';
  readonly modelId: string;
  readonly capabilities: ProviderCapabilities;

  // Lifecycle
  initialize(config?: ProviderConfig): Promise<void>;
  dispose(): Promise<void>;

  // Core Methods (model-specific implementations)
  getTopics(text: string, options?: TopicOptions): Promise<Topic[]>;
  getKeyPhrases(text: string, options?: PhraseOptions): Promise<KeyPhrase[]>;
  getReadability(text: string): Promise<ReadabilityScore>;
  getDomain(text: string): Promise<DomainClassification>;

  // Batch & Utility
  getSemanticData(text: string, options?: SemanticOptions): Promise<SemanticData>;
  embed(text: string): Promise<EmbeddingVector>;
}
```

### Provider Selection Strategy
1. **Auto-Detection**: Automatically discover available models
2. **Smart Selection**: Choose optimal model based on criteria:
   - Content domain (technical vs business)
   - Performance requirements (speed vs quality)
   - Resource constraints (GPU vs CPU)
   - Language requirements (multilingual vs English)
3. **Graceful Fallbacks**: Always have a working provider available

## Implementation Timeline

```
Week 1: Sprint 1 - Foundation
├── Days 1-2: Interface design & types
├── Days 3-4: Provider factory & auto-detection
└── Day 5: Quality testing framework

Week 2: Sprint 2 - BGE-M3 Elite
├── Day 1: Research integration & planning
├── Days 2-3: Multi-functionality implementation
├── Day 4: Quality optimization & testing
└── Day 5: Documentation & validation

Weeks 3-6: Sprints 3-6 - Remaining Models
└── Each: Research → Implement → Test → Optimize → Document
```

## Risk Management

### Technical Risks
1. **Model Availability**: Models may not load or perform as expected
   - *Mitigation*: Graceful degradation, fallback providers
2. **Performance Issues**: Optimization may degrade performance
   - *Mitigation*: Benchmark before/after, performance gates
3. **Quality Regression**: Changes may break existing functionality
   - *Mitigation*: Comprehensive testing, gradual rollout

### Project Risks
1. **Scope Creep**: Adding features beyond semantic extraction
   - *Mitigation*: Strict scope definition, sprint boundaries
2. **Research Time Overrun**: Model research taking too long
   - *Mitigation*: Time-boxed research, minimum viable implementations
3. **Integration Complexity**: Interface changes breaking existing code
   - *Mitigation*: Backward compatibility, adapter patterns

## Success Validation

### Sprint-Level Gates
- [ ] Interface compliance verified
- [ ] Quality score ≥ 8.0 achieved
- [ ] Performance benchmarks met
- [ ] Documentation completed
- [ ] Integration tests passing

### Epic Completion Criteria
- [ ] All 5 models achieving elite quality (≥8.0 average)
- [ ] Unified interface fully implemented and tested
- [ ] Production deployment successful
- [ ] User documentation complete
- [ ] Model selection guidance provided

## Related Documents

### Sprint Documentation
- [Sprint 1: Unified Interface](sprints/Sprint-1-Unified-Interface.md) - Foundation implementation
- [Sprint 2: BGE-M3 Implementation](sprints/Sprint-2-BGE-M3-Implementation.md) - Elite BGE-M3 optimization

### Research Documentation
- [Model Capabilities Comparison](research/model-capabilities-comparison.md) - Cross-model analysis
- [Quality Testing Framework](research/quality-testing-framework.md) - Testing methodology
- [Integration Guidelines](research/integration-guidelines.md) - How to add new models

### Implementation Documentation
- [Interface Specification](implementation/interface-specification.md) - Complete API documentation
- [Provider Implementation Guide](implementation/provider-implementation-guide.md) - Developer guide
- [Quality Gates](implementation/quality-gates.md) - Quality requirements and validation

## Project Team

**Epic Owner**: Development Team
**Quality Assurance**: LLM-as-Judge + Manual Validation
**Research Lead**: Context7 + Web Research
**Technical Lead**: Interface Design + Architecture

---

**Last Updated**: January 2025
**Next Review**: After Sprint 2 completion
**Status**: 🚧 In Progress - Sprint 1 Phase