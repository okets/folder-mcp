# GitHub Copilot Prompts for Windows TMOAT Testing

This file provides specific prompts to use with GitHub Copilot when testing folder-mcp on Windows machines.

## Getting Started Prompts

### Initial Setup (RTX 3080)
```
I'm testing folder-mcp (a TypeScript Node.js project) on Windows with RTX 3080 GPU. The project has TMOAT tests that:
- Detect machine capabilities (should detect RTX 3080 with 10GB VRAM and CUDA)
- Download and test ONNX ML models (~120MB)
- Test model compatibility scoring with 60/32/8 weight distribution
- Handle Ollama integration gracefully when offline

I have the repo cloned and synced to origin/main. I need to switch to phase-8-task-11.5 branch.
Help me set up the environment and leverage the RTX 3080 for optimal testing.
```

### Dependency Installation
```
I'm running `npm install` for folder-mcp on Windows and getting [paste error]. 
The project uses:
- TypeScript + Vitest for testing
- @xenova/transformers for ONNX models
- systeminformation for hardware detection
- Node.js fetch for downloads

What's the Windows-specific fix for this dependency issue?
```

## Test Execution Prompts

### Running TMOAT Tests
```
I need to run TMOAT tests for folder-mcp on Windows. These are comprehensive integration tests that:
- Test machine capabilities detection (should detect Windows GPU/CPU)
- Download ONNX models from HuggingFace (120MB files)
- Test embedding generation (384-dimension vectors)
- Validate model scoring (Language 60%, Accuracy 32%, Speed 8%)

Command I'm running: `npm test -- tests/**/*.tmoat.test.ts`
Help me understand what successful output should look like on Windows vs Mac.
```

### Specific Test Suite Prompts

#### Machine Capabilities Test (RTX 3080)
```
I'm running the machine capabilities TMOAT test on Windows with RTX 3080:
`npm test -- tests/domain/models/model-system.tmoat.test.ts`

This test detects CPU, GPU, and memory using the systeminformation package.
On Mac it detects Apple M3 + Metal support (integrated GPU, unified memory).
What should I expect to see with RTX 3080? Should detect:
- NVIDIA GeForce RTX 3080
- 10GB VRAM 
- CUDA support
- Discrete GPU type

Help me interpret the RTX 3080 detection results vs Mac M3.
```

#### ONNX Integration Test  
```
I'm running ONNX integration tests on Windows:
`npm test -- tests/infrastructure/embeddings/onnx/onnx.tmoat.test.ts`

This downloads Xenova/multilingual-e5-small (120MB) and generates embeddings.
The download is taking [X minutes] and I'm seeing [paste progress output].
Is this normal Windows performance vs Mac? What should I troubleshoot?
```

#### Architecture Fixes Test
```
I'm testing the intelligent recommendations architecture fixes:
`npm test -- tests/domain/models/intelligent-recommendations.tmoat.test.ts`

This validates:
- No Ollama models in curated config (clean architecture)
- Hardware as binary filter (not scored in compatibility)
- Scoring weights: Language 60%, Accuracy 32%, Speed 8%

The test output shows [paste results]. Help me interpret if these scoring weights are correct.
```

## Debugging Prompts

### Test Failure Analysis
```
My TMOAT test is failing on Windows with this error:
[paste full error message and stack trace]

The test was: [test name and description]
My system specs: [Windows version, CPU, GPU, RAM]
Node.js version: [version]

This is testing [machine capabilities/ONNX downloads/model scoring] functionality.
What are the most likely Windows-specific causes and fixes?
```

### Performance Issues
```
My TMOAT tests are running very slowly on Windows compared to expected Mac performance:
- ONNX model download: [X minutes] (expected: Y minutes)  
- Embedding generation: [X tokens/sec] (expected: Y tokens/sec)
- Overall test suite: [X minutes] (expected: Y minutes)

My specs: [CPU, GPU, RAM, disk type]
Are these performance differences normal? How can I optimize for Windows?
```

### Path and File Issues
```
I'm getting file path errors in TMOAT tests on Windows:
[paste error message]

The test is trying to access files at: [paste paths]
This involves [model downloads/cache directories/temp files].
What's the Windows path conversion issue and how do I fix it?
```

## Architecture Validation Prompts

### Scoring System Validation
```
I need to verify the intelligent recommendations scoring system is working correctly on Windows.
The architectural requirements are:
- Language compatibility: 60% weight (0-60 points)
- Accuracy (MTEB scores): 32% weight (0-32 points)  
- Speed benchmarks: 8% weight (0-8 points)
- Hardware: Binary filter only (not scored)

My test results show: [paste scoring output]
Help me validate these weights are implemented correctly and working as expected.
```

### Clean Architecture Validation
```
I need to verify the Ollama architecture cleanup is working on Windows:
- curated-models.json should have NO ollamaModels section
- ModelCompatibilityEvaluator should exclude all Ollama references
- OllamaDetector should provide basic runtime info only
- Assisted mode should never show Ollama models

My test results: [paste output]
Help me confirm the clean separation between curated models (GPU/ONNX) and runtime models (Ollama) is working.
```

## Windows-Specific Troubleshooting Prompts

### PowerShell Execution Policy
```
I'm getting PowerShell execution policy errors when running npm scripts for folder-mcp TMOAT tests:
[paste error message]

What's the minimal PowerShell policy change needed to run these Node.js/TypeScript tests safely?
```

### Long Path Names
```
I'm getting "path too long" errors during TMOAT tests on Windows:
[paste error message]

This happens during [model downloads/cache operations/temp file creation].
What's the Windows long path fix for Node.js projects like folder-mcp?
```

### Network/Download Issues
```
The ONNX model download is failing on Windows during TMOAT tests:
Download URL: https://huggingface.co/Xenova/multilingual-e5-small/resolve/main/onnx/model_quantized.onnx
Error: [paste error]
Network: [corporate/home/etc.]

What Windows network/security settings might block ML model downloads?
```

## Expected Results Prompts

### Successful Test Output
```
Help me understand what successful TMOAT test output should look like on Windows.
I should see 5 test suites passing:
1. model-system.tmoat.test.ts (machine capabilities)
2. onnx.tmoat.test.ts (model downloads)  
3. model-download-management.tmoat.test.ts (coordination)
4. ollama.tmoat.test.ts (runtime detection)
5. intelligent-recommendations.tmoat.test.ts (architecture)

What are the key success indicators for each suite on Windows vs Mac?
```

### Performance Benchmarks
```
What are reasonable performance expectations for folder-mcp TMOAT tests on Windows?
Test components:
- Machine capabilities detection: [expected time]
- 120MB ONNX model download: [expected time on typical Windows setup]
- Embedding generation (384-dim vectors): [expected tokens/sec]
- Full test suite: [expected total runtime]

Help me set realistic Windows performance baselines vs Mac performance.
```

## Final Validation Prompts

### Architecture Completeness
```
After running all TMOAT tests successfully on Windows, help me verify these architectural fixes are working:

✅ Ollama Clean Architecture:
- No ollamaModels in curated config: [status]
- Pure runtime detection only: [status]
- Assisted mode exclusion: [status]

✅ Hardware Binary Filter:
- Incompatible models get score=0: [status]  
- No hardware points in total score: [status]

✅ Scoring Weights (60/32/8):
- Language prioritization working: [status]
- Proper weight distribution: [status]

✅ Windows Compatibility:
- Hardware detection working: [status]
- Model downloads working: [status]
- Performance acceptable: [status]

What final checks should I do to confirm Phase 8 Task 11.5 is complete on Windows?
```

## Usage Instructions

1. **Copy relevant prompts** based on your current testing phase
2. **Paste your specific error messages** or output where indicated
3. **Include your Windows system specs** when asking about performance
4. **Be specific about which test suite** you're running when debugging
5. **Include the full error stack trace** for debugging prompts

These prompts are designed to give GitHub Copilot the context it needs to provide Windows-specific guidance for folder-mcp TMOAT testing.