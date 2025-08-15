# AMD Windows Test Results - 2025-08-15

## System Info
- OS: Windows 10/11 (detected via PowerShell)
- GPU: AMD Radeon Graphics (Integrated)
- RAM: 10GB
- Node.js: v24.5.0

## AMD Test Results Summary

### Build Test
- Status: PASS
- Duration: ~35 seconds

### AMD GPU Detection
- GPU Detected: amd
- GPU Model: AMD Radeon Graphics
- VRAM Detected: 6GB (integrated, shared memory)
- GPU Type: INTEGRATED
- Status: PASS

### TMOAT Agent-Led Smoke Test (6 total)
- Status: 5 passed, 1 failed
- Duration: ~76 seconds

#### Individual Test Results:
1. PASS Connection Test (10.1s)
2. PASS Folder Addition Test (2.1s)
3. PASS File Monitoring Test (7.2s)
4. PASS Folder Cleanup Test (7.1s)
5. PASS Database Verification Test (4.1s)
6. FAIL Complete Folder Cleanup Test (45.0s, timeout, file lock on embeddings.db)

### ONNX Performance
- Model Downloaded: YES
- AMD Performance: 857 tokens/sec
- Status: PASS

### Architecture Validation
- Scoring Weights Correct: YES (per logs)
- AMD Models Compatible: YES (per logs)
- Status: PASS

## AMD-Specific Results
- Discrete vs Integrated: Correct classification (integrated)
- VRAM Estimation: Accurate for GPU type (shared memory)
- Legacy ATI Support: Not tested

## Performance Comparison
- AMD Performance: 857 tokens/sec
- Expected Range: 300-500 tokens/sec (Entry-level AMD)
- vs RTX 3080: Not available

## Issues Found
- Complete Folder Cleanup Test failed due to file lock (embeddings.db). This is a common Windows issue if a process holds a file handle. All other tests passed.

## Recommendations
- Investigate file handle release for .db files on Windows to ensure cleanup reliability.
- All core AMD detection, build, and agent-led tests are passing except for the cleanup edge case.

## Logs
- See amd-debug.log, amd-test-results.log, amd-tmoat-results.log for full details.

🤖 Generated with Windows AMD testing automation
