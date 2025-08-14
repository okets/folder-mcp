# Windows Testing Guide - RTX 3080 Validation

**IMPORTANT: This guide is for a Windows machine with RTX 3080 GPU. Follow every step exactly.**

## Step 1: Initial Setup

### 1.1 Open PowerShell as Administrator
- Press `Win + X`
- Select "Windows PowerShell (Admin)"

### 1.2 Navigate to Project
```powershell
cd C:\ThinkingHomes\folder-mcp
```

### 1.3 Check Branch
```powershell
git status
```
**Expected output**: Should show you're on `phase-8-task-11.5` branch

If not on correct branch:
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

### 3.1 Test TypeScript Build
```powershell
npm run build
```

**Expected Result**: No errors, should complete in 30-60 seconds

**If Build Fails**: Save the error to a file:
```powershell
npm run build 2>&1 | Out-File -FilePath "build-error.log"
```
Then STOP and report the build-error.log contents.

## Step 4: Debug GPU Detection Issue

### 4.1 Run GPU Debug Script (CRITICAL for RTX 3080)
```powershell
node tmp/debug-gpu-detection.js 2>&1 | Tee-Object -FilePath "gpu-debug.log"
```

**Purpose**: This investigates why RTX 3080 shows as `gpu: 'none'` instead of `gpu: 'nvidia'`

### 4.2 Check Debug Output
Look for these critical lines in the output:
```
Controllers analysis:
  Controller 0:
    model: "NVIDIA GeForce RTX 3080"
    vendor: "NVIDIA"
    vram: [NUMBER]
```

**CRITICAL**: If model/vendor don't contain "NVIDIA" or "RTX", that's why detection fails.

### 4.3 Share Debug Results
Save the debug output - we may need to fix the detection logic based on this:
```powershell
Write-Output "GPU Debug Results for RTX 3080:" | Add-Content -Path "WINDOWS-TEST-SUMMARY.md"
Get-Content "gpu-debug.log" | Add-Content -Path "WINDOWS-TEST-SUMMARY.md"
```

### 4.4 Apply Windows GPU Fix (If Needed)
If the debug shows RTX 3080 is not detected as NVIDIA, apply the fix:
```powershell
node tmp/fix-windows-gpu-detection.js
npm run build
```

**Expected Result**: Should see "✅ Windows GPU detection fix applied successfully"

### 4.5 Re-test GPU Detection
After applying the fix, test again:
```powershell
node tmp/debug-gpu-detection.js 2>&1 | Tee-Object -FilePath "gpu-debug-fixed.log"
```

**Expected Result**: Should now show RTX 3080 detected as NVIDIA with proper VRAM.

## Step 5: Run TMOAT Tests

### 5.1 Run All TMOAT Tests
```powershell
npm test -- tests/**/*.tmoat.test.ts 2>&1 | Tee-Object -FilePath "tmoat-results.log"
```

**Expected Duration**: 6-8 minutes
**Expected Result**: 4 test files, 49 tests passed

### 5.2 Check Test Results
Look at the bottom of output for:
```
Test Files  4 passed (4)
     Tests  49 tests passed (49)
```

## Step 6: Hardware Detection Test

### 5.1 Run Specific Hardware Test
```powershell
npm test -- tests/domain/models/model-system.tmoat.test.ts 2>&1 | Tee-Object -FilePath "hardware-detection.log"
```

### 5.2 Look for RTX 3080 Detection
In the output, find a line like:
```
✅ Detected capabilities: {
  gpu: 'nvidia',
  vram: 10,
  cpu: 'X cores',
  memory: 'XGB RAM'
}
```

**CRITICAL**: Verify it shows:
- `gpu: 'nvidia'` (not 'none' or 'apple')
- `vram: 10` (your RTX 3080's 10GB VRAM)

## Step 6: ONNX Download Test

### 6.1 Run ONNX Test
```powershell
npm test -- tests/infrastructure/embeddings/onnx/onnx.tmoat.test.ts 2>&1 | Tee-Object -FilePath "onnx-test.log"
```

### 6.2 Monitor Download Progress
Watch for lines like:
```
📥 Download progress: X% (XMB)
✅ Successfully downloaded E5-Small ONNX (Most Popular) (120MB)
```

**Expected**: ~120MB download, should complete in 2-4 minutes on good internet

## Step 7: Performance Validation

### 7.1 Look for Performance Numbers
In onnx-test.log, find lines like:
```
✅ Performance Test: {
  avgProcessingTime: 'Xms',
  estimatedTokensPerSec: XXXX
}
```

**Expected RTX 3080 Performance**: 400-800 tokens/sec (should match or exceed Mac performance)

## Step 8: Architecture Validation

### 8.1 Run Architecture Test
```powershell
npm test -- tests/domain/models/intelligent-recommendations.tmoat.test.ts 2>&1 | Tee-Object -FilePath "architecture-test.log"
```

### 8.2 Verify Scoring Weights
Look for:
```
✅ Detailed scoring analysis: [
  {
    modelName: 'MiniLM-L12 (Fast)',
    languagePoints: X.X,
    accuracyPoints: X.X,
    speedPoints: X.X
  }
]
```

**CRITICAL**: Verify language points are highest (~40-60), accuracy points are medium (~20-32), speed points are lowest (~5-8).

## Step 9: Create Results Summary

### 9.1 Create Summary File
```powershell
@"
# Windows RTX 3080 Test Results - $(Get-Date)

## System Info
- OS: $((Get-WmiObject -class Win32_OperatingSystem).Caption)
- GPU: $((Get-WmiObject -class Win32_VideoController | Where-Object {$_.Name -like "*RTX*"}).Name)
- RAM: $([math]::Round((Get-WmiObject -class Win32_ComputerSystem).TotalPhysicalMemory/1GB,1))GB
- Node.js: $(node --version)

## Test Results Summary
"@ | Out-File -FilePath "WINDOWS-TEST-SUMMARY.md"
```

### 9.2 Add Test Status to Summary
```powershell
@"

### Build Test
- Status: [PASS/FAIL]
- Duration: [X seconds]

### TMOAT Tests (49 total)
- Status: [X passed, Y failed]
- Duration: [X minutes]

### Hardware Detection
- GPU Detected: [nvidia/other]
- VRAM Detected: [10GB/other]
- Status: [PASS/FAIL]

### ONNX Download
- Model Downloaded: [YES/NO]
- Download Size: [~120MB/other]
- Performance: [X tokens/sec]
- Status: [PASS/FAIL]

### Architecture Validation
- Scoring Weights Correct: [YES/NO]
- Ollama Separation: [YES/NO]
- Status: [PASS/FAIL]

## Issues Found
[List any failures or unexpected results]

## Performance Comparison
- RTX 3080 Performance: [X tokens/sec]
- Expected Mac M3: [300-650 tokens/sec]
- RTX 3080 Advantage: [X% faster/slower]
"@ | Add-Content -Path "WINDOWS-TEST-SUMMARY.md"
```

## Step 10: Report Results

### 10.1 Fill in the Summary
Edit `WINDOWS-TEST-SUMMARY.md` and replace all `[...]` placeholders with actual results from your log files.

### 10.2 Commit Results
```powershell
git add WINDOWS-TEST-SUMMARY.md
git add *.log
git commit -m "Windows RTX 3080 testing results

- Hardware: RTX 3080 10GB VRAM
- Tests: [X/49] passed
- Performance: [X] tokens/sec
- Architecture: [PASS/FAIL]

🤖 Generated with Windows testing automation"
```

### 10.3 Report Back
Reply with:
1. Contents of `WINDOWS-TEST-SUMMARY.md`
2. Any error messages from the log files
3. Whether all 49 tests passed
4. The detected GPU and VRAM numbers

## Troubleshooting

### If Build Fails:
```powershell
# Try clearing everything
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
$env:NODE_OPTIONS = "--max-old-space-size=8192"
npm run build
```

### If Tests Timeout:
```powershell
# Increase timeout
npm test -- tests/**/*.tmoat.test.ts --testTimeout=120000
```

### If GPU Not Detected:
Check if NVIDIA drivers are installed:
```powershell
nvidia-smi
```
Should show RTX 3080 information.

## Success Criteria

✅ **PASS**: All 49 TMOAT tests pass
✅ **PASS**: RTX 3080 detected with 10-12GB VRAM  
✅ **PASS**: ONNX download completes (~120MB)
✅ **PASS**: Performance ≥400 tokens/sec
✅ **PASS**: Scoring weights 60/32/8 validated

**Total expected time**: 10-15 minutes for full validation

## Final Note

This validates that the Phase 8 Task 11.5 architectural improvements work correctly on Windows with high-end NVIDIA hardware. The RTX 3080's 10GB VRAM should make all GPU models compatible and potentially achieve better performance than Mac M3.