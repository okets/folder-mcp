# Epic: Semantic Data Extraction Quality Overhaul

**Epic ID**: SDE-EPIC-2025-001
**Priority**: Critical (Make-or-Break)
**Status**: Planning
**Estimated Duration**: 5 sprints (~3-4 weeks)

## Executive Summary

Our semantic extraction system produces unusable results: 71% of content incorrectly scored as "very difficult" readability, generic topics like ["general"], and single-word key phrases like ["document"]. This epic completely overhauls semantic extraction using research-validated techniques to achieve production-quality results across all 5 curated embedding models.

**Critical Success Factors:**
- Transform broken single-word extraction → meaningful multiword phrases
- Replace generic "general" topics → domain-specific semantic categories
- Fix unrealistic readability scores → accurate technical document assessment
- Maintain model-agnostic architecture supporting all 5 curated models
- Achieve measurable quality improvements through systematic TMOAT validation

## Current Broken State (Baseline)

### Broken Implementation Location
`src/domain/content/processing.ts` - ContentProcessingService contains fundamentally broken logic:
- **Key Phrases** (Lines 121-144): Basic word frequency counting → single words only
- **Topics** (Lines 181-204): Hardcoded dictionary matching → generic categories
- **Readability** (Lines 209-229): Broken syllable counting → unrealistic scores

### Measured Quality Issues
**From 5 Test Folders (BGE-M3, E5-Large, MiniLM, E5-Large ONNX, E5-Small ONNX):**
- **Topics**: 71% generic ["general", "education"] instead of domain-specific
- **Key Phrases**: 89% single words ["document", "search"] instead of ["machine learning models"]
- **Readability**: Scores 3-11 for technical content (should be 45-55)
- **Impact**: Search quality degraded, semantic meaning lost, user trust broken

## Research-Validated Solutions

**Source**: Modern Semantic Extraction Techniques Research Report (2025)

### Technique Upgrades (Quality Gains)
1. **KeyBERT for Key Phrases**: +40% multiword phrase quality vs current N-gram approach
2. **BERTopic for Topics**: +25% semantic coherence vs hardcoded dictionaries
3. **Hybrid Readability**: +60% accuracy on technical documents vs broken formulas
4. **Paragraph Chunking**: +15% context preservation vs fixed-token chunks
5. **Model Optimizations**: +8-20% improvements through model-specific enhancements

### Architecture Decision
**Clean Architecture Approach**: Create new `SemanticExtractionService` rather than patching broken `ContentProcessingService`. This maintains separation of concerns and allows A/B testing during transition.

## Epic Scope & Constraints

### Models in Scope (All 5 Curated Models)
- **PyTorch GPU**: BGE-M3 (1024D, 8192 tokens), E5-Large (1024D), MiniLM-L12 (384D)
- **ONNX CPU**: E5-Large ONNX (1024D), E5-Small ONNX (384D)
- **Requirement**: All techniques must work with existing embeddings (no retraining)

### Technical Constraints
- **Local-only**: No online APIs, open-source libraries only
- **Performance**: Must work on consumer hardware (GPU optional, CPU fallback)
- **Integration**: Python ML processing + TypeScript orchestration via JSON-RPC
- **Architecture**: Must fit existing chunk-based embedding storage
- **Testing**: Self-validating using indexed folder-mcp project content

### Success Criteria (Measurable)
**Quantitative Targets:**
- **Key Phrases**: >80% multiword phrases (vs current 11%)
- **Topics**: >90% domain-specific categories (vs current 29%)
- **Readability**: Scores 40-60 for technical docs (vs current 3-11)
- **Processing Speed**: <2x current time (maintain real-time capability)
- **Model Compatibility**: 100% success across all 5 models

**Validation Method:**
- **Test Corpus**: folder-mcp project files (known content, predictable results)
- **A/B Testing**: Compare new vs old extraction on identical embeddings
- **Human Verification**: Sprint-end reviews with measurable quality assessment

## Sprint Breakdown

### Sprint 1: Foundation & KeyBERT Key Phrases (Week 1)
**Goal**: Replace broken word frequency with KeyBERT extraction

**Scope:**
- Create `SemanticExtractionService` with clean architecture
- Implement KeyBERT-based key phrase extraction
- Integrate with existing Python embedding pipeline
- Validate across all 5 models

**Key Deliverables:**
- New service architecture with proper dependency injection
- KeyBERT implementation using existing sentence-transformer models
- MMR diversity to prevent phrase redundancy
- N-gram range (1-3) for multiword phrase capture

**Success Criteria:**
- **Measurable**: >80% multiword phrases in test results
- **Quality**: Extract ["machine learning models", "semantic search", "transformer architecture"] instead of ["document", "search"]
- **Performance**: <200ms per document processing time
- **Compatibility**: Works with all 5 model embeddings

**TMOAT Validation Approach:**
1. **Database Testing**: Query semantic_data table, count single vs multiword phrases
2. **Content Verification**: Test on known folder-mcp files (README.md, package.json descriptions)
3. **Model Compatibility**: Validate KeyBERT works with BGE-M3, E5, MiniLM embeddings
4. **Performance Benchmarking**: Time extraction vs current broken implementation
5. **End-to-End**: Trigger re-indexing, verify MCP search returns better phrases

**Human Safety Stop Questions:**
- Are we extracting meaningful multiword technical phrases?
- Do results make sense for known documents (README.md, config files)?
- Is performance acceptable for real-time processing?
- Any blockers preventing progression to readability improvements?

---

### Sprint 2: Hybrid Readability Assessment (Week 1-2)
**Goal**: Replace broken syllable counting with research-validated hybrid approach

**Scope:**
- Implement traditional formula baseline (Flesch-Kincaid, ARI, Dale-Chall)
- Add embedding-based readability regression
- Create hybrid model combining surface features + semantic embeddings
- Calibrate scoring for technical document accuracy

**Key Deliverables:**
- Multiple readability calculation methods with fallback hierarchy
- Hybrid regressor trained on technical document characteristics
- Realistic score calibration (45-55 range for technical content)
- Integration with existing embedding generation pipeline

**Success Criteria:**
- **Measurable**: Technical docs score 40-60 (vs current 3-11)
- **Accuracy**: >90% alignment with human readability assessment
- **Calibration**: README.md scores ~45, complex architecture docs score ~55
- **Speed**: <50ms per document additional processing time

**TMOAT Validation Approach:**
1. **Score Verification**: Test known documents, verify realistic ranges
2. **Comparative Analysis**: Compare hybrid vs traditional formula results
3. **Technical Document Focus**: Validate accuracy on architecture docs, code comments
4. **Performance Impact**: Measure total processing time increase
5. **Model Independence**: Verify works consistently across all 5 embedding models

**Human Safety Stop Questions:**
- Do readability scores make intuitive sense for known technical documents?
- Is the hybrid approach providing better accuracy than traditional formulas?
- Are processing times still acceptable for real-time indexing?
- Ready to tackle the more complex topic extraction challenge?

---

### Sprint 3: Model-Specific Optimizations (Week 2-3)
**Goal**: Leverage unique capabilities of BGE-M3 and E5 models for enhanced extraction quality

**Scope:**
- **BGE-M3 Multi-functionality**: Enable dense + sparse + ColBERT modes
- **E5 Optimization**: Implement proper query/passage prefixes and L2 normalization
- **Model-specific tuning**: Optimize extraction parameters per model type
- **Performance balancing**: Maintain speed while maximizing quality

**Key Deliverables:**
- BGE-M3 sparse features for improved keyphrase extraction
- BGE-M3 ColBERT vectors for fine-grained topic matching
- E5 prefix formatting for optimal semantic understanding
- Model-specific parameter configurations

**Success Criteria:**
- **BGE-M3**: +25% keyphrase quality, +15% topic precision from multi-functionality
- **E5 Models**: +8% overall coherence from proper formatting
- **Compatibility**: Maintain backward compatibility with ONNX CPU models
- **Performance**: Optimizations shouldn't degrade processing speed significantly

**TMOAT Validation Approach:**
1. **Multi-functionality Testing**: Verify BGE-M3 sparse/ColBERT modes work correctly
2. **Quality Comparison**: A/B test optimized vs standard model usage
3. **Performance Monitoring**: Ensure optimizations don't create bottlenecks
4. **Cross-model Consistency**: Validate similar quality across all 5 models
5. **Integration Verification**: Test with MCP endpoints for real-world usage patterns

**Human Safety Stop Questions:**
- Are model-specific optimizations delivering measurable quality improvements?
- Is the added complexity worth the performance gains?
- Are all 5 models still producing consistent, high-quality results?
- Should we proceed to chunking optimization or focus on stability?

---

## Epic-Level Success Validation

### Final Quality Gates (All Must Pass)
1. **Quantitative Targets Met**:
   - Key phrases: >80% multiword (current: 11%)
   - Topics: >90% domain-specific (current: 29%)
   - Readability: Realistic 40-60 scores (current: 3-11)

2. **Model Compatibility**: All 5 curated models producing consistent, high-quality results

3. **Performance Acceptable**: Total processing time <2x current (broken) implementation

4. **Production Readiness**: MCP endpoints returning meaningful semantic data

### Epic Completion Criteria
- **Technical Debt Eliminated**: Completely replace broken ContentProcessingService
- **Architecture Clean**: New SemanticExtractionService follows clean architecture principles
- **Quality Validated**: Human verification confirms dramatic improvement in semantic meaning
- **Testing Complete**: Comprehensive TMOAT validation across all components

### Rollback Strategy
If critical issues emerge:
1. **Sprint-level rollback**: Keep previous sprint working, isolate current sprint changes
2. **Feature flags**: Ability to switch between old/new extraction during transition
3. **Database compatibility**: Maintain ability to serve existing indexed content
4. **Performance monitoring**: Automatic fallback if processing times exceed thresholds

---

## Risk Mitigation

### High-Risk Areas
1. **Performance Degradation**: New ML-based approaches could be slower than broken baseline
   - **Mitigation**: Benchmark at each sprint, optimize critical paths

2. **Model Compatibility**: Techniques might not work uniformly across all 5 models
   - **Mitigation**: Model-specific testing in each sprint, fallback implementations

3. **Memory Usage**: Advanced ML techniques could increase RAM requirements
   - **Mitigation**: Monitor memory usage, implement streaming where possible

4. **Integration Complexity**: New service architecture might complicate existing workflows
   - **Mitigation**: Maintain backward compatibility, gradual migration strategy

### Success Dependencies
- **Python Libraries Available**: KeyBERT, BERTopic, sentence-transformers must install successfully
- **Model Loading**: All 5 curated models must continue working with new extraction methods
- **Database Schema**: Semantic data storage must accommodate richer extraction results
- **MCP Integration**: New extraction must integrate seamlessly with MCP protocol

---

## Post-Epic Outcomes

### Expected Quality Transformation
**Before (Broken):**
```json
{
  "topics": ["general", "education"],
  "key_phrases": ["document", "search"],
  "readability_score": 8.5
}
```

**After (Research-Validated):**
```json
{
  "topics": ["machine learning models", "semantic search systems", "embedding architectures"],
  "key_phrases": ["transformer-based embeddings", "vector similarity search", "multi-modal retrieval"],
  "readability_score": 47.2
}
```

### Business Impact
- **User Trust Restored**: Semantic search returns meaningful, relevant results
- **Competitive Advantage**: Production-quality semantic extraction differentiates from simple keyword matching
- **Scalability Foundation**: Clean architecture supports future ML enhancements
- **Technical Debt Eliminated**: No more broken foundational code affecting entire application

This epic represents a critical transformation from broken semantic extraction to research-validated, production-quality semantic understanding across our entire multi-model architecture.