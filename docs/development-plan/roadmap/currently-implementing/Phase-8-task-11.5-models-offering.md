# Phase 8 Task 11.5: Multi-Source Model Offering System

**Status**: 📋 PLANNED  
**Start Date**: TBD  
**Dependencies**: Task 11 (SQLite-vec Embeddings) ✅ COMPLETED  
**Test Strategy**: Agent-led TMOAT verification for backend, Manual TUI testing for UI

## Overview

Implement a comprehensive model selection system that offers users GPU models (Python/HuggingFace), CPU models (ONNX), and detected Ollama models, with intelligent recommendations based on machine capabilities and language requirements.

## Core Principles

1. **Smooth Onboarding**: Cache machine capabilities for instant access
2. **Smart Defaults**: Assisted mode never suggests Ollama models (manual only)
3. **Resilient Downloads**: Auto-redownload deleted models when needed
4. **Global Status Updates**: FMDM broadcasts affect all folders using a model
5. **Backend-First Development**: Complete autonomous backend with TMOAT verification before TUI
6. **Solo Developer Optimized**: Mac-focused development with minimal Windows testing

## Core Deliverables

1. **Curated Models Catalog** - Single source of truth for all folder-mcp models
2. **Cached Machine Capabilities** - One-time detection, persistent storage
3. **Model Compatibility Evaluator** - Intelligent model recommendation engine
4. **ONNX Runtime Integration** - CPU-optimized model support
5. **Enhanced Add Folder Wizard** - Manual/Assisted modes with model selection
6. **Dynamic Ollama Detection** - Runtime detection (Manual mode only)

## Implementation Clarifications (Updated with Research Findings)

### Model Performance Data (Research-Driven)
**Use concrete research findings instead of general benchmarks:**
- **BGE-M3**: 70+ nDCG@10 on MIRACL benchmarks, 100-200 tokens/sec GPU
- **multilingual-e5-large**: 65-68 MTEB score, 150-250 tokens/sec GPU  
- **Xenova/multilingual-e5-small**: 171k downloads/month (most popular ONNX)
- **Language degradation patterns**: Latin 85-95%, CJK 70-85%, Arabic 60-75%

### ONNX Models Strategy (Research-Proven)
**Use Xenova's most popular pre-converted models:**
- **Primary target**: Xenova/multilingual-e5-small (171k downloads/month)
- **High-accuracy option**: Xenova/multilingual-e5-large  
- **Quantization benefits**: 50-75% size reduction, 2-4x speed improvement
- **Direct URLs**: `huggingface.co/Xenova/[model]/resolve/main/onnx/model_quantized.onnx`

### Hardware Detection Strategy (Research-Driven)
**Use systeminformation package (research-identified solution):**
- **Node.js library**: systeminformation with 50+ detection functions
- **GPU thresholds**: 4GB+ VRAM for GPU models (research recommendation)
- **CPU optimization**: AVX2, FMA feature detection for performance
- **Caching**: NodeCache with 1-hour TTL (research proven pattern)
- **Platform priority**: Mac (Primary), Windows/Linux (fallback)

### Development Workflow
**Phase A: Backend (Autonomous with TMOAT)**
- All model system logic
- ONNX integration
- FMDM updates
- Complete test coverage

**Phase B: TUI (Manual Testing Required)**
- Add folder wizard updates
- Model selection UI
- Progress visualization

## Reorganized Implementation Plan

### 🤖 Phase A: Autonomous Backend Implementation (3-4 days)

#### Sprint A1: Machine Capabilities Detection & Model Evaluator
**✅ curated-models.json COMPLETED - Ready for implementation**

**Sub-tasks:**
1. **Implement Machine Capabilities Detector**
   - Install `systeminformation` package 
   - Detect GPU: NVIDIA (CUDA version, VRAM), Apple (Metal, unified memory), AMD (ROCm, VRAM)
   - Detect CPU: cores, architecture, features (AVX2, FMA)
   - Detect memory: available RAM, swap space
   - Cache results with NodeCache (1-hour TTL)
   - Location: `src/domain/models/machine-capabilities.ts`

2. **Build Model Compatibility Evaluator**
   - Load curated-models.json catalog data
   - Score models by hardware compatibility (4GB+ VRAM for GPU, 1GB+ for CPU)
   - Apply language performance scoring from catalog data
   - Filter Ollama models from Assisted mode recommendations  
   - Location: `src/domain/models/model-evaluator.ts`

3. **Create Model Selection Service**
   - Combine capabilities + evaluator for smart recommendations
   - Implement Assisted mode (curated models only, best match)
   - Implement Manual mode (include Ollama detections)
   - Location: `src/application/models/model-selection-service.ts`

**TMOAT Verification:**
```typescript
// tests/domain/models/model-system.tmoat.test.ts
describe('Model System TMOAT', () => {
  it('loads curated-models.json catalog with 100+ languages');
  it('detects Mac M3 capabilities (Metal, unified memory)');
  it('caches capabilities for 1-hour with NodeCache');
  it('scores BGE-M3 higher for CJK languages (0.62-0.86)');
  it('scores MiniLM higher for European languages (0.80-0.90)');
  it('recommends GPU models only with 4GB+ VRAM');
  it('filters ALL Ollama models from Assisted mode');
  it('includes Ollama models in Manual mode only');
});
```

#### Sprint A2: ONNX Runtime Integration 
**✅ Xenova models specified in curated-models.json**

**Sub-tasks:**
1. **Install ONNX Runtime dependencies**
   - Add `onnxruntime-node` to package.json
   - Add `@huggingface/transformers` for Transformers.js compatibility
   - Verify Node.js compatibility (Windows/Mac/Linux)

2. **Implement ONNX Embedding Service**
   - Load models from curated-models.json ONNX section
   - Use direct HuggingFace URLs from catalog (e.g., Xenova/multilingual-e5-small)
   - Implement mean pooling and normalization for embeddings
   - Handle INT8 quantized models (50-75% size reduction from catalog)
   - Location: `src/infrastructure/embeddings/onnx/onnx-embedding-service.ts`

3. **Build ONNX Model Downloader**
   - Download from catalog URLs: `huggingface.co/Xenova/[model]/resolve/main/onnx/model_quantized.onnx`
   - Verify model size matches catalog expectations (120MB, 550MB)
   - Progress tracking and auto-redownload if missing
   - Location: `src/infrastructure/embeddings/onnx/onnx-downloader.ts`

**TMOAT Verification:**
```typescript
// tests/infrastructure/embeddings/onnx/onnx.tmoat.test.ts
describe('ONNX System TMOAT', () => {
  it('downloads Xenova/multilingual-e5-small (120MB expected)');
  it('generates 384-dim embeddings matching catalog specs');
  it('handles mean pooling and normalization correctly');
  it('processes 100+ languages from catalog (EN: 0.83, ES: 0.68, ZH: 0.63)');
  it('auto-redownloads if model file missing');
  it('runs 2-4x faster than GPU models on CPU-only systems');
});
```

#### Sprint A3: FMDM Integration & Model Download Management
**✅ Model selection logic completed in Sprint A1**

**Sub-tasks:**
1. **Extend FMDM with Model Status Broadcasting**
   - Add 'downloading-model' to FolderIndexingStatus enum
   - Implement `getFoldersUsingModel(modelId)` method
   - Add progress tracking (0-100%) for model downloads
   - Broadcast status updates to ALL folders using same model
   - Location: `src/application/daemon/folder-model-data-manager.ts`

2. **Implement Global Model Download Manager**
   - Prevent duplicate downloads for same model across folders
   - Update ALL affected folders during download progress  
   - Auto-redownload deleted models before indexing
   - Queue management for concurrent download requests
   - Location: `src/application/models/model-download-manager.ts`

3. **Update Indexing Orchestrator Integration**
   - Check model availability before starting indexing
   - Trigger download if model missing, then resume indexing
   - Handle model switching scenarios (stop → download → restart)
   - Location: Update existing indexing orchestrator

**TMOAT Verification:**
```typescript
// tests/application/model-download-management.tmoat.test.ts
describe('Model Download Management TMOAT', () => {
  it('prevents duplicate downloads when 3 folders use BGE-M3');
  it('updates ALL folder statuses during download progress (0-100%)');
  it('auto-redownloads deleted model before indexing resumes');
  it('broadcasts "downloading-model" status to affected folders only');
  it('handles model switching: stop indexing → download → restart');
  it('queues concurrent download requests (no parallel downloads of same model)');
});
```

#### Sprint A4: Ollama Detection & Manual Mode Integration
**✅ Target models specified in curated-models.json**

**Sub-tasks:**
1. **Implement Ollama Model Detector**
   - Query `http://localhost:11434/api/tags` with 3-second timeout
   - Cross-reference with curated-models.json ollama section:
     - `granite-embedding:278m` - 12 languages (EN: 0.95, CJK/AR: 0.80)
     - `snowflake-arctic-embed2:305m/568m` - European focus (EN: 0.95-0.98, EU: 0.90-0.93)
   - Filter embedding models (exclude chat/completion models)
   - Return empty array for Assisted mode, full results for Manual mode
   - Location: `src/infrastructure/ollama/ollama-detector.ts`

2. **Handle Offline Ollama Scenarios**
   - Graceful fallback when localhost:11434 unavailable (connection refused)
   - Provide installation commands from catalog: `ollama pull granite-embedding:278m`
   - Clear error messages: "Ollama not running. Install with: ..."
   - No crashes, hangs, or blocking behavior during detection
   - Location: Enhanced error handling in ollama-detector.ts

**TMOAT Verification:**
```typescript
// tests/infrastructure/ollama/ollama.tmoat.test.ts
describe('Ollama Detection TMOAT', () => {
  it('detects granite-embedding:278m when Ollama running');
  it('cross-references with curated-models.json (granite: 12 languages, arctic: 6 languages)');
  it('returns empty array for Assisted mode (never auto-recommend)');
  it('returns detected models for Manual mode only');
  it('handles offline Ollama gracefully (3-second timeout)');
  it('provides install commands from catalog when models missing');
  it('filters embedding models vs chat models correctly');
});
```

### ✅ Backend Completion Gate
**All autonomous work must pass before TUI phase:**
```bash
npm test -- tests/**/*.tmoat.test.ts
# Specific tests that must pass:
# - model-system.tmoat.test.ts (capabilities + evaluator)
# - onnx.tmoat.test.ts (Xenova integration)
# - model-download-management.tmoat.test.ts (FMDM + global downloads)
# - ollama.tmoat.test.ts (Manual mode detection)
# - intelligent-recommendations.tmoat.test.ts (Architecture fixes)
# All tests autonomous - no manual intervention needed
```

#### Sprint A5: Intelligent Recommendations Architecture Fixes
**Critical architectural issues discovered during backend development**

**Sub-tasks:**
1. **Remove Ollama from Curated Models Configuration**
   - Delete entire `ollamaModels` section from curated-models.json (lines 484-553)
   - Ollama models violate runtime-only detection principle (should not be in static config)
   - Keep only GPU models (Python/HuggingFace) and CPU models (ONNX) in curated catalog
   - Location: `src/config/curated-models.json`

2. **Update ModelCompatibilityEvaluator for Clean Architecture**
   - Remove all references to `catalog.ollamaModels.knownModels` in evaluator code
   - Update `getAllAvailableModels()` to exclude Ollama catalog models (line 122)
   - Update `getModelById()` to exclude Ollama models (line 328)
   - Update `getSupportedLanguages()` to exclude Ollama language data (line 341)
   - Location: `src/domain/models/model-evaluator.ts`

3. **Implement Hardware as Binary Filter (Not Scored)**
   - Convert `evaluateHardwareCompatibility()` to return only boolean compatibility
   - Remove hardware scoring from total score calculation (lines 140-148)
   - Use hardware compatibility as go/no-go gate before any scoring occurs
   - Maintain hardware reasoning for user feedback without contributing points
   - Location: `src/domain/models/model-evaluator.ts`

4. **Fix Scoring Weights Distribution**
   - **Language Compatibility: 60%** (0-60 points, currently 0-20 at line 154)
   - **Accuracy (MTEB): 32%** (0-32 points, currently 0-10 at lines 164-167)
   - **Speed: 8%** (0-8 points, currently 0-10 at lines 158-161)
   - **Total: 100 points maximum** (proper language prioritization)
   - Location: `src/domain/models/model-evaluator.ts`

5. **Pure Runtime Ollama Detection**
   - Ollama models get basic info only: `{id, modelName, displayName}` from `/api/tags`
   - No predefined language capabilities (user responsibility for power-user feature)
   - Simple list for manual mode selection only (no scoring or compatibility evaluation)
   - Location: `src/infrastructure/ollama/ollama-detector.ts`

**TMOAT Verification:**
```typescript
// tests/domain/models/intelligent-recommendations.tmoat.test.ts
describe('Intelligent Recommendations Architecture TMOAT', () => {
  it('loads curated-models.json without ollamaModels section');
  it('ModelCompatibilityEvaluator excludes all Ollama references');
  it('hardware acts as binary filter (not scored in total)');
  it('language gets 60 points, accuracy 32 points, speed 8 points (100 total)');
  it('Ollama detection provides basic info only (no language capabilities)');
  it('assisted mode never includes Ollama models (runtime-only for manual)');
  it('scoring prioritizes language fit over hardware/speed performance');
});
```

---

### 👤 Phase B: TUI Integration (Manual Testing Required - 2 days)
**Only begin after ALL 5 TMOAT test suites pass**

#### Sprint B1: Basic Selection Components (0.5-1 day)
**Goal**: Add mode and language selection steps to wizard
**Dependencies**: Clean Phase A backend completion
**Risk**: Low - uses existing SelectionListItem

**Sub-tasks:**
1. **Add Mode Selection Step**
   - **Component**: `SelectionListItem` in radio mode
   - **Options**: 
     - "Assisted (Recommended)" - Let us choose the best model for your needs
     - "Manual (Advanced)" - Browse all available models including Ollama
   - **Default**: 'assisted' pre-selected
   - **Location**: Update `AddFolderWizard.tsx`

2. **Add Language Selection Step**
   - **Component**: `SelectionListItem` in checkbox mode with vertical layout
   - **Options**: Common languages with native names (English/English, Spanish/Español, etc.)
   - **Default**: English pre-selected
   - **Location**: Update `AddFolderWizard.tsx`

3. **Basic Wizard Navigation**
   - Step-by-step navigation between mode and language selection
   - Back/forward navigation handling
   - Selection state preservation

**Testing**: Manual TUI test for step navigation and selection

---

#### Sprint B2: Model Selection with Compatibility (1 day)
**Goal**: Implement model selection with dual column configurations
**Dependencies**: Sprint B1, ModelSelectionService working
**Risk**: Medium - complex backend integration

**Sub-tasks:**
1. **Integrate ModelSelectionService**
   - Call `ModelSelectionService.recommendModels()` with selected languages/mode
   - Handle async model recommendation loading
   - Error handling for backend service failures

2. **Implement Assisted Mode Model Selection**
   - **Columns**: `['Speed', 'Accuracy', 'Languages', 'Memory', 'Type']`
   - Show only compatible curated models, sorted by score
   - No compatibility column (all models work)
   - Primary recommendation marked with [Recommended] and pre-selected
   - No Ollama models shown

3. **Implement Manual Mode Model Selection**
   - **Columns**: `['Compatibility', 'Speed', 'Accuracy', 'Languages', 'Memory', 'Type']`
   - Show ALL models (compatible + incompatible + Ollama)
   - **Compatibility States**:
     - `√ Supported` - Curated models that will work
     - `! Needs GPU` / `! Needs 4GB VRAM` - Specific hardware requirements not met
     - `* User Managed` - Ollama models (user responsibility)
   - Alphabetical sorting, no pre-selection

4. **Add OllamaDetector Integration**
   - Integrate `OllamaDetector.detectModels('manual')` for manual mode
   - Handle offline Ollama scenarios gracefully
   - Show Ollama models with "* User Managed" and "-" for unknown data

**Testing**: Manual TUI test both assisted and manual modes with different hardware scenarios

---

#### Sprint B3: Complete Wizard Integration (0.5 day)
**Goal**: Replace old wizard flow with new 4-step flow
**Dependencies**: Sprint B1 + B2
**Risk**: Low - mostly cleanup and integration

**Sub-tasks:**
1. **Remove Old Model Selection Logic**
   - Delete hardcoded model selection from current wizard
   - Clean up old model-related validation code
   - Update wizard flow to use new 4-step process: Folder → Mode → Languages → Model

2. **Update Wizard Completion Handler**
   - Extract final selections from all steps
   - Update completion handler to use new model selection format
   - Integrate with existing folder configuration system
   - Pass selected model to indexing orchestrator

3. **Integration Testing**
   - Test complete wizard flow end-to-end
   - Verify integration with existing validation system
   - Handle edge cases (no models found, backend errors)

**Testing**: Full end-to-end wizard flow testing

---

#### Sprint B4: Polish & Edge Cases (0.5 day)
**Goal**: Handle error scenarios and polish UX
**Dependencies**: Sprint B3
**Risk**: Low - refinement work

**Sub-tasks:**
1. **Error Scenario Handling**
   - Handle offline Ollama scenarios gracefully
   - Handle no compatible models found scenario
   - Backend service failure recovery
   - Clear error messages for all failure modes

2. **UX Polish**
   - Improve loading states during model detection
   - Add helpful progress indicators
   - Smooth transitions between wizard steps
   - Final visual polish and consistency

3. **Edge Case Testing**
   - Test with various hardware configurations
   - Test language combinations that have no recommended models
   - Test rapid navigation through wizard steps

**Testing**: Error scenario testing, full system integration, edge case validation

### 🛑 **USER SAFETY STOPS**

**STOP 1: Phase A Backend Completion**
```bash
# Must pass ALL 5 TMOAT suites:
npm test -- tests/domain/models/model-system.tmoat.test.ts
npm test -- tests/infrastructure/embeddings/onnx/onnx.tmoat.test.ts  
npm test -- tests/application/model-download-management.tmoat.test.ts
npm test -- tests/infrastructure/ollama/ollama.tmoat.test.ts
npm test -- tests/domain/models/intelligent-recommendations.tmoat.test.ts

# Expected: All tests pass autonomously
# Expected: curated-models.json loads correctly with 100+ languages
# Expected: Machine capabilities detected and cached
# Expected: Model recommendations work for different language combinations
# No manual intervention needed - fully autonomous backend
```

**STOP 2: Sprint B1 Completion - Basic Selection Components**
```bash
npm run build && npm run tui
# Test: Mode selection works (radio selection)
# ✅ "Assisted (Recommended)" vs "Manual (Advanced)" options display
# ✅ Assisted mode pre-selected by default
# ✅ Radio selection navigation works with arrow keys

# Test: Language selection works (checkbox multi-select)  
# ✅ Common languages with native names display
# ✅ English pre-selected by default
# ✅ Multi-select checkbox behavior works
# ✅ Vertical layout displays properly

# Test: Navigation between steps (back/forward)
# ✅ Can navigate from mode to language selection
# ✅ Back navigation preserves previous selections
# ✅ Selection state preserved during navigation
```

**STOP 3: Sprint B2 Completion - Model Selection with Compatibility**
```bash
# Test: Assisted mode shows filtered models only
# ✅ Only compatible curated models shown
# ✅ Columns: Speed, Accuracy, Languages, Memory, Type (no Compatibility)
# ✅ Primary recommendation shows [Recommended] and pre-selected
# ✅ No Ollama models visible
# ✅ Models sorted by recommendation score

# Test: Manual mode shows all models with warnings
# ✅ ALL models shown (compatible + incompatible + Ollama)
# ✅ Columns: Compatibility, Speed, Accuracy, Languages, Memory, Type
# ✅ Compatible models show "√ Supported"
# ✅ Incompatible models show "! Needs GPU" etc.
# ✅ Ollama models show "* User Managed" with "-" for unknown data
# ✅ Alphabetical sorting, no pre-selection

# Test: ModelSelectionService integration
# ✅ Language selection affects recommendations
# ✅ Backend service calls work correctly
# ✅ Error handling for service failures
```

**STOP 4: Sprint B3 Completion - Complete Wizard Integration**  
```bash
# Test: Complete 4-step wizard flow
# ✅ Folder → Mode → Languages → Model flow works
# ✅ Old hardcoded model selection removed
# ✅ Selected model saves to folder configuration
# ✅ Wizard completion handler updated
# ✅ Integration with indexing orchestrator works

# Test: End-to-end functionality
# ✅ Complete wizard saves all selections properly
# ✅ Indexing starts with chosen model
# ✅ Edge cases handled (no models, backend errors)
```

**STOP 5: Sprint B4 Completion - Polish & System Integration**
```bash
# Test: Error scenario handling
# ✅ Offline Ollama handled gracefully with clear messages
# ✅ No compatible models scenario shows helpful guidance
# ✅ Backend service failures recover properly
# ✅ All error messages are clear and actionable

# Test: UX Polish
# ✅ Loading states during model detection show progress
# ✅ Smooth transitions between wizard steps
# ✅ Visual consistency across all components
# ✅ Professional polish and user-friendly experience

# Test: Full end-to-end system integration
# 1. Clear cache: rm -rf ~/.cache/folder-mcp ~/.folder-mcp
# 2. Launch TUI: npm run tui  
# 3. Verify fresh capability detection (first run)
# 4. Add folder → Assisted → Select languages → Accept recommendation
# 5. Verify indexing starts with selected model
# 6. Delete model manually: rm -rf ~/.cache/torch/sentence_transformers/[model]
# 7. Trigger re-indexing → Verify auto-redownload works
# 8. Add second folder → Manual → Verify Ollama models appear
# 9. Test rapid wizard navigation and edge cases
# ✅ All scenarios work smoothly with proper error handling
```

---

## Implementation Summary

### ✅ **Phase A Deliverables (Autonomous)**
1. **curated-models.json** - Complete catalog with 100+ languages and real performance data
2. **Machine Capabilities Detector** - Hardware detection with 1-hour caching
3. **Model Compatibility Evaluator** - Language-aware recommendations using catalog data
4. **ONNX Runtime Integration** - Xenova models with auto-download
5. **FMDM Global Model Management** - Multi-folder download coordination
6. **Ollama Detection** - Manual mode integration with specific model targeting

### 👤 **Phase B Deliverables (Manual Testing)**
1. **Sprint B1**: Mode and language selection components using SelectionListItem
2. **Sprint B2**: Model selection with dual column configurations and compatibility warnings  
3. **Sprint B3**: Complete 4-step wizard integration (Folder → Mode → Languages → Model)
4. **Sprint B4**: Polished UX with error handling and edge case management

## Success Criteria

### ✅ **Backend Success Criteria (Autonomous - Phase A)**
1. **Fast Capability Detection**: <3 seconds with 1-hour caching (NodeCache)
2. **Accurate Model Recommendations**: Language-aware scoring using curated-models.json data
3. **Complete Ollama Filtering**: Assisted mode NEVER shows Ollama, Manual mode ALWAYS shows Ollama
4. **Global Download Management**: Multiple folders using same model update together, no duplicates
5. **Auto-Redownload**: Deleted models detected and redownloaded before indexing
6. **ONNX Integration**: Xenova models download and work correctly with expected performance
7. **Comprehensive Language Support**: 100+ languages with documented performance scores

### 👤 **TUI Success Criteria (Manual Testing - Phase B)**
1. **Sprint B1 Success**: Mode and language selection components work smoothly with proper navigation
2. **Sprint B2 Success**: Dual-mode model selection with clear compatibility warnings and rich data display
3. **Sprint B3 Success**: Complete 4-step wizard flow replaces old system and integrates properly
4. **Sprint B4 Success**: Professional UX with comprehensive error handling and edge case management

---

## 🚀 **Ready for Implementation**

### **Phase A: Autonomous Backend** (Start immediately)
✅ **curated-models.json** complete with 100+ languages and real performance data  
✅ **Research findings** integrated for all model recommendations  
✅ **TMOAT test scenarios** defined for autonomous verification  
✅ **Clear file structure** and implementation locations specified

### **Phase B: TUI Integration** (After all backend tests pass)
✅ **4 Sprint structure** defined with clear goals, dependencies, and risk levels
✅ **Detailed testing protocols** defined for each sprint with specific validation steps
✅ **User safety stops** established at each sprint completion milestone  
✅ **Sprint-by-sprint deliverables** clearly defined for systematic implementation

**Phase B Sprint Structure**:
- **Sprint B1** (0.5-1 day): Basic selection components - Low risk foundation work
- **Sprint B2** (1 day): Model selection with compatibility - Medium risk backend integration  
- **Sprint B3** (0.5 day): Complete wizard integration - Low risk cleanup and integration
- **Sprint B4** (0.5 day): Polish & edge cases - Low risk refinement work

**Next Step**: Begin Phase A backend implementation, then proceed with Phase B sprints!