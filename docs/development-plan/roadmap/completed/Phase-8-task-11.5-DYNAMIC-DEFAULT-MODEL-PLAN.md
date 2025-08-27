# Step 11: Dynamic Default Model Selection Implementation Plan

## Core Principle: **NO HARDCODED MODEL NAMES ANYWHERE**

### Overview
Implement a dynamic default model selection system that:
- Removes all hardcoded model names from the codebase
- Selects optimal default models based on hardware capabilities
- Caches default model selection in the configuration system
- Skips Python checks entirely on machines without GPUs
- Falls back to smallest CPU model from curated-models.json

---

## 1. Remove Static Default Model System

### Files to Update:
- **`src/config/curated-models.json`**
  - Remove `"isDefault": true` from `gpu:bge-m3`
  
- **`src/config/model-registry.ts`**
  - Replace static `getDefaultModelId()` with dynamic lookup
  - Add `setDynamicDefaultModel(modelId: string)` method
  - Keep minimal fallback using smallest CPU model finder

### Implementation:
```typescript
// Replace current getDefaultModelId() logic
export function getDefaultModelId(): string {
    // Read from configuration cache first
    const cached = readCachedDefaultModel();
    if (cached) return cached;
    
    // Fallback: find smallest CPU model
    return findSmallestCpuModel();
}

function findSmallestCpuModel(): string {
    const config = loadCuratedModels();
    const cpuModels = config.cpuModels.models;
    const smallest = cpuModels.sort((a, b) => a.modelSizeMB - b.modelSizeMB)[0];
    return smallest?.id || 'cpu:xenova-multilingual-e5-small'; // Last resort
}
```

---

## 2. Create Dynamic Default Model Selection Service

### New File: `src/daemon/services/default-model-selector.ts`

```typescript
export interface DefaultModelSelection {
  modelId: string;
  selectedAt: string;
  selectionReason: string;
  hardwareProfile: {
    hasGPU: boolean;
    gpuType?: string;
    totalRAM: number;
    pythonAvailable: boolean;
  };
}

export class DefaultModelSelector {
  async determineOptimalDefault(): Promise<DefaultModelSelection> {
    // 1. Detect hardware capabilities
    const capabilities = await this.capabilitiesDetector.detectCapabilities();
    
    // 2. Skip Python entirely if no GPU
    let pythonAvailable = false;
    if (capabilities.gpu.type !== 'none') {
      pythonAvailable = await this.checkPythonAvailability();
    }
    
    // 3. Select best model based on capabilities
    const modelId = await this.selectBestModel(capabilities, pythonAvailable);
    
    // 4. Return selection with metadata
    return {
      modelId,
      selectedAt: new Date().toISOString(),
      selectionReason: this.buildSelectionReason(capabilities, pythonAvailable),
      hardwareProfile: {
        hasGPU: capabilities.gpu.type !== 'none',
        gpuType: capabilities.gpu.type,
        totalRAM: capabilities.memory.totalRAMGB,
        pythonAvailable
      }
    };
  }
  
  private async selectBestModel(capabilities: MachineCapabilities, pythonAvailable: boolean): Promise<string> {
    if (capabilities.gpu.type !== 'none' && pythonAvailable) {
      // GPU + Python: Select best GPU model
      return this.selectBestGpuModel(capabilities);
    } else {
      // CPU only or no Python: Select best CPU model
      return this.selectBestCpuModel(capabilities);
    }
  }
}
```

---

## 3. Add Configuration Persistence

### Update: `src/config/ConfigurationComponent.ts`

```typescript
// Add methods to persist/retrieve default model
async getDefaultModel(): Promise<string> {
    // Try configuration cache first
    const cached = await this.get('system.defaultModel.modelId');
    if (cached) return cached;
    
    // Fallback to smallest CPU model
    return findSmallestCpuModel();
}

async setDefaultModel(selection: DefaultModelSelection): Promise<void> {
    await this.set('system.defaultModel', selection);
}

async getDefaultModelSelection(): Promise<DefaultModelSelection | null> {
    return await this.get('system.defaultModel');
}
```

---

## 4. Optimize Hardware Detection and Python Checking

### Update: `src/daemon/services/model-cache-checker.ts`

```typescript
async checkCuratedModels(): Promise<ModelCheckResult> {
    const models: CuratedModelInfo[] = [];
    let status: ModelCheckStatus = {
        pythonAvailable: false,
        gpuModelsCheckable: false,
        checkedAt: new Date().toISOString()
    };
    
    try {
        // Always check CPU/ONNX models first (fast, no Python required)
        const cpuModels = await this.checkCPUModels();
        models.push(...cpuModels);
        
        // CRITICAL: Check hardware BEFORE attempting Python
        const capabilities = await this.capabilitiesDetector.detectCapabilities();
        
        if (capabilities.gpu.type === 'none') {
            // No GPU: Skip Python checks entirely
            this.logger.info('No GPU detected, skipping Python model checks');
            const defaultGpuModels = this.getDefaultGPUModels();
            models.push(...defaultGpuModels);
        } else {
            // GPU detected: Try GPU models with timeout protection
            const gpuResult = await this.checkGPUModelsWithTimeout();
            
            if (gpuResult.success) {
                models.push(...gpuResult.models);
                status.pythonAvailable = true;
                status.gpuModelsCheckable = true;
            } else {
                const defaultGpuModels = this.getDefaultGPUModels();
                models.push(...defaultGpuModels);
                if (gpuResult.error) {
                    status.error = gpuResult.error;
                }
            }
        }
        
    } catch (error) {
        // Handle errors...
    }
    
    return { models, status };
}
```

---

## 5. Integrate into Daemon Startup

### Update: `src/daemon/index.ts`

```typescript
private async initializeCuratedModels(loggingService: any): Promise<void> {
    try {
        // 1. Check model status (with hardware-aware Python checking)
        const checker = new ModelCacheChecker(loggingService, createPythonEmbeddingService, createONNXDownloader);
        const result = await checker.checkCuratedModels();
        
        this.fmdmService!.setCuratedModelInfo(result.models, result.status);
        
        // 2. Select optimal default model based on capabilities
        const defaultSelector = new DefaultModelSelector(
            new MachineCapabilitiesDetector(),
            checker,
            loggingService
        );
        
        const defaultSelection = await defaultSelector.determineOptimalDefault();
        
        // 3. Update configuration with new default
        const configComponent = this.container!.resolve(CONFIG_TOKENS.CONFIGURATION_COMPONENT);
        await configComponent.setDefaultModel(defaultSelection);
        
        // 4. Update model registry
        setDynamicDefaultModel(defaultSelection.modelId);
        
        loggingService.info(`Selected default model: ${defaultSelection.modelId} (${defaultSelection.selectionReason})`);
        
    } catch (error) {
        // Fallback handling...
    }
}
```

---

## 6. Clean Up All Hardcoded Model Names

### Files to Clean:
1. **`src/daemon/services/monitored-folders-orchestrator.ts`**
   - Replace `'nomic-embed-text'` with `getDefaultModelId()`
   - Replace `'BAAI/bge-m3'` in Python service init

2. **`src/daemon/services/fmdm-service.ts`**
   - Replace `getDefaultModels()` array with dynamic lookup

3. **All TUI components and demo files**
   - Replace `'nomic-embed-text'` references with dynamic defaults

4. **Configuration files**
   - Replace hardcoded model examples with template placeholders

### Search and Replace Pattern:
```bash
# Find all hardcoded model names
grep -r "nomic-embed-text\|BAAI/bge-m3\|gpu:bge-m3" src/
# Replace with getDefaultModelId() calls or dynamic lookups
```

---

## 7. Update Model Recommendation System

### Ensure Consistency:
- Both default selection and model recommendations should skip Python on non-GPU machines
- Share hardware detection results between systems
- Apply the same "no GPU = no Python" rule to recommendations

---

## Implementation Order:

1. **Phase 1: Foundation**
   - Create `DefaultModelSelector` service
   - Add configuration persistence methods
   - Update model registry for dynamic defaults

2. **Phase 2: Hardware Optimization**
   - Add GPU check before Python in `ModelCacheChecker`
   - Integrate default selection into daemon startup
   - Remove `"isDefault": true` from curated-models.json

3. **Phase 3: Cleanup**
   - Search and replace all hardcoded model names
   - Update fallback logic throughout codebase
   - Test with various hardware configurations

4. **Phase 4: Validation**
   - TMOAT tests for different hardware profiles
   - Verify no Python loading on CPU-only machines
   - Confirm optimal defaults for each machine type

---

## Expected Results:

✅ **No hardcoded model names anywhere**  
✅ **Fast startup on CPU-only machines (no Python attempts)**  
✅ **Optimal default model per machine type**  
✅ **Persistent default selection across restarts**  
✅ **Dynamic fallback to smallest CPU model**  
✅ **Clean, maintainable codebase**

This implementation ensures the system automatically adapts to any hardware configuration while maintaining zero hardcoded dependencies on specific model names.