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

## Implementation Clarifications

### Model Performance Data Sources
**No local benchmarking - Use published data only:**
- **MTEB Leaderboard**: https://huggingface.co/spaces/mteb/leaderboard (retrieval scores)
- **SBERT.net**: https://www.sbert.net/docs/pretrained_models.html (speed benchmarks)
- **HuggingFace Model Cards**: Individual model performance data

### ONNX Models Strategy
**Use pre-converted models from Xenova:**
- Source: https://huggingface.co/Xenova
- Direct download, no conversion needed
- Example: `https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx`

### Hardware Detection Priority
1. **Mac (Primary)**: Full implementation and testing
2. **Windows/Linux**: Basic fallback, improve based on user reports
3. **Cache results**: Store in `~/.folder-mcp/machine-capabilities.json`

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

#### Sprint A1: Model Catalog & Capabilities Detection
**All work can be done autonomously with TMOAT verification**

**Sub-tasks:**
1. **Create curated-models.json**
   - Use SBERT.net benchmarks for performance data
   - Use MTEB scores for quality metrics
   - Start with 3 models: all-MiniLM-L6-v2, all-mpnet-base-v2, paraphrase-multilingual-MiniLM

2. **Implement Machine Capabilities Detector**
   - Full Mac implementation (test on current M3)
   - Basic fallback for Windows/Linux
   - Cache results for 30 days

3. **Build Model Compatibility Evaluator**
   - Score models based on published benchmarks
   - Filter by language support
   - Never recommend Ollama in Assisted mode

**TMOAT Verification:**
```typescript
// tests/domain/models/model-system.tmoat.test.ts
describe('Model System TMOAT', () => {
  it('loads curated models catalog');
  it('detects Mac capabilities correctly');
  it('caches capabilities for fast access');
  it('ranks models by compatibility');
  it('filters Ollama from Assisted mode');
});
```

#### Sprint A2: ONNX Runtime Integration
**Autonomous implementation using Xenova's pre-converted models**

**Sub-tasks:**
1. **Install ONNX Runtime**
   - Add `onnxruntime-node` to package.json
   - Create ONNX service infrastructure

2. **Implement ONNX Embedding Service**
   - Use Xenova's models from HuggingFace
   - Direct download URLs (no CDN needed)
   - Auto-redownload if missing

3. **Build ONNX Downloader**
   - HuggingFace direct download
   - SHA256 verification
   - Progress tracking

**TMOAT Verification:**
```typescript
// tests/infrastructure/embeddings/onnx/onnx.tmoat.test.ts
describe('ONNX System TMOAT', () => {
  it('downloads ONNX model from HuggingFace');
  it('generates 384-dim embeddings');
  it('auto-redownloads deleted models');
  it('verifies SHA256 integrity');
});
```

#### Sprint A3: Model Selection Logic & FMDM Integration
**Complete backend logic before any TUI work**

**Sub-tasks:**
1. **Create Model Selection Service**
   - Implement Assisted mode logic (filter Ollama)
   - Implement Manual mode logic (include Ollama)
   - Language-based filtering
   - Performance scoring

2. **Integrate with FMDM**
   - Add 'downloading-model' status type
   - Implement global folder updates for shared models
   - Progress broadcasting system

3. **Update Daemon Integration**
   - Connect model selection to indexing
   - Handle model switching scenarios
   - Queue management for downloads

**TMOAT Verification:**
```typescript
// tests/application/model-selection.tmoat.test.ts
describe('Model Selection TMOAT', () => {
  it('recommends best model for languages');
  it('filters Ollama in Assisted mode');
  it('includes Ollama in Manual mode');
  it('broadcasts download to all folders');
  it('handles model switching correctly');
});
```

#### Sprint A4: Ollama Detection
**Autonomous Ollama integration**

**Sub-tasks:**
1. **Create Ollama Model Detector**
   - Query Ollama API if running
   - Filter for embedding models only
   - Return empty array for Assisted mode

2. **Handle Offline Ollama**
   - Graceful fallback when not running
   - Clear error messages
   - No crashes or hangs

**TMOAT Verification:**
```typescript
// tests/infrastructure/ollama/ollama.tmoat.test.ts
describe('Ollama Detection TMOAT', () => {
  it('detects Ollama models when running');
  it('returns empty when Ollama offline');
  it('filters for Manual mode only');
  it('handles API errors gracefully');
});
```

### ✅ Backend Completion Gate
**All autonomous work must pass before TUI phase:**
```bash
npm test -- tests/**/*.tmoat.test.ts
# All backend tests must pass
# No manual intervention should be needed
```

---

### 👤 Phase B: TUI Integration (Manual Testing Required - 1-2 days)
**Only begin after ALL backend tests pass**

#### Sprint B1: Add Folder Wizard Enhancement
**Manual TUI testing required for visual interface changes**

**Sub-tasks:**
1. **Enhance AddFolderWizard Component**
   - Add mode selection screen (Manual/Assisted)
   - Add language selection screen (checkboxes)
   - Add model recommendation screen
   - Integration with backend model evaluator
   - **Verification**: Manual TUI test

2. **Display Model Details in TUI**
   - Show performance expectations
   - Memory requirements
   - Language support indicators
   - **Verification**: Visual verification required

3. **Handle Model Selection Flow**
   - Save to folder configuration
   - Pass to indexing orchestrator
   - Handle cancellation gracefully
   - **Verification**: End-to-end TUI test

#### Sprint B2: Model Download Progress UI
**Visual progress indicators require manual testing**

**Sub-tasks:**
1. **Update TUI Status Display**
   - Show "Downloading model: 45%" for affected folders
   - Add progress bar visualization
   - Group folders by model if downloading same one
   - **Verification**: Manual TUI test

2. **Handle Download Errors in UI**
   - Display error messages clearly
   - Offer retry options
   - **Verification**: Manual error scenario testing

### 🛑 **USER SAFETY STOPS**

**STOP 1: After Phase A Completion**
```bash
npm test -- tests/**/*.tmoat.test.ts
# All backend tests must pass
# No manual intervention should be needed
```

**STOP 2: Complete Model Selection Flow**
```bash
npm run build
npm run tui
# Test scenarios:
# 1. Assisted mode: Verify NO Ollama models shown
# 2. Manual mode: Verify Ollama models ARE shown
# 3. Test smooth onboarding (instant capability detection)
# 4. Check that selection persists
# 5. Cancel and retry selection
```

**STOP 3: Complete System Test**
```bash
npm run build
npm run tui
# Complete end-to-end test:
# 1. Fresh install simulation (clear cache first)
# 2. Verify instant capability detection (cached)
# 3. Add folder with Assisted mode
# 4. Confirm NO Ollama models shown
# 5. Switch to Manual mode
# 6. Verify Ollama models now visible
# 7. Select model and complete flow
# 8. Test model deletion/redownload
# 9. Verify smooth onboarding experience
```

---

## Smooth Onboarding Optimizations

### Capability Caching Strategy
```typescript
class OnboardingOptimizer {
  private capabilities: MachineCapabilities | null = null;
  
  async preloadCapabilities() {
    // Load on TUI startup, not during wizard
    this.capabilities = await this.capabilitiesService.getCapabilities();
  }
  
  getInstantCapabilities(): MachineCapabilities {
    if (!this.capabilities) {
      throw new Error('Capabilities not preloaded');
    }
    return this.capabilities;
  }
}
```

### First-Run Experience
1. **TUI Launch**: Immediately load cached capabilities (or detect if first run)
2. **Wizard Opens**: Capabilities already available (no delay)
3. **Mode Selection**: Default to Assisted for beginners
4. **Language Selection**: Simple checkboxes
5. **Instant Recommendation**: No computation delay
6. **One-Click Accept**: Start indexing immediately

## Testing Strategy

### Backend Testing (TMOAT)
```markdown
## TMOAT: Model System Backend Tests

### Test 1: Capability Caching
- [ ] First run: Detect and cache capabilities
- [ ] Second run: Load from cache instantly
- [ ] Cache expiry after 30 days works
- [ ] Force refresh option works

### Test 2: Global Model Updates
- [ ] Multiple folders using same model update together
- [ ] Download progress syncs across folders
- [ ] No duplicate downloads triggered
- [ ] Status changes propagate correctly

### Test 3: Auto-Redownload
- [ ] Deleted models are detected as missing
- [ ] Redownload triggers automatically
- [ ] Indexing resumes after download
- [ ] SHA256 verification still works

### Test 4: Ollama Mode Filtering
- [ ] Assisted mode NEVER shows Ollama models
- [ ] Manual mode ALWAYS shows Ollama models (if detected)
- [ ] Mode switching updates model list correctly
- [ ] Ollama detection handles offline Ollama gracefully
```

## Success Criteria

1. ✅ Onboarding takes <3 seconds from TUI launch to model selection
2. ✅ Capabilities cached and reused effectively
3. ✅ Assisted mode never shows Ollama models
4. ✅ Manual mode shows all models including Ollama
5. ✅ Deleted models auto-redownload when needed
6. ✅ All folders using a model update status together
7. ✅ No duplicate downloads for same model
8. ✅ Smooth, flicker-free TUI experience

## Risk Mitigation

1. **Slow First Detection**: Show "Analyzing your system..." with spinner
2. **Cache Corruption**: Validate cache, regenerate if invalid
3. **Ollama Offline**: Gracefully hide Ollama section if not running
4. **Network Issues**: Retry downloads with exponential backoff
5. **Multiple Folders**: Use transaction-like updates to prevent partial states

## File Structure
```
src/
├── config/
│   └── curated-models.json          # Model catalog
├── domain/
│   └── models/
│       ├── machine-capabilities.ts   # Hardware detection
│       ├── model-evaluator.ts       # Compatibility evaluation
│       └── types.ts                 # Model interfaces
├── infrastructure/
│   └── embeddings/
│       ├── onnx/
│       │   ├── onnx-embedding-service.ts
│       │   └── onnx-downloader.ts
│       └── ollama/
│           └── ollama-detector.ts
└── interfaces/
    └── tui-ink/
        └── components/
            └── AddFolderWizard.tsx  # Enhanced with model selection
```

## Curated Models Catalog Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-14",
  
  "gpuModels": {
    "description": "Models optimized for GPU acceleration (also run on CPU with reduced performance)",
    "provider": "python-sentence-transformers",
    "downloadMethod": "huggingface-auto",
    "models": [
      {
        "id": "folder-mcp:all-MiniLM-L6-v2",
        "displayName": "All-MiniLM-L6-v2",
        "description": "Balanced speed and quality, general purpose",
        "huggingfaceId": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": 384,
        "modelSizeMB": 80,
        "supportedLanguages": ["en"],
        "languagePerformance": {
          "en": 1.0,
          "other": 0.3
        },
        "requirements": {
          "cpu": {
            "minRAM": 512,
            "recRAM": 1024,
            "minCores": 2,
            "recCores": 4,
            "expectedTokensPerSec": 100
          },
          "gpu": {
            "nvidia": {
              "minVRAM": 512,
              "minCUDA": "11.0",
              "minComputeCapability": "3.5",
              "expectedTokensPerSec": 1000
            },
            "apple": {
              "requiresMetal": true,
              "minUnifiedMemory": 512,
              "expectedTokensPerSec": 800
            },
            "amd": {
              "minVRAM": 512,
              "minROCm": "5.0",
              "expectedTokensPerSec": 600
            }
          }
        }
      }
    ]
  },
  
  "cpuModels": {
    "description": "Models optimized specifically for CPU inference using ONNX Runtime",
    "provider": "onnx-runtime",
    "downloadMethod": "cdn-download",
    "cdnBaseUrl": "https://cdn.folder-mcp.io/models/v1/",
    "models": [
      {
        "id": "folder-mcp-lite:onnx-all-MiniLM-L6-v2",
        "displayName": "ONNX-All-MiniLM-L6-v2",
        "description": "CPU-optimized version of All-MiniLM-L6-v2",
        "baseModelId": "folder-mcp:all-MiniLM-L6-v2",
        "dimensions": 384,
        "modelSizeMB": 31,
        "quantization": "int8",
        "supportedLanguages": ["en"],
        "languagePerformance": {
          "en": 1.0,
          "other": 0.3
        },
        "downloadInfo": {
          "filename": "all-MiniLM-L6-v2-int8.onnx",
          "url": "https://cdn.folder-mcp.io/models/v1/all-MiniLM-L6-v2-int8.onnx",
          "sha256": "d435b2ca66c5b3c0cf8e7bc2d4d42c5a8d0cb7361ff3bdd7cd6958a3b3d7f632",
          "sizeBytes": 32505856
        },
        "requirements": {
          "cpu": {
            "minRAM": 256,
            "recRAM": 512,
            "minCores": 2,
            "recCores": 4,
            "cpuFeatures": [],
            "optimalCpuFeatures": ["AVX2", "FMA"],
            "expectedTokensPerSec": 300
          }
        }
      }
    ]
  }
}
```