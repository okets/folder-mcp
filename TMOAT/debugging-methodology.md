# TMOAT Debugging Methodology

## Core Principles
1. **Create temporary test scripts** in `tmp/` directory for isolated testing
2. **Use extensive logging** to trace execution flow
3. **Run daemons in background** with log capture
4. **Test components in isolation** before integration
5. **Clean up temporary files** after debugging

## Standard TMOAT Pattern

### 1. Create Test Script
```javascript
// tmp/test-component.mjs
import { Component } from '../dist/src/path/to/component.js';

async function testComponent() {
  console.log('Testing Component...\n');
  
  // Add comprehensive logging
  const component = new Component();
  
  // Test specific functionality
  const result = await component.method();
  
  // Output results with clear formatting
  console.log('Results:', result);
}

testComponent().catch(console.error);
```

### 2. Run with Logging
```bash
# Capture daemon logs
node dist/src/daemon/index.js --restart 2>&1 | tee tmp/daemon.log

# Run test script
node tmp/test-component.mjs 2>&1

# Capture TUI logs (when possible)
npm run tui 2>tmp/tui-debug.log
```

### 3. Analyze Results
- Check for discrepancies between expected and actual values
- Trace through execution flow with debug logs
- Identify exact point of failure

### 4. Clean Up
```bash
rm -f tmp/test-*.* tmp/*.log
```

## Current Project State

### Fixed Issues
1. **Model MTEB Score Display (COMPLETED)**
   - Problem: Downloaded models showed 0% match score
   - Root Cause: Cached models not in top recommendations got hardcoded score of 0
   - Fix: Modified `addCachedModelsNotInRecommendations` to calculate actual scores
   - Files Modified:
     - `src/daemon/websocket/handlers/model-handlers.ts`
     - `src/domain/models/model-evaluator.ts` 
     - `src/application/models/model-selection-service.ts`

2. **Model Download Implementation (COMPLETED)**
   - Problem: "GPU model download not yet implemented" error
   - Fix: Implemented actual GPU model download using Python embedding service
   - Files Modified:
     - `src/daemon/services/model-download-manager.ts`

3. **Daemon Initialization Order (COMPLETED)**
   - Problem: Folders loaded before models were checked
   - Fix: Reordered initialization in daemon/index.ts
   - Files Modified:
     - `src/daemon/index.ts`

### Testing Approach Used

#### Example TMOAT Test Script
```javascript
// tmp/test-model-evaluator.mjs
import { ModelCompatibilityEvaluator } from '../dist/src/domain/models/model-evaluator.js';
import { MachineCapabilitiesDetector } from '../dist/src/domain/models/machine-capabilities.js';

async function testModelEvaluator() {
  console.log('Testing Model Evaluator with curated-models.json data...\\n');
  
  const evaluator = new ModelCompatibilityEvaluator();
  const detector = new MachineCapabilitiesDetector();
  const capabilities = await detector.detectCapabilities();
  
  const criteria = {
    languages: ['en'],
    mode: 'assisted'
  };
  
  const scores = evaluator.evaluateModelCompatibility(capabilities, criteria);
  
  scores.slice(0, 3).forEach((score, i) => {
    console.log(`${i + 1}. ${score.model.id}`);
    console.log(`   Score: ${score.score.toFixed(1)}%`);
    console.log(`   MTEB: ${score.model.mtebScore || 'MISSING'}`);
  });
}

testModelEvaluator().catch(console.error);
```

## Key Files for Debugging

### Configuration
- `src/config/curated-models.json` - Model definitions with MTEB scores
- `system-configuration.json` - System-wide configuration

### Core Components
- `src/daemon/services/fmdm-service.ts` - Folder MCP Data Model service
- `src/daemon/services/model-download-manager.ts` - Model download logic
- `src/daemon/websocket/handlers/model-handlers.ts` - WebSocket model handlers
- `src/domain/models/model-evaluator.ts` - Model scoring logic

### Testing
- `TMOAT/THE_MOTHER_OF_ALL_TESTS.md` - Manual test procedures
- `tmp/` directory - Temporary test scripts and logs

## Next Steps for Fresh Context

1. **Verify Fixes**: Run TUI and check that downloaded models show proper match percentages
2. **Continue Phase 8**: Complete unified application flow implementation
3. **Test End-to-End**: Full workflow from folder addition to model selection

## Important Notes

- Always use `tmp/` directory for temporary files
- Never commit temporary test files
- Always clean up after debugging sessions
- Maintain the TMOAT methodology for systematic debugging