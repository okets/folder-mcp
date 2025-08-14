# Windows Testing Guide for TMOAT Tests (RTX 3080)

This guide provides step-by-step instructions for running folder-mcp TMOAT tests on Windows with RTX 3080 GPU using GitHub Copilot assistance.

## Prerequisites

### Your Setup (Already Complete)
- ✅ Repository cloned and IDE synced with origin/main
- ✅ RTX 3080 GPU (excellent for NVIDIA CUDA testing)
- ✅ Windows machine ready

### Additional Setup Needed

#### 1. Sync to Phase 8 Branch
```bash
# In your existing folder-mcp directory
git fetch origin
git checkout phase-8-task-11.5
git pull origin phase-8-task-11.5
```

#### 2. Node.js Version Check
```bash
# Verify Node.js 18+ is installed
node --version
npm --version
```

## Environment Setup

### 1. Install Dependencies
```bash
# Install all npm dependencies
npm install

# Verify TypeScript compilation works
npm run build
```

### 2. Create Required Directories
```bash
# Create test cache directories (Windows paths)
mkdir tests\fixtures\tmp
mkdir tests\fixtures\tmp\onnx-cache
mkdir tests\fixtures\tmp\machine-capabilities-cache
```

### 3. Windows-Specific Environment Variables
```powershell
# Set environment variables for testing (PowerShell)
$env:FOLDER_MCP_DEVELOPMENT_ENABLED = "true"
$env:NODE_ENV = "test"

# For Command Prompt instead:
set FOLDER_MCP_DEVELOPMENT_ENABLED=true
set NODE_ENV=test
```

## Running TMOAT Tests

### Phase A Sprint Tests (All 5 Required)

#### 1. Sprint A1: Model System Verification
```bash
# Test machine capabilities detection and model evaluation
npm test -- tests/domain/models/model-system.tmoat.test.ts

# Expected results:
# ✅ Machine capabilities detected (Windows-specific: no Metal, may have NVIDIA/AMD GPU)
# ✅ Curated models loaded (3 GPU + 2 ONNX models)
# ✅ Language scoring works (78+ languages supported)
# ✅ Model recommendations based on detected hardware
```

#### 2. Sprint A2: ONNX Integration
```bash
# Test ONNX model downloading and embedding generation
npm test -- tests/infrastructure/embeddings/onnx/onnx.tmoat.test.ts

# Expected results:
# ✅ Downloads Xenova/multilingual-e5-small (~120MB)
# ✅ Generates 384-dimension embeddings
# ✅ Handles multiple languages correctly
# ✅ Performance benchmarks (Windows may be different from Mac)

# Note: First run downloads model, subsequent runs use cache
# Download location: %USERPROFILE%\.cache\folder-mcp\onnx-models\
```

#### 3. Sprint A3: Model Download Management
```bash
# Test global model download coordination
npm test -- tests/application/model-download-management.tmoat.test.ts

# Expected results:
# ✅ Prevents duplicate downloads across folders
# ✅ Progress tracking works correctly
# ✅ Auto-redownload when models missing
# ✅ FMDM status broadcasting
```

#### 4. Sprint A4: Ollama Integration
```bash
# Test Ollama detection (works without Ollama installed)
npm test -- tests/infrastructure/ollama/ollama.tmoat.test.ts

# Expected results:
# ✅ Handles Ollama offline gracefully (expected on fresh Windows)
# ✅ Assisted mode never includes Ollama models
# ✅ Manual mode attempts detection
# ✅ Provides installation guidance when Ollama not found
```

#### 5. Sprint A5: Architecture Fixes
```bash
# Test the new intelligent recommendations architecture
npm test -- tests/domain/models/intelligent-recommendations.tmoat.test.ts

# Expected results:
# ✅ No ollamaModels in curated config
# ✅ Hardware acts as binary filter (not scored)
# ✅ Scoring: Language 60%, Accuracy 32%, Speed 8%
# ✅ Clean architecture separation
```

### Run All TMOAT Tests at Once
```bash
# Run complete TMOAT suite (Backend Completion Gate)
npm test -- tests/**/*.tmoat.test.ts

# Should show 5 test suites passing:
# ✅ model-system.tmoat.test.ts
# ✅ onnx.tmoat.test.ts  
# ✅ model-download-management.tmoat.test.ts
# ✅ ollama.tmoat.test.ts
# ✅ intelligent-recommendations.tmoat.test.ts
```

## Windows-Specific Expected Differences

### 1. Machine Capabilities Detection
**Mac Results:**
```json
{
  "gpu": { "type": "integrated", "name": "Apple M3 GPU", "metalSupport": true },
  "cpu": { "manufacturer": "Apple", "brand": "Apple M3" }
}
```

**Your RTX 3080 Expected Results:**
```json
{
  "gpu": { 
    "type": "discrete", 
    "name": "NVIDIA GeForce RTX 3080", 
    "vramGB": 10,
    "cudaVersion": "12.x"
  },
  "cpu": { "manufacturer": "Intel/AMD", "brand": "..." }
}
```

### 2. ONNX Performance (RTX 3080 Advantage)
- **Mac M3**: ~300-650 tokens/sec (Metal acceleration)
- **RTX 3080**: ~400-800 tokens/sec (CUDA acceleration - potentially faster!)
- **Expected**: Your RTX 3080 should match or exceed Mac performance

### 3. File Paths
- **Mac**: `/Users/username/.cache/folder-mcp/`
- **Windows**: `C:\Users\username\.cache\folder-mcp\`
- **Tests should handle both automatically**

## Troubleshooting Common Windows Issues

### Issue 1: PowerShell Execution Policy
```powershell
# If you get execution policy errors:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 2: Long Path Names
```bash
# Enable long path support (run as Administrator)
git config --system core.longpaths true
```

### Issue 3: ONNX Download Fails
```bash
# Check internet connection and try manual download test:
curl -L "https://huggingface.co/Xenova/multilingual-e5-small/resolve/main/onnx/model_quantized.onnx" -o test-download.onnx
```

### Issue 4: Node.js Memory Issues
```bash
# Increase Node.js memory limit if needed:
set NODE_OPTIONS="--max-old-space-size=4096"
npm test -- tests/**/*.tmoat.test.ts
```

## Expected Test Output on Windows

### Expected Successful Run Output (RTX 3080):
```
✅ Machine capabilities detected: [CPU], NVIDIA RTX 3080 (10GB VRAM)
✅ ONNX model downloaded: 125MB in 30-45 seconds
✅ Embeddings generated: 384 dimensions, normalized
✅ Language scoring: 78 languages, proper weights (60/32/8)
✅ Hardware filtering: GPU compatible models prioritized (RTX 3080 excellent)
✅ Model recommendations: All GPU models compatible (10GB VRAM >> 4GB requirement)
✅ Ollama detection: Offline handled gracefully

 Test Files  5 passed (5)  
      Tests  47 passed (47)
   Duration  6-8 minutes (RTX 3080 should be faster than Mac)

NVIDIA-Specific Success Indicators:
✅ CUDA version detected
✅ 10GB VRAM recognized 
✅ All GPU models show as compatible
✅ Potentially faster performance than Mac M3
```

## GitHub Copilot Assistance Commands

When working with GitHub Copilot on Windows, use these specific prompts:

### For Debugging Test Failures:
```
// GitHub Copilot prompt:
"Help me debug this TMOAT test failure on Windows. The test is failing at [specific line]. 
Looking at the error: [paste error message]. 
This is testing [model compatibility/ONNX downloads/machine capabilities] functionality.
What Windows-specific issues might cause this?"
```

### For Environment Setup Issues:
```
// GitHub Copilot prompt:
"I'm setting up folder-mcp TMOAT tests on Windows. I need help with [npm install/path issues/environment variables]. 
The project uses TypeScript, Vitest, and downloads ML models via ONNX.
What Windows-specific setup steps am I missing?"
```

### For Performance Analysis:
```
// GitHub Copilot prompt:
"Compare these TMOAT test performance results between Mac and Windows:
Mac: [paste results]
Windows: [paste results]
Are these performance differences normal for ML model operations on Windows vs Mac?"
```

## RTX 3080 Testing Benefits

This RTX 3080 Windows testing provides unique validation opportunities:

### 🚀 NVIDIA GPU Testing
- **10GB VRAM**: Tests high-end GPU compatibility (far exceeds 4GB requirements)
- **CUDA Support**: Validates NVIDIA CUDA detection vs Apple Metal
- **Discrete GPU**: Tests dedicated graphics vs integrated Apple Silicon
- **Performance Baseline**: RTX 3080 may outperform Mac M3 for ML workloads

### 🎯 Architecture Validation
- **Hardware Binary Filter**: RTX 3080 should pass all GPU model compatibility checks
- **Model Recommendations**: All GPU models should be "Excellent choice" with 10GB VRAM
- **Scoring Verification**: Language 60% should still prioritize, but hardware won't limit options
- **Cross-Platform**: Validates systeminformation package works on high-end Windows hardware

### 📊 Expected Advantages Over Mac Testing
- **Higher VRAM**: 10GB vs Mac's unified memory approach
- **CUDA Ecosystem**: Different from Metal, tests broader GPU support
- **Performance**: RTX 3080 could show faster ONNX processing than Mac M3
- **Real-World**: Tests on gaming/workstation hardware vs Apple Silicon

## Architecture Validation Checklist

After running all tests, verify these architectural fixes are working:

### ✅ Ollama Clean Architecture
- [ ] No `ollamaModels` section in curated-models.json
- [ ] Ollama detection returns basic info only (no language data)
- [ ] Assisted mode never shows Ollama models

### ✅ Hardware Binary Filter  
- [ ] Incompatible models get score=0
- [ ] Hardware reasons shown but not scored
- [ ] Compatible models proceed to full scoring

### ✅ Scoring Weights (60/32/8)
- [ ] Language compatibility gets 60% weight
- [ ] Accuracy (MTEB) gets 32% weight  
- [ ] Speed gets 8% weight
- [ ] Total scores ≤ 100 points

### ✅ RTX 3080 Windows Compatibility
- [ ] Machine capabilities detect RTX 3080 correctly (10GB VRAM, CUDA)
- [ ] All GPU models show as compatible (excellent hardware)
- [ ] ONNX models download and work on Windows
- [ ] Performance matches or exceeds Mac M3 benchmarks
- [ ] File paths use Windows conventions
- [ ] All 5 TMOAT suites pass completely

## Next Steps After Testing

1. **Document Results**: Note any Windows-specific performance differences
2. **Report Issues**: If tests fail, capture full error output and system specs
3. **Verify Architecture**: Confirm the 60/32/8 scoring works as expected
4. **Performance Baseline**: Record Windows performance benchmarks for comparison

This completes the Windows testing validation for Phase 8 Task 11.5 architectural improvements!