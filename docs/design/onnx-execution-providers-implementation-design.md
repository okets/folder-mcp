# ONNX Runtime Execution Providers: Implementation Design

**Date**: 2025-11-03
**Status**: Draft
**Target**: folder-mcp v1.1.0

---

## Executive Summary

This design document outlines the integration of ONNX Runtime execution providers into folder-mcp to enable GPU-accelerated inference across platforms while maintaining the existing clean architecture and zero-configuration philosophy.

**Key Objectives**:
1. **Zero-Config GPU Acceleration**: Automatically detect and use best available hardware
2. **Universal Platform Support**: DirectML (Windows), CUDA (NVIDIA), CoreML (Apple Silicon)
3. **Graceful Degradation**: Fall back to CPU when GPU unavailable
4. **Minimal Installation Impact**: Use optional dependencies for GPU support
5. **Performance Transparency**: Show users which execution provider is active

---

## Current State Analysis

### Existing Architecture Strengths

1. **Clean Separation**: Domain, Application, Infrastructure, Interface layers well-separated
2. **Machine Detection**: Robust GPU/CPU detection already implemented (`machine-capabilities.ts`)
3. **Configuration System**: Hierarchical config with ENV vars, user config, and defaults
4. **Worker Pool**: Efficient multi-threading for CPU-bound operations (2 workers × 2 threads)
5. **Model Catalog**: Separate GPU and CPU model sections in `curated-models.json`

### Current ONNX Implementation

**Dependencies**:
```json
{
  "dependencies": {
    "onnxruntime-node": "^1.23.0",      // CPU + DirectML + CoreML
    "@xenova/transformers": "^2.17.2"    // Model loading
  }
}
```

**Execution Provider Support in Current Package**:
- ✅ **CPU**: All platforms (default)
- ✅ **DirectML**: Windows (included in base package)
- ✅ **CoreML**: macOS (included in base package)
- ❌ **CUDA**: Requires separate `onnxruntime-node-gpu` package

**Current Inference Configuration**:
```typescript
// No execution provider configuration - uses CPU only
this.model = await pipeline('feature-extraction', modelId, {
  local_files_only: false,
  cache_dir: this.cacheDir,
  revision: 'main'
});
```

### Gap Analysis

| Feature | Current State | Target State | Effort |
|---------|--------------|--------------|--------|
| GPU Detection | ✅ Implemented | ✅ Ready | None |
| CPU Inference | ✅ Working | ✅ Keep | None |
| DirectML Support | ⚠️ Available but unused | ✅ Auto-enabled | Low |
| CoreML Support | ⚠️ Available but unused | ✅ Auto-enabled | Low |
| CUDA Support | ❌ Not installed | ✅ Optional install | Medium |
| EP Auto-Selection | ❌ None | ✅ Smart fallback | Medium |
| Configuration UI | ❌ None | ✅ TUI display | Low |
| Performance Metrics | ⚠️ Basic timing | ✅ EP-specific stats | Low |

---

## Architecture Design

### 1. Execution Provider Detection Layer

**New Component**: `ExecutionProviderDetector`
**Location**: `src/infrastructure/embeddings/onnx/execution-provider-detector.ts`

```typescript
export interface ExecutionProviderCapability {
  provider: 'cpu' | 'cuda' | 'dml' | 'coreml' | 'tensorrt' | 'openvino';
  available: boolean;
  reason?: string;           // Why unavailable (missing driver, etc.)
  priority: number;          // Higher = preferred
  estimatedSpeedup: number;  // Multiplier vs CPU (e.g., 5x)
  configuration?: any;       // Provider-specific config
}

export class ExecutionProviderDetector {
  constructor(
    private machineCapabilities: MachineCapabilitiesDetector
  ) {}

  /**
   * Detect all available execution providers with priority ranking
   */
  async detectAvailableProviders(): Promise<ExecutionProviderCapability[]> {
    const capabilities = await this.machineCapabilities.detectCapabilities();
    const providers: ExecutionProviderCapability[] = [];

    // Platform-specific detection
    if (process.platform === 'win32') {
      providers.push(await this.detectCUDA(capabilities));
      providers.push(await this.detectDirectML(capabilities));
    } else if (process.platform === 'darwin') {
      providers.push(await this.detectCoreML(capabilities));
      providers.push(await this.detectCUDA(capabilities)); // eGPU support
    } else if (process.platform === 'linux') {
      providers.push(await this.detectCUDA(capabilities));
      providers.push(await this.detectOpenVINO(capabilities));
    }

    // CPU always available as fallback
    providers.push(this.getCPUProvider(capabilities));

    return providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get optimal execution provider chain for fallback
   */
  async getOptimalProviderChain(): Promise<string[]> {
    const available = await this.detectAvailableProviders();
    return available
      .filter(p => p.available)
      .map(p => p.provider);
  }
}
```

**Detection Logic**:

```typescript
private async detectDirectML(caps: MachineCapabilities): Promise<ExecutionProviderCapability> {
  // DirectML requires DirectX 12
  const dxSupport = await this.checkDirectX12Support();

  if (!dxSupport) {
    return {
      provider: 'dml',
      available: false,
      reason: 'DirectX 12 not available',
      priority: 0,
      estimatedSpeedup: 1
    };
  }

  // Check GPU type
  if (caps.gpu.type === 'none') {
    return {
      provider: 'dml',
      available: false,
      reason: 'No GPU detected',
      priority: 0,
      estimatedSpeedup: 1
    };
  }

  return {
    provider: 'dml',
    available: true,
    priority: 70,  // Lower than CUDA but higher than CPU
    estimatedSpeedup: 3.5,
    configuration: {
      enableMemPattern: false,
      executionMode: 'sequential'
    }
  };
}

private async detectCUDA(caps: MachineCapabilities): Promise<ExecutionProviderCapability> {
  if (caps.gpu.type !== 'nvidia') {
    return {
      provider: 'cuda',
      available: false,
      reason: 'No NVIDIA GPU detected',
      priority: 0,
      estimatedSpeedup: 1
    };
  }

  // Check if CUDA provider is actually installed
  const cudaInstalled = await this.checkCUDAProviderInstalled();
  if (!cudaInstalled) {
    return {
      provider: 'cuda',
      available: false,
      reason: 'onnxruntime-node-gpu not installed',
      priority: 0,
      estimatedSpeedup: 1
    };
  }

  return {
    provider: 'cuda',
    available: true,
    priority: 90,  // Highest priority
    estimatedSpeedup: 10,
    configuration: {
      deviceId: 0,
      gpuMemLimit: (caps.gpu.vramGB || 2) * 1024 * 1024 * 1024 * 0.8, // 80% VRAM
      arenaExtendStrategy: 'kNextPowerOfTwo',
      cudnnConvAlgoSearch: 'DEFAULT'
    }
  };
}

private async detectCoreML(caps: MachineCapabilities): Promise<ExecutionProviderCapability> {
  if (caps.gpu.type !== 'apple' || !caps.gpu.metalSupport) {
    return {
      provider: 'coreml',
      available: false,
      reason: 'Apple Silicon with Metal required',
      priority: 0,
      estimatedSpeedup: 1
    };
  }

  return {
    provider: 'coreml',
    available: true,
    priority: 85,
    estimatedSpeedup: 5,
    configuration: {
      modelFormat: 'MLProgram',  // CRITICAL for transformer support
      computeUnits: 'ALL',
      modelCacheDirectory: path.join(os.homedir(), '.cache', 'folder-mcp', 'coreml-cache')
    }
  };
}
```

---

### 2. ONNX Session Configuration

**Enhanced Component**: `ONNXEmbeddingService`
**Location**: `src/infrastructure/embeddings/onnx/onnx-embedding-service.ts`

**Current Session Creation**:
```typescript
// Via @xenova/transformers - no control over ONNX session options
this.model = await pipeline('feature-extraction', modelId, options);
```

**Problem**: Transformers.js abstracts ONNX Runtime, preventing direct execution provider configuration.

**Solution Options**:

#### Option A: Direct ONNX Runtime (Recommended)
Bypass Transformers.js and use `onnxruntime-node` directly for execution provider control:

```typescript
import * as ort from 'onnxruntime-node';

async initialize(): Promise<void> {
  // Detect optimal providers
  const providerChain = await this.epDetector.getOptimalProviderChain();

  // Create session with provider chain
  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: this.buildProviderConfig(providerChain),
    graphOptimizationLevel: 'all',
    enableCpuMemArena: true,
    enableMemPattern: true,
    executionMode: 'parallel',
    intraOpNumThreads: this.options.numThreads || 2,
    interOpNumThreads: 1
  };

  // Load model
  this.session = await ort.InferenceSession.create(modelPath, sessionOptions);

  console.log(`✅ ONNX session initialized with providers: ${providerChain.join(' → ')}`);
  console.log(`Active provider: ${this.session.inputNames[0]}`); // ONNX reports active EP
}

private buildProviderConfig(providerChain: string[]): ort.InferenceSession.ExecutionProviderConfig[] {
  return providerChain.map(provider => {
    const capability = this.providerCapabilities.find(c => c.provider === provider);

    if (provider === 'cuda') {
      return {
        name: 'cuda',
        ...capability?.configuration
      };
    } else if (provider === 'dml') {
      return {
        name: 'dml',
        ...capability?.configuration
      };
    } else if (provider === 'coreml') {
      return {
        name: 'coreml',
        ...capability?.configuration
      };
    } else {
      return { name: 'cpu' };
    }
  });
}
```

**Trade-offs**:
- ✅ Full control over execution providers
- ✅ Direct ONNX Runtime access
- ❌ Need to implement tokenization manually (currently done by Transformers.js)
- ❌ More complex model loading (need to handle ONNX model files directly)

#### Option B: Enhanced Transformers.js Integration
Keep Transformers.js but patch ONNX Runtime before model load:

```typescript
import * as ort from 'onnxruntime-node';
import { env, pipeline } from '@xenova/transformers';

async initialize(): Promise<void> {
  // Configure ONNX Runtime environment before Transformers.js uses it
  const providerChain = await this.epDetector.getOptimalProviderChain();

  // Set default session options for Transformers.js to use
  ort.env.webgpu = false; // Not using WebGPU
  ort.env.wasm.numThreads = this.options.numThreads || 2;

  // Transformers.js environment configuration
  env.backends.onnx.executionProviders = providerChain;

  // Load model (Transformers.js will use our EP configuration)
  this.model = await pipeline('feature-extraction', modelId, {
    local_files_only: false,
    cache_dir: this.cacheDir,
    revision: 'main'
  });
}
```

**Trade-offs**:
- ✅ Keep existing tokenization logic
- ✅ Less refactoring required
- ⚠️ Limited control over EP configuration
- ⚠️ Unclear if Transformers.js respects ONNX env settings

**Recommendation**: Use **Option A** for maximum control and performance optimization.

---

### 3. Configuration System Integration

**Enhanced Configuration**:
**Location**: `src/infrastructure/config/onnx-configuration.ts`

```typescript
export interface OnnxExecutionProviderConfig {
  // Automatic detection (default)
  autoDetect: boolean;

  // Manual override (for testing/debugging)
  forceProvider?: 'cpu' | 'cuda' | 'dml' | 'coreml';

  // Fallback chain (custom priority)
  fallbackChain?: string[];

  // Provider-specific options
  cuda?: {
    deviceId?: number;
    gpuMemLimitGB?: number;
    cudnnConvAlgoSearch?: 'DEFAULT' | 'EXHAUSTIVE' | 'HEURISTIC';
  };

  dml?: {
    deviceId?: number;
  };

  coreml?: {
    computeUnits?: 'ALL' | 'CPU_AND_GPU' | 'CPU_AND_NE';
  };
}

export class OnnxConfiguration implements IOnnxConfiguration {
  // ... existing methods ...

  /**
   * Get execution provider configuration
   */
  async getExecutionProviderConfig(): Promise<OnnxExecutionProviderConfig> {
    // Environment variable override
    if (process.env.ONNX_EXECUTION_PROVIDER) {
      return {
        autoDetect: false,
        forceProvider: process.env.ONNX_EXECUTION_PROVIDER as any
      };
    }

    // Configuration system
    if (this.configComponent) {
      const configValue = await this.configComponent.get('onnx.executionProvider');
      if (configValue) {
        return configValue as OnnxExecutionProviderConfig;
      }
    }

    // Default: auto-detect
    return {
      autoDetect: true
    };
  }
}
```

**User Configuration File** (`~/.folder-mcp/config.yaml`):
```yaml
onnx:
  executionProvider:
    autoDetect: true
    # Optional manual override
    # forceProvider: cuda
    cuda:
      gpuMemLimitGB: 4
      cudnnConvAlgoSearch: DEFAULT
```

**Environment Variables**:
```bash
# Force specific provider (for testing)
ONNX_EXECUTION_PROVIDER=cuda

# CUDA-specific settings
CUDA_VISIBLE_DEVICES=0
ONNX_CUDA_MEM_LIMIT_GB=4
```

---

### 4. Installation Flow Impact

#### Current Installation
```bash
npm install -g folder-mcp
# Installs: onnxruntime-node (CPU + DirectML + CoreML)
```

#### Enhanced Installation Options

**Option 1: Automatic GPU Package Detection (Recommended)**

Modify `package.json`:
```json
{
  "dependencies": {
    "onnxruntime-node": "^1.23.0"
  },
  "optionalDependencies": {
    "onnxruntime-node-gpu": "^1.23.0"
  },
  "scripts": {
    "postinstall": "node scripts/check-gpu-support.js"
  }
}
```

**Post-install Script** (`scripts/check-gpu-support.js`):
```javascript
// Check if GPU package successfully installed
const hasGPU = checkGPUPackage();
const gpuDetected = detectNVIDIAGPU();

if (gpuDetected && !hasGPU) {
  console.warn('⚠️  NVIDIA GPU detected but onnxruntime-node-gpu failed to install');
  console.warn('   Install CUDA Toolkit for GPU acceleration:');
  console.warn('   https://developer.nvidia.com/cuda-downloads');
}

if (hasGPU) {
  console.log('✅ GPU acceleration enabled (CUDA)');
}
```

**Trade-offs**:
- ✅ Automatic GPU support when possible
- ✅ Graceful degradation to CPU
- ⚠️ Larger package size (~200MB additional for GPU)
- ⚠️ Optional dependency may fail silently

**Option 2: Separate Package Installations**

Keep base package CPU-only, provide GPU variant:
```bash
# CPU-only (default)
npm install -g folder-mcp

# GPU-enabled (manual)
npm install -g folder-mcp-gpu
```

**Trade-offs**:
- ✅ Smaller default package
- ✅ User explicitly chooses GPU
- ❌ Package management complexity
- ❌ Poor user experience (which package?)

**Option 3: Post-Install GPU Setup Command**

Install CPU-only by default, add GPU via CLI:
```bash
# Initial install (CPU-only)
npm install -g folder-mcp

# Enable GPU (if needed)
folder-mcp setup gpu
# → Installs onnxruntime-node-gpu
# → Verifies CUDA toolkit
# → Runs test inference
```

**Trade-offs**:
- ✅ Minimal initial install
- ✅ User-controlled GPU setup
- ✅ Better diagnostics
- ⚠️ Extra step for GPU users

**Recommendation**: Use **Option 1** (automatic with optional dependency) for best user experience.

---

### 5. Model Compatibility

**Current Model Structure** (from `curated-models.json`):
```json
{
  "cpuModels": {
    "provider": "onnx-runtime",
    "models": [
      {
        "id": "cpu:xenova-multilingual-e5-small",
        "huggingfaceId": "Xenova/multilingual-e5-small",
        "quantization": "int8"
      }
    ]
  },
  "gpuModels": {
    "provider": "python-sentence-transformers",
    "models": [...]
  }
}
```

**Key Insight**: ONNX models work across all execution providers without modification. The same `model_quantized.onnx` file can be used with CPU, CUDA, DirectML, or CoreML.

**No Changes Needed**:
- ✅ Existing ONNX models (Xenova/multilingual-e5-*) work with all EPs
- ✅ Quantization (int8) compatible with all EPs
- ✅ Model dimensions (384, 1024) unchanged

**Precision Considerations**:

| Provider | FP32 | FP16 | INT8 | Best Performance |
|----------|------|------|------|------------------|
| CPU | ✅ | ❌ | ✅ | INT8 (4x smaller) |
| CUDA | ✅ | ✅ | ✅ | FP16 (2x faster) |
| DirectML | ✅ | ✅ | ✅ | FP16 |
| CoreML | ✅ | ✅ | ❌ | FP16 |

**Future Enhancement**: Add FP16 ONNX models for GPU providers (2x speedup potential).

**Proposed curated-models.json Enhancement**:
```json
{
  "id": "cpu:xenova-multilingual-e5-small",
  "huggingfaceId": "Xenova/multilingual-e5-small",
  "quantization": "int8",
  "supportedProviders": ["cpu", "cuda", "dml", "coreml"],
  "alternativeModels": {
    "fp16": {
      "huggingfaceId": "Xenova/multilingual-e5-small-fp16",
      "quantization": "fp16",
      "supportedProviders": ["cuda", "dml", "coreml"],
      "speedupVsInt8": 1.5,
      "vramRequirementGB": 0.5
    }
  }
}
```

---

### 6. Performance Monitoring & Telemetry

**New Component**: `ExecutionProviderMetrics`
**Location**: `src/infrastructure/embeddings/onnx/execution-provider-metrics.ts`

```typescript
export interface InferenceMetrics {
  provider: string;
  modelId: string;
  batchSize: number;
  tokensProcessed: number;
  inferenceTimeMs: number;
  tokensPerSecond: number;
  firstInference: boolean;  // Includes warm-up overhead
}

export class ExecutionProviderMetrics {
  private metrics: InferenceMetrics[] = [];

  recordInference(metrics: InferenceMetrics): void {
    this.metrics.push(metrics);

    // Log to console for debugging
    if (process.env.ONNX_DEBUG) {
      console.log(`[${metrics.provider}] ${metrics.tokensPerSecond.toFixed(0)} tok/s ` +
                  `(${metrics.tokensProcessed} tokens, ${metrics.inferenceTimeMs}ms)`);
    }
  }

  getAveragePerformance(provider: string): number {
    const providerMetrics = this.metrics.filter(m =>
      m.provider === provider && !m.firstInference
    );

    if (providerMetrics.length === 0) return 0;

    const avgTokPerSec = providerMetrics.reduce((sum, m) =>
      sum + m.tokensPerSecond, 0
    ) / providerMetrics.length;

    return avgTokPerSec;
  }

  getProviderSpeedup(provider: string): number {
    const cpuPerf = this.getAveragePerformance('cpu');
    const providerPerf = this.getAveragePerformance(provider);

    if (cpuPerf === 0) return 1;
    return providerPerf / cpuPerf;
  }
}
```

**Integration with ONNXEmbeddingService**:
```typescript
async processBatch(texts: string[]): Promise<number[][]> {
  const startTime = Date.now();

  // ... existing inference code ...

  const inferenceTime = Date.now() - startTime;
  const tokensProcessed = texts.reduce((sum, t) => sum + this.estimateTokens(t), 0);

  this.metrics.recordInference({
    provider: this.activeProvider,
    modelId: this.options.modelId,
    batchSize: texts.length,
    tokensProcessed,
    inferenceTimeMs: inferenceTime,
    tokensPerSecond: (tokensProcessed / inferenceTime) * 1000,
    firstInference: this.inferenceCount === 1
  });

  return embeddings;
}
```

---

### 7. TUI Integration

**Enhanced Status Display**
**Location**: `src/interfaces/tui-ink/components/StatusPanel.tsx`

```tsx
import { Box, Text } from 'ink';
import React from 'react';

interface ExecutionProviderInfo {
  active: string;
  available: string[];
  speedup: number;
  avgTokPerSec: number;
}

export const StatusPanel: React.FC<{ epInfo: ExecutionProviderInfo }> = ({ epInfo }) => {
  const providerColor = epInfo.active === 'cpu' ? 'yellow' : 'green';

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Execution Provider Status</Text>

      <Box marginTop={1}>
        <Text>Active: </Text>
        <Text color={providerColor} bold>{epInfo.active.toUpperCase()}</Text>
        {epInfo.speedup > 1 && (
          <Text color="green"> ({epInfo.speedup.toFixed(1)}x faster)</Text>
        )}
      </Box>

      <Box>
        <Text>Performance: </Text>
        <Text>{epInfo.avgTokPerSec.toFixed(0)} tokens/sec</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Available: {epInfo.available.join(', ')}</Text>
      </Box>
    </Box>
  );
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal**: Implement execution provider detection and configuration

**Tasks**:
1. ✅ Create `ExecutionProviderDetector` class
   - Platform-specific detection logic
   - Priority ranking algorithm
   - Configuration generation

2. ✅ Enhance `MachineCapabilitiesDetector`
   - Add CUDA toolkit detection
   - Add DirectX 12 check
   - Cache EP availability

3. ✅ Extend configuration system
   - Add EP configuration schema
   - Environment variable support
   - Validation logic

**Deliverables**:
- `execution-provider-detector.ts` (fully functional)
- Unit tests for detection logic (90% coverage)
- Configuration schema documented

---

### Phase 2: ONNX Integration (Week 2)

**Goal**: Enable execution providers in ONNX inference

**Tasks**:
1. ✅ Refactor `ONNXEmbeddingService`
   - Replace Transformers.js with direct ONNX Runtime
   - Implement tokenization manually
   - Session creation with EP configuration

2. ✅ Implement fallback mechanism
   - Try providers in priority order
   - Graceful degradation to CPU
   - Error handling and logging

3. ✅ Add performance metrics
   - `ExecutionProviderMetrics` class
   - Inference timing instrumentation
   - Speedup calculations

**Deliverables**:
- Working GPU acceleration (DirectML, CoreML)
- Performance benchmarks (3-5x speedup verified)
- Integration tests

---

### Phase 3: CUDA Support (Week 3)

**Goal**: Add NVIDIA CUDA acceleration

**Tasks**:
1. ✅ Add optional GPU package
   - Update `package.json`
   - Post-install verification script
   - Installation documentation

2. ✅ Implement CUDA-specific configuration
   - Memory limit management
   - Multi-GPU support (deviceId)
   - cuDNN algorithm selection

3. ✅ Testing on NVIDIA hardware
   - RTX 3060 test (8GB VRAM)
   - RTX 4090 test (24GB VRAM)
   - Performance benchmarking

**Deliverables**:
- CUDA support working (8-12x speedup)
- Installation guide for CUDA users
- Multi-GPU configuration example

---

### Phase 4: User Experience (Week 4)

**Goal**: Surface EP status to users

**Tasks**:
1. ✅ TUI status display
   - Active provider indicator
   - Speedup visualization
   - Available providers list

2. ✅ Startup diagnostics
   - Log EP detection results
   - Warn about missing drivers
   - Suggest optimization tips

3. ✅ Configuration CLI
   - `folder-mcp config ep status` (show active)
   - `folder-mcp config ep test` (benchmark)
   - `folder-mcp config ep set <provider>` (override)

**Deliverables**:
- Enhanced TUI with EP display
- Diagnostic logging
- User documentation

---

## Testing Strategy

### Unit Tests

**Test Coverage**:
- ✅ `ExecutionProviderDetector` (platform mocking)
- ✅ Configuration loading and validation
- ✅ Fallback chain generation
- ✅ Metrics recording and calculations

**Example Test**:
```typescript
describe('ExecutionProviderDetector', () => {
  it('should prioritize CUDA on Windows with NVIDIA GPU', async () => {
    const mockCapabilities: MachineCapabilities = {
      platform: 'win32',
      gpu: { type: 'nvidia', vramGB: 8, cudaVersion: '12.0' },
      cpu: { cores: 8, features: ['AVX2'] },
      memory: { totalRAMGB: 32 }
    };

    const detector = new ExecutionProviderDetector(mockCapabilities);
    const providers = await detector.detectAvailableProviders();

    expect(providers[0].provider).toBe('cuda');
    expect(providers[0].priority).toBe(90);
    expect(providers[1].provider).toBe('dml'); // Fallback
  });
});
```

---

### Integration Tests

**Test Scenarios**:
1. ✅ ONNX session creation with DirectML
2. ✅ Inference with CoreML on Apple Silicon
3. ✅ CUDA inference with memory limits
4. ✅ Fallback from CUDA to DirectML to CPU

**Example Test**:
```typescript
describe('ONNX Execution Providers', () => {
  it('should use DirectML on Windows GPU', async () => {
    const service = new ONNXEmbeddingService({
      modelId: 'cpu:xenova-multilingual-e5-small'
    });

    await service.initialize();

    const result = await service.generateEmbeddings(['test text']);

    expect(service.getActiveProvider()).toBe('dml');
    expect(result.embeddings).toHaveLength(1);
    expect(result.embeddings[0]).toHaveLength(384);
  });
});
```

---

### Performance Tests

**Benchmarks**:
1. ✅ CPU baseline (100 chunks)
2. ✅ DirectML vs CPU
3. ✅ CoreML vs CPU
4. ✅ CUDA vs CPU

**Acceptance Criteria**:
- DirectML: 3-5x faster than CPU
- CoreML: 4-6x faster than CPU
- CUDA: 8-12x faster than CPU

---

## Risk Analysis

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Transformers.js incompatibility | High | High | Use direct ONNX Runtime (Option A) |
| CUDA driver issues | Medium | Medium | Optional dependency, clear error messages |
| CoreML model format issues | Medium | Medium | Use MLProgram format, add detection |
| Performance regression | Low | High | Comprehensive benchmarking, feature flag |
| Windows DirectML instability | Low | Medium | Thorough testing on diverse hardware |

### User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Confusing GPU setup | Medium | Medium | Auto-detection by default, clear docs |
| Silent GPU fallback | Low | Low | Log EP selection prominently |
| Configuration complexity | Low | Medium | Smart defaults, optional overrides |
| Package size bloat | High | Low | Optional dependency for CUDA |

---

## Success Metrics

### Performance Targets

| Platform | Baseline (CPU) | Target (GPU) | Improvement |
|----------|---------------|--------------|-------------|
| Windows NVIDIA | 100 tok/s | 1000+ tok/s | 10x |
| Windows AMD/Intel | 100 tok/s | 350+ tok/s | 3.5x |
| macOS Apple Silicon | 100 tok/s | 500+ tok/s | 5x |
| Linux NVIDIA | 100 tok/s | 1200+ tok/s | 12x |

### User Experience Targets

- ✅ Zero-config GPU acceleration (auto-detect)
- ✅ <5 second cold start (model loading)
- ✅ Visible EP status in TUI
- ✅ <500MB package size increase (CUDA optional)

---

## Documentation Requirements

### User Documentation

1. **Installation Guide**
   - `docs/installation/gpu-setup.md`
   - Platform-specific instructions
   - CUDA toolkit installation
   - Troubleshooting common issues

2. **Configuration Guide**
   - `docs/configuration/execution-providers.md`
   - Auto-detection behavior
   - Manual override instructions
   - Performance tuning tips

3. **Performance Guide**
   - `docs/performance/gpu-acceleration.md`
   - Expected speedups by platform
   - Benchmarking methodology
   - Memory requirements

### Developer Documentation

1. **Architecture Document**
   - `docs/architecture/execution-providers.md`
   - Component diagram
   - Detection algorithm details
   - Extension points

2. **Testing Guide**
   - `docs/testing/execution-provider-tests.md`
   - Test scenarios
   - Hardware requirements for testing
   - CI/CD integration

---

## Open Questions

1. **Should we support TensorRT?**
   - Pros: 30-50% faster than CUDA EP
   - Cons: 5-15 min compilation time, large package size
   - **Recommendation**: Add in v1.2.0 with opt-in flag

2. **FP16 model variants?**
   - Pros: 2x speedup on GPU, smaller file size
   - Cons: Additional model downloads, slight quality loss
   - **Recommendation**: Add FP16 models as "premium" option

3. **Multi-GPU support?**
   - Pros: Parallel inference across GPUs
   - Cons: Complex orchestration, limited user base
   - **Recommendation**: Single GPU in v1.1.0, multi-GPU in v1.3.0

4. **AMD ROCm support?**
   - Pros: AMD GPU acceleration on Linux
   - Cons: Complex setup, limited ONNX support
   - **Recommendation**: Investigate in v1.2.0, implement if viable

---

## Appendix A: Platform Compatibility Matrix

| Platform | CPU | DirectML | CUDA | CoreML | OpenVINO | TensorRT |
|----------|-----|----------|------|--------|----------|----------|
| Windows 11 | ✅ | ✅ | ✅* | ❌ | ✅** | ✅* |
| Windows 10 | ✅ | ✅ | ✅* | ❌ | ✅** | ✅* |
| macOS Intel | ✅ | ❌ | ❌ | ⚠️*** | ❌ | ❌ |
| macOS Apple Silicon | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Linux (Ubuntu) | ✅ | ❌ | ✅* | ❌ | ✅** | ✅* |

**Legend**:
- ✅ Supported
- ✅* Requires additional driver/toolkit installation
- ✅** Requires separate package installation
- ⚠️*** Limited support (no Neural Engine)
- ❌ Not supported

---

## Appendix B: Configuration Examples

### Example 1: Auto-Detection (Default)
```yaml
# ~/.folder-mcp/config.yaml
onnx:
  executionProvider:
    autoDetect: true
```

Result: Uses CUDA if available → DirectML if available → CPU

---

### Example 2: Force CPU (Testing)
```yaml
onnx:
  executionProvider:
    autoDetect: false
    forceProvider: cpu
```

---

### Example 3: CUDA with Memory Limit
```yaml
onnx:
  executionProvider:
    autoDetect: true
    cuda:
      deviceId: 0
      gpuMemLimitGB: 4
      cudnnConvAlgoSearch: EXHAUSTIVE
```

---

### Example 4: CoreML Optimization
```yaml
onnx:
  executionProvider:
    autoDetect: true
    coreml:
      computeUnits: CPU_AND_NE  # Use Neural Engine
```

---

## Appendix C: Performance Benchmarking

### Test Setup

**Hardware**:
- Windows: Intel i7-12700K, RTX 3060 (12GB), 32GB RAM
- macOS: Apple M1 Pro, 16GB unified memory
- Linux: AMD Ryzen 9 5950X, RTX 4090 (24GB), 64GB RAM

**Model**: `Xenova/multilingual-e5-small` (INT8, 384 dims)

**Workload**: 100 chunks of 500 tokens each (50,000 tokens total)

### Expected Results

| Platform | Provider | Tokens/Sec | Time (100 chunks) | Speedup |
|----------|----------|-----------|-------------------|---------|
| Windows | CPU | 100 | 500s | 1.0x |
| Windows | DirectML | 350 | 143s | 3.5x |
| Windows | CUDA | 1000 | 50s | 10.0x |
| macOS M1 Pro | CPU | 120 | 417s | 1.0x |
| macOS M1 Pro | CoreML | 600 | 83s | 5.0x |
| Linux | CPU | 100 | 500s | 1.0x |
| Linux | CUDA | 1200 | 42s | 12.0x |

---

## Conclusion

This implementation design provides a comprehensive roadmap for integrating ONNX Runtime execution providers into folder-mcp with minimal disruption to the existing architecture. The phased approach ensures we can validate each component before moving to the next, while the auto-detection strategy maintains the zero-configuration philosophy that makes folder-mcp easy to use.

**Key Takeaways**:
1. ✅ Minimal installation impact (optional CUDA dependency)
2. ✅ No changes needed to existing models
3. ✅ Clean architecture preserved (new components in infrastructure layer)
4. ✅ Graceful degradation ensures reliability
5. ✅ Performance gains significant (3-12x speedup)

**Next Steps**:
1. Review this design with stakeholders
2. Begin Phase 1 implementation (detection layer)
3. Set up test environments for each platform
4. Create performance benchmarking suite
