# AMD Windows Testing Guide - GPU Validation

**IMPORTANT: This guide is for Windows machines with AMD GPUs (both integrated and discrete). Follow every step exactly.**

## What This Tests

This validates the enhanced AMD GPU detection system that supports:
- **Discrete AMD GPUs**: RX 7000/6000 series, Vega, legacy R9/R7 cards
- **Integrated AMD Graphics**: Vega 8/11, APU graphics with shared memory
- **Legacy ATI**: Pre-AMD acquisition cards
- **VRAM Detection**: Proper handling of dedicated vs shared memory

## Step 1: Initial Setup

### 1.1 Open PowerShell as Administrator
- Press `Win + X`
- Select "Windows PowerShell (Admin)"

### 1.2 Navigate to Project
```powershell
cd C:\ThinkingHomes\folder-mcp
```

### 1.3 Get Latest AMD Detection Enhancements
```powershell
git fetch origin
git checkout phase-8-task-11.5
git pull origin phase-8-task-11.5
```

## Step 2: Environment Setup

### 2.1 Check Node.js Version
```powershell
node --version
npm --version
```
**Required**: Node.js 18+ and npm 8+

### 2.2 Set Memory Limit (CRITICAL for Windows)
```powershell
$env:NODE_OPTIONS = "--max-old-space-size=4096"
```

### 2.3 Clean and Install Dependencies
```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

## Step 3: Build Test

### 3.1 Build with AMD Enhancements
```powershell
npm run build
```

**Expected Result**: No errors, should complete in 30-60 seconds

**If Build Fails**: Save the error to a file:
```powershell
npm run build 2>&1 | Out-File -FilePath "build-error.log"
```
Then STOP and report the build-error.log contents.

## Step 4: AMD GPU Detection Test

### 4.1 Run AMD Debug Script
```powershell
node scripts/debug-amd-detection.cjs 2>&1 | Tee-Object -FilePath "amd-debug.log"
```

**Purpose**: This investigates AMD GPU detection on your Windows system

### 4.2 Check AMD Detection Results
Look for these critical sections in the output:

**Controllers Analysis**: Should show your AMD GPU details:
```
Controller X:
  model: "AMD Radeon RX 6600 XT"  # Or your AMD GPU
  vendor: "Advanced Micro Devices, Inc."
  vram: 8192
```

**Detection Tests**: Should show positive AMD matches:
```
AMD Detection tests:
  vendor.includes('amd'): true
  model.includes('radeon'): true
  model.includes('rx'): true
```

**Classification**: Should correctly identify discrete vs integrated:
```
Classified as: DISCRETE  # or INTEGRATED for APU graphics
```

### 4.3 Test AMD Detection Logic
```powershell
node scripts/test-amd-detection.cjs 2>&1 | Tee-Object -FilePath "amd-test-results.log"
```

**Expected Results**:
- All AMD test cases should pass (✅)
- Pattern coverage should be 100%
- No false positives for Intel/NVIDIA GPUs

## Step 5: Hardware Capabilities Test

### 5.1 Test AMD GPU Recognition
```powershell
npm test -- tests/domain/models/model-system.tmoat.test.ts 2>&1 | Tee-Object -FilePath "amd-hardware-test.log"
```

### 5.2 Verify AMD Detection Results
Look for lines like:
```
✅ Detected capabilities: {
  gpu: 'amd',
  gpuName: 'AMD Radeon RX 6600 XT',  # Your AMD GPU
  vram: 8,                           # Or your VRAM amount
  rocmSupport: false
}
```

**CRITICAL Validation Points**:
- `gpu: 'amd'` (not 'none' or 'nvidia')
- Correct GPU name detected
- Proper VRAM amount:
  - **Discrete AMD**: Should match actual VRAM (4GB, 8GB, 16GB, etc.)
  - **Integrated AMD**: Should show 1-2GB (estimated shared memory)

## Step 6: AMD-Specific Scenarios

### 6.1 Integrated AMD Graphics Test (APU Systems)
If you have AMD APU with integrated graphics, verify:
```
Expected for AMD Vega 8/11 Graphics:
- gpu: 'amd'
- vram: 1-2GB (based on system RAM)
- Classified as integrated, not discrete
```

### 6.2 Discrete AMD Graphics Test
If you have discrete AMD GPU, verify:
```
Expected for RX 7800 XT, RX 6600 XT, etc.:
- gpu: 'amd'  
- vram: Actual dedicated VRAM (8GB, 16GB, etc.)
- Classified as discrete
```

### 6.3 Legacy AMD/ATI Test
If you have older AMD/ATI cards, verify:
```
Expected for R9 390X, HD 7970, etc.:
- gpu: 'amd'
- Proper vendor detection (ATI Technologies Inc.)
- Reasonable VRAM estimate
```

## Step 7: Run Full TMOAT Test Suite

### 7.1 Run All Tests with AMD Detection
```powershell
npm test -- tests/**/*.tmoat.test.ts 2>&1 | Tee-Object -FilePath "amd-tmoat-results.log"
```

**Expected Duration**: 6-8 minutes
**Expected Result**: All 49 tests should pass with AMD GPU properly detected

### 7.2 Check for AMD-Compatible Models
In the test output, look for:
```
✅ AMD GPU models marked as compatible
✅ Scoring weights properly applied (Language 60%, Accuracy 32%, Speed 8%)
✅ Hardware filtering working correctly
```

## Step 8: Performance Validation

### 8.1 ONNX Performance Test
```powershell
npm test -- tests/infrastructure/embeddings/onnx/onnx.tmoat.test.ts 2>&1 | Tee-Object -FilePath "amd-onnx-test.log"
```

### 8.2 Expected AMD Performance
Look for performance metrics:
```
✅ Performance Test: {
  avgProcessingTime: 'Xms',
  estimatedTokensPerSec: XXXX
}
```

**AMD Performance Expectations**:
- **High-end AMD (RX 7900/6900)**: 600-1000 tokens/sec
- **Mid-range AMD (RX 7800/6800)**: 400-600 tokens/sec  
- **Entry-level AMD (RX 6600)**: 300-500 tokens/sec
- **Integrated AMD**: 100-200 tokens/sec

## Step 9: Create AMD Test Summary

### 9.1 Create Summary File
```powershell
@"
# AMD Windows Test Results - $(Get-Date)

## System Info
- OS: $((Get-WmiObject -class Win32_OperatingSystem).Caption)
- GPU: $((Get-WmiObject -class Win32_VideoController | Where-Object {$_.Name -like "*AMD*" -or $_.Name -like "*Radeon*" -or $_.Name -like "*ATI*"}).Name)
- RAM: $([math]::Round((Get-WmiObject -class Win32_ComputerSystem).TotalPhysicalMemory/1GB,1))GB
- Node.js: $(node --version)

## AMD Test Results Summary
"@ | Out-File -FilePath "AMD-TEST-SUMMARY.md"
```

### 9.2 Add Test Status
```powershell
@"

### Build Test
- Status: [PASS/FAIL]
- Duration: [X seconds]

### AMD GPU Detection
- GPU Detected: [amd/other]
- GPU Model: [Your AMD GPU name]
- VRAM Detected: [XGB]
- GPU Type: [DISCRETE/INTEGRATED]
- Status: [PASS/FAIL]

### TMOAT Tests (49 total)
- Status: [X passed, Y failed]
- Duration: [X minutes]

### ONNX Performance
- Model Downloaded: [YES/NO]
- AMD Performance: [X tokens/sec]
- Status: [PASS/FAIL]

### Architecture Validation
- Scoring Weights Correct: [YES/NO]
- AMD Models Compatible: [YES/NO]
- Status: [PASS/FAIL]

## AMD-Specific Results
- Discrete vs Integrated: [Correct classification]
- VRAM Estimation: [Accurate for GPU type]
- Legacy ATI Support: [If applicable]

## Performance Comparison
- AMD Performance: [X tokens/sec]
- Expected Range: [Based on GPU tier]
- vs RTX 3080: [Comparison if available]

## Issues Found
[List any failures or unexpected results]
"@ | Add-Content -Path "AMD-TEST-SUMMARY.md"
```

## Step 10: Report Results

### 10.1 Fill in the Summary
Edit `AMD-TEST-SUMMARY.md` and replace all `[...]` placeholders with actual results.

### 10.2 Commit Results
```powershell
git add AMD-TEST-SUMMARY.md
git add *.log
git commit -m "AMD Windows testing results

- Hardware: [Your AMD GPU]
- Tests: [X/49] passed  
- Performance: [X] tokens/sec
- GPU Detection: [PASS/FAIL]

🤖 Generated with Windows AMD testing automation"
```

## Success Criteria

✅ **PASS**: AMD GPU detected with correct type ('amd')
✅ **PASS**: Proper VRAM detection (dedicated or shared)
✅ **PASS**: Correct discrete vs integrated classification  
✅ **PASS**: All 49 TMOAT tests pass
✅ **PASS**: ONNX performance within expected range
✅ **PASS**: AMD models marked as compatible

## Troubleshooting

### If AMD GPU Not Detected:
1. Check AMD drivers are installed:
```powershell
Get-WmiObject -class Win32_VideoController | Where-Object {$_.Name -like "*AMD*" -or $_.Name -like "*Radeon*"}
```

2. Verify AMD GPU shows in Device Manager

3. Check the debug output for detection failures

### If Performance Is Low:
- Ensure AMD GPU drivers are up to date
- Check if integrated graphics is being used instead of discrete
- Verify system isn't in power saving mode

### If Tests Fail:
- Check for AMD-specific error patterns in logs
- Verify build completed successfully
- Ensure proper Node.js memory limits set

## AMD vs NVIDIA Comparison

This testing validates that AMD Windows systems get the same quality GPU detection as NVIDIA systems like the RTX 3080. Both should:
- Detect GPU type correctly
- Report accurate VRAM
- Classify discrete vs integrated properly
- Show comparable performance for similar GPU tiers

**Total expected time**: 10-15 minutes for full AMD validation