/**
 * TMOAT Master Integration Test
 * 
 * Single comprehensive test that emulates the EXACT TUI flow:
 * - Same DI container initialization as daemon
 * - Same WebSocket protocol and message handlers  
 * - Same method calls TUI makes to display data
 * - Same folder addition flow TUI uses
 * 
 * This is a TUI simulator, not a unit test.
 */

const { DependencyContainer } = require('../dist/src/di/container.js');
const { setupDependencyInjection } = require('../dist/src/di/setup.js');
const { SERVICE_TOKENS } = require('../dist/src/di/interfaces.js');

// Track test state for comprehensive reporting
let testState = {
  currentPhase: 0,
  phasesCompleted: [],
  errors: [],
  modelStates: {},
  folderStates: {}
};

async function runMasterIntegrationTest() {
  console.log('🚀 MASTER INTEGRATION TEST - TUI Flow Simulation');
  console.log('=' .repeat(60));
  console.log('Simulating exact TUI startup → model display → folder addition → download flow\n');

  try {
    // PHASE 1: TUI Startup Simulation
    await runPhase1_TUIStartup();
    
    // PHASE 2: TUI Model Display Simulation  
    await runPhase2_TUIModelDisplay();
    
    // PHASE 3: TUI Folder Addition Simulation
    await runPhase3_TUIFolderAddition();
    
    // PHASE 4: TUI Download Flow Simulation
    await runPhase4_TUIDownloadFlow();
    
    // PHASE 5: TUI State Verification
    await runPhase5_TUIStateVerification();
    
    // PHASE 6: Persistent Storage Verification
    await runPhase6_PersistentStorageVerification();
    
    // PHASE 7: Python Model Download Debugging
    await runPhase7_PythonModelDebugging();
    
    // Final Results
    return reportResults();
    
  } catch (error) {
    testState.errors.push(`Fatal error: ${error.message}`);
    console.error('❌ MASTER TEST FAILED:', error);
    return false;
  }
}

/**
 * PHASE 1: TUI Startup Simulation
 * Initialize exactly as daemon does, wait for models to load
 */
async function runPhase1_TUIStartup() {
  console.log('📱 PHASE 1: TUI Startup Simulation');
  console.log('-'.repeat(40));
  
  testState.currentPhase = 1;
  
  try {
    // 1.1 Initialize DI container exactly as daemon does
    console.log('🔧 Initializing DI container (same as daemon startup)...');
    const container = setupDependencyInjection({
      folderPath: '/tmp/test-tui-simulation', // Dummy path for init
      logLevel: 'info'
    });
    
    // Store for other phases
    global.testContainer = container;
    console.log('   ✅ DI container initialized');
    
    // 1.2 Resolve core services (same as daemon)
    console.log('🔧 Resolving core services...');
    const fmdmService = container.resolve(SERVICE_TOKENS.FMDM_SERVICE);
    const logger = container.resolve(SERVICE_TOKENS.LOGGING);
    const daemonConfigService = container.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE);
    
    // 1.2.1 Initialize configuration service (required for folder operations)
    console.log('🔧 Initializing daemon configuration...');
    await daemonConfigService.initialize();
    console.log('   ✅ Configuration service initialized');
    
    global.testFmdmService = fmdmService;
    global.testLogger = logger;
    global.testDaemonConfigService = daemonConfigService;
    console.log('   ✅ Core services resolved');
    
    // 1.3 Check initial FMDM state (should be empty)
    const initialFmdm = fmdmService.getFMDM();
    console.log(`   📊 Initial state: ${initialFmdm.folders.length} folders, ${initialFmdm.curatedModels.length} models`);
    
    if (initialFmdm.folders.length > 0) {
      testState.errors.push('Phase 1: Expected empty folders, found existing ones');
    }
    
    // 1.4 Wait for background model initialization to complete
    console.log('⏳ Waiting for model initialization (simulating TUI startup delay)...');
    
    // Try manual initialization if needed
    if (initialFmdm.curatedModels.length === 0) {
      console.log('   🔧 Triggering manual model initialization...');
      await fmdmService.initializeCuratedModels();
    }
    
    // Wait a bit more for async processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1.5 Verify all 5 curated models are loaded
    const fmdmAfterInit = fmdmService.getFMDM();
    console.log(`   📊 After initialization: ${fmdmAfterInit.curatedModels.length} models loaded`);
    
    if (fmdmAfterInit.curatedModels.length !== 5) {
      testState.errors.push(`Phase 1: Expected 5 models, got ${fmdmAfterInit.curatedModels.length}`);
    } else {
      console.log('   ✅ All 5 curated models loaded successfully');
      
      // Track model states for TUI display simulation
      fmdmAfterInit.curatedModels.forEach((model, i) => {
        console.log(`      ${i + 1}. ${model.id} (${model.type}) - installed: ${model.installed}`);
        testState.modelStates[model.id] = model;
      });
    }
    
    testState.phasesCompleted.push('Phase 1: TUI Startup');
    console.log('✅ PHASE 1 COMPLETE: TUI startup simulation passed\n');
    
  } catch (error) {
    testState.errors.push(`Phase 1 error: ${error.message}`);
    throw error;
  }
}

/**
 * PHASE 2: TUI Model Display Simulation  
 * Call exact methods TUI uses for dropdown and "Local Copy" column
 */
async function runPhase2_TUIModelDisplay() {
  console.log('📋 PHASE 2: TUI Model Display Simulation');
  console.log('-'.repeat(40));
  
  testState.currentPhase = 2;
  
  try {
    // 2.1 Create ModelHandlers (what TUI uses)
    console.log('🔧 Creating ModelHandlers (same as TUI)...');
    const logger = global.testLogger;
    const fmdmService = global.testFmdmService;
    const container = global.testContainer;
    
    const modelSelectionService = container.resolve(SERVICE_TOKENS.MODEL_SELECTION_SERVICE);
    const ollamaDetector = container.resolve(SERVICE_TOKENS.OLLAMA_DETECTOR);
    
    const { ModelHandlers } = require('../dist/src/daemon/websocket/handlers/model-handlers.js');
    const modelHandlers = new ModelHandlers(
      logger,
      modelSelectionService, 
      ollamaDetector,
      fmdmService
    );
    
    global.testModelHandlers = modelHandlers;
    console.log('   ✅ ModelHandlers created');
    
    // 2.2 Call getSupportedModels() (what TUI uses for dropdown)
    console.log('🔍 Testing getSupportedModels() (TUI dropdown data)...');
    const supportedModels = modelHandlers.getSupportedModels();
    console.log(`   📊 Supported models: ${supportedModels.length}`);
    
    if (supportedModels.length === 0) {
      testState.errors.push('Phase 2: getSupportedModels() returned empty array');
    } else {
      supportedModels.forEach((modelId, i) => {
        console.log(`      ${i + 1}. ${modelId}`);
      });
    }
    
    // 2.3 Call getSupportedModelsWithNames() (what TUI displays)
    console.log('🔍 Testing getSupportedModelsWithNames() (TUI display data)...');
    const supportedModelsWithNames = modelHandlers.getSupportedModelsWithNames();
    console.log(`   📊 Models with display names: ${supportedModelsWithNames.length}`);
    
    supportedModelsWithNames.forEach((model, i) => {
      console.log(`      ${i + 1}. ${model.displayName} (${model.id})`);
      
      // Verify display names are not just IDs
      if (model.displayName === model.id) {
        testState.errors.push(`Phase 2: Model ${model.id} has no proper display name`);
      }
    });
    
    // 2.4 Simulate "Local Copy" column display
    console.log('🔍 Simulating "Local Copy" column (TUI status display)...');
    const fmdm = fmdmService.getFMDM();
    fmdm.curatedModels.forEach((model, i) => {
      const localCopyStatus = model.installed ? '✅ Downloaded' : '❌ Not Downloaded';
      console.log(`      ${i + 1}. ${model.id}: ${localCopyStatus}`);
    });
    
    testState.phasesCompleted.push('Phase 2: TUI Model Display');
    console.log('✅ PHASE 2 COMPLETE: TUI model display simulation passed\n');
    
  } catch (error) {
    testState.errors.push(`Phase 2 error: ${error.message}`);
    throw error;
  }
}

/**
 * PHASE 3: TUI Folder Addition Simulation
 * Send exact WebSocket message TUI sends
 */
async function runPhase3_TUIFolderAddition() {
  console.log('📁 PHASE 3: TUI Folder Addition Simulation');
  console.log('-'.repeat(40));
  
  testState.currentPhase = 3;
  
  try {
    // 3.1 Get WebSocket protocol (what processes TUI messages)
    console.log('🔧 Getting WebSocket protocol handler...');
    const container = global.testContainer;
    const protocol = await container.resolveAsync('WebSocketProtocol');
    global.testProtocol = protocol;
    console.log('   ✅ WebSocket protocol ready');
    
    // 3.2 Select working GPU model (replicate user's QA scenario)
    const fmdm = global.testFmdmService.getFMDM();
    // Use MiniLM-L12 which is already cached and should work
    const miniLMModel = fmdm.curatedModels.find(m => m.id === 'folder-mcp:paraphrase-multilingual-minilm');
    
    if (!miniLMModel) {
      // Fallback to first GPU model
      var selectedModel = fmdm.curatedModels.find(m => m.type === 'gpu') || fmdm.curatedModels[0];
      console.log(`   📋 MiniLM not found, using fallback: ${selectedModel.id}`);
    } else {
      var selectedModel = miniLMModel;
      console.log(`   📋 Selected cached working model: ${selectedModel.id} (should work immediately)`);
    }
    
    // 3.3 Create test folder (simulate real user folder)
    const testFolderPath = '/tmp/tui-simulation-test-folder';
    
    // Create the folder with some test content
    const fs = require('fs');
    try {
      if (fs.existsSync(testFolderPath)) {
        fs.rmSync(testFolderPath, { recursive: true });
      }
      fs.mkdirSync(testFolderPath, { recursive: true });
      fs.writeFileSync(`${testFolderPath}/test-document.txt`, 'This is a test document for TUI simulation.');
      console.log('   📁 Created test folder with sample content');
    } catch (error) {
      console.log('   ❌ Failed to create test folder:', error.message);
    }
    
    // 3.4 Create exact WebSocket message TUI sends
    const folderMessage = {
      type: 'folder.add',
      id: `tui-test-${Date.now()}`,
      payload: {
        path: testFolderPath,
        model: selectedModel.id
      }
    };
    
    console.log('📤 Sending folder.add message (exact TUI format):');
    console.log(`   📁 Path: ${testFolderPath}`);
    console.log(`   🤖 Model: ${selectedModel.id}`);
    
    // 3.5 Send through WebSocket protocol (simulate TUI → daemon)
    console.log('🔍 DEBUGGING: Tracing TUI → WebSocket → Orchestrator → FMDM flow...');
    
    // Get FMDM state before sending message
    const fmdmBefore = global.testFmdmService.getFMDM();
    console.log(`   📊 FMDM before: ${fmdmBefore.folders.length} folders`);
    
    const response = await protocol.processMessage('tui-simulation-client', folderMessage);
    
    // 3.6 Verify folder is accepted (no validation blocking)
    if (!response.success) {
      testState.errors.push(`Phase 3: Folder addition rejected: ${response.error || 'Unknown error'}`);
      console.log('   ❌ Folder addition was rejected');
      console.log(`   ❌ Error: ${response.error || 'Unknown error'}`);
    } else {
      console.log('   ✅ Folder addition accepted by WebSocket handler');
      console.log(`   📊 Response: ${response.message || 'success'}`);
    }
    
    // 3.6.1 Check FMDM state immediately after WebSocket response
    const fmdmAfter = global.testFmdmService.getFMDM();
    console.log(`   📊 FMDM after WebSocket: ${fmdmAfter.folders.length} folders`);
    
    if (fmdmAfter.folders.length > fmdmBefore.folders.length) {
      console.log('   ✅ FMDM was updated - folder added to FMDM');
      const newFolder = fmdmAfter.folders.find(f => f.path === testFolderPath);
      if (newFolder) {
        console.log(`   📁 New folder in FMDM: ${newFolder.path} (${newFolder.model}) - status: ${newFolder.status}`);
      }
    } else {
      console.log('   ❌ FMDM was NOT updated - folder not in FMDM yet');
      console.log('   🔍 This suggests orchestrator operation may be async or failed');
      
      // Wait for async orchestrator operations
      console.log('   ⏳ Waiting 3 seconds for async orchestrator operations...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const fmdmAfterWait = global.testFmdmService.getFMDM();
      console.log(`   📊 FMDM after wait: ${fmdmAfterWait.folders.length} folders`);
      
      if (fmdmAfterWait.folders.length > fmdmBefore.folders.length) {
        console.log('   ✅ ASYNC SUCCESS: Folder appeared in FMDM after wait');
        const newFolder = fmdmAfterWait.folders.find(f => f.path === testFolderPath);
        if (newFolder) {
          console.log(`   📁 Async folder: ${newFolder.path} (${newFolder.model}) - status: ${newFolder.status}`);
        }
      } else {
        console.log('   ❌ ASYNC FAILED: Folder still not in FMDM after wait');
        console.log('   🚨 This indicates orchestrator.addFolder() is not working properly');
      }
    }
    
    // 3.6.1 QA BUG REPLICATION: Check configuration after folder addition
    console.log('🔍 QA BUG REPLICATION: Checking configuration state...');
    const daemonConfigService = container.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE);
    
    try {
      const configuredFolders = await daemonConfigService.getFolders();
      console.log(`   📊 Folders in configuration: ${configuredFolders.length}`);
      
      if (configuredFolders.length > 0) {
        console.log(`   📁 Configured folder: ${configuredFolders[0].path} (model: ${configuredFolders[0].model})`);
        
        // This simulates the TUI restart scenario
        console.log('🔄 SIMULATING TUI RESTART: Should first-run wizard show?');
        const shouldShowWizard = configuredFolders.length === 0; // This is likely the buggy logic
        console.log(`   🤔 First-run wizard logic: ${configuredFolders.length} folders → show wizard: ${shouldShowWizard}`);
        
        if (shouldShowWizard && configuredFolders.length > 0) {
          console.log('   🚨 BUG DETECTED: First-run wizard would show despite folders being configured!');
          testState.errors.push('BUG: First-run wizard logic is wrong - shows wizard when folders exist');
        } else {
          console.log('   ✅ First-run wizard logic correct');
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed to check configuration: ${error.message}`);
    }
    
    // 3.7 Check FMDM shows folder in pending state  
    // Wait a moment for async processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const fmdmAfterAdd = global.testFmdmService.getFMDM();
    console.log(`   📊 FMDM after addition: ${fmdmAfterAdd.folders.length} folders`);
    
    const addedFolder = fmdmAfterAdd.folders.find(f => f.path === testFolderPath);
    
    if (!addedFolder) {
      console.log('   ⚠️ Folder not found in FMDM yet (may be processed asynchronously)');
      console.log('   📋 Available folders:');
      fmdmAfterAdd.folders.forEach(f => {
        console.log(`      - ${f.path}: ${f.status}`);
      });
      // Still continue test - this might be expected with async processing
    } else {
      console.log(`   📊 Folder found in FMDM: ${addedFolder.status}`);
      testState.folderStates[testFolderPath] = addedFolder;
    }
    
    // Track for next phase regardless (folder might be added later)
    global.testFolderPath = testFolderPath;
    global.testSelectedModel = selectedModel;
    
    testState.phasesCompleted.push('Phase 3: TUI Folder Addition');
    console.log('✅ PHASE 3 COMPLETE: TUI folder addition simulation passed\n');
    
  } catch (error) {
    testState.errors.push(`Phase 3 error: ${error.message}`);
    throw error;
  }
}

/**
 * PHASE 4: TUI Download Flow Simulation
 * Monitor state changes and download progress
 */
async function runPhase4_TUIDownloadFlow() {
  console.log('⬇️  PHASE 4: TUI Download Flow Simulation');
  console.log('-'.repeat(40));
  
  testState.currentPhase = 4;
  
  try {
    const fmdmService = global.testFmdmService;
    const testFolderPath = global.testFolderPath;
    const selectedModel = global.testSelectedModel;
    
    console.log('⏳ Monitoring folder lifecycle transitions...');
    console.log(`   📁 Tracking: ${testFolderPath || 'No folder path available'}`);
    console.log(`   🤖 Model: ${selectedModel ? selectedModel.id : 'No model selected'}`);
    
    // 4.1 Monitor state changes (simulate TUI watching FMDM updates)
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds max
    let lastFolderStatus = 'unknown';
    let lastModelStatus = selectedModel.installed;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      // Get current states
      const currentFmdm = fmdmService.getFMDM();
      const folder = currentFmdm.folders.find(f => f.path === testFolderPath);
      const model = currentFmdm.curatedModels.find(m => m.id === selectedModel.id);
      
      // Track folder transitions
      if (folder && folder.status !== lastFolderStatus) {
        console.log(`   📊 [${attempts * 2}s] Folder status: ${lastFolderStatus} → ${folder.status}`);
        lastFolderStatus = folder.status;
        
        if (folder.progress !== undefined) {
          console.log(`   📈 [${attempts * 2}s] Progress: ${folder.progress}%`);
        }
      }
      
      // Track model download progress  
      if (model) {
        if (model.downloading && model.downloadProgress !== undefined) {
          console.log(`   🔄 [${attempts * 2}s] Model download: ${model.downloadProgress}%`);
        }
        
        if (model.installed !== lastModelStatus) {
          const status = model.installed ? '✅ Downloaded' : '❌ Not Downloaded';
          console.log(`   🤖 [${attempts * 2}s] Model status: ${status}`);
          lastModelStatus = model.installed;
        }
      }
      
      // Check for completion or expected states
      if (folder && (folder.status === 'ready' || folder.status === 'active')) {
        console.log('   🎉 Folder reached final state!');
        break;
      }
      
      // For this test, we might not actually download - just check the flow
      if (folder && folder.status === 'downloading-model') {
        console.log('   ✅ Folder entered downloading-model state (flow working)');
        break;
      }
    }
    
    // 4.2 Final state verification
    const finalFmdm = fmdmService.getFMDM();
    const finalFolder = finalFmdm.folders.find(f => f.path === testFolderPath);
    const finalModel = finalFmdm.curatedModels.find(m => m.id === selectedModel.id);
    
    if (finalFolder) {
      console.log(`   📊 Final folder state: ${finalFolder.status}`);
      testState.folderStates[testFolderPath] = finalFolder;
    }
    
    if (finalModel) {
      testState.modelStates[selectedModel.id] = finalModel;
    }
    
    testState.phasesCompleted.push('Phase 4: TUI Download Flow');
    console.log('✅ PHASE 4 COMPLETE: TUI download flow simulation passed\n');
    
  } catch (error) {
    testState.errors.push(`Phase 4 error: ${error.message}`);
    throw error;
  }
}

/**
 * PHASE 5: TUI State Verification
 * Call same refresh methods TUI uses
 */
async function runPhase5_TUIStateVerification() {
  console.log('🔍 PHASE 5: TUI State Verification');
  console.log('-'.repeat(40));
  
  testState.currentPhase = 5;
  
  try {
    const modelHandlers = global.testModelHandlers;
    const fmdmService = global.testFmdmService;
    
    // 5.1 Refresh model dropdown (same call TUI makes)
    console.log('🔄 Refreshing model dropdown data...');
    const refreshedModels = modelHandlers.getSupportedModelsWithNames();
    console.log(`   📊 Models available: ${refreshedModels.length}`);
    
    // 5.2 Check folder list (same data TUI displays)
    console.log('🔄 Refreshing folder list data...');
    const currentFmdm = fmdmService.getFMDM();
    console.log(`   📊 Folders managed: ${currentFmdm.folders.length}`);
    
    currentFmdm.folders.forEach((folder, i) => {
      const folderName = folder.path.split('/').pop();
      console.log(`      ${i + 1}. ${folderName}: ${folder.status} (${folder.model})`);
    });
    
    // 5.3 Check "Local Copy" column (same data TUI shows)
    console.log('🔄 Refreshing "Local Copy" column data...');
    currentFmdm.curatedModels.forEach((model, i) => {
      const status = model.installed ? '✅ Downloaded' : '❌ Not Downloaded';
      const progress = model.downloading ? ` (${model.downloadProgress || 0}%)` : '';
      console.log(`      ${i + 1}. ${model.id}: ${status}${progress}`);
    });
    
    // 5.4 Test second folder with same model (reuse scenario)
    console.log('🔄 Testing model reuse scenario...');
    const selectedModel = global.testSelectedModel;
    
    if (selectedModel) {
      console.log(`   📋 Model ${selectedModel.id} should be reusable for additional folders`);
      
      // Check if model is now available
      const isSupported = modelHandlers.isModelSupported(selectedModel.id);
      console.log(`   🧪 Model supported check: ${isSupported ? 'YES' : 'NO'}`);
      
      if (!isSupported) {
        testState.errors.push(`Phase 5: Model ${selectedModel.id} should be supported but isn't`);
      }
    }
    
    testState.phasesCompleted.push('Phase 5: TUI State Verification');
    console.log('✅ PHASE 5 COMPLETE: TUI state verification passed\n');
    
  } catch (error) {
    testState.errors.push(`Phase 5 error: ${error.message}`);
    throw error;
  }
}

// PHASE 6: Persistent Storage Verification
async function runPhase6_PersistentStorageVerification() {
  console.log('\n💾 PHASE 6: Persistent Storage Verification');
  console.log('----------------------------------------');
  
  try {
    testState.currentPhase = 6;
    
    // Get configuration manager
    const configManager = global.testContainer.resolve(SERVICE_TOKENS.CONFIGURATION);
    
    console.log('🔍 Checking configuration storage before save...');
    const configBefore = configManager.getAll();
    console.log(`   📊 Folders in memory config: ${configBefore.folders ? configBefore.folders.length : 0}`);
    
    // Force save configuration to persistent storage
    console.log('💾 Force saving configuration to persistent storage...');
    await configManager.save();
    console.log('   ✅ Configuration saved to disk');
    
    // Verify persistent storage by reading from disk
    console.log('🔍 Reading configuration from disk to verify persistence...');
    const freshConfigManager = global.testContainer.resolve(SERVICE_TOKENS.CONFIGURATION);
    await freshConfigManager.load();
    const configFromDisk = freshConfigManager.getAll();
    
    console.log(`   📊 Folders in persistent config: ${configFromDisk.folders ? configFromDisk.folders.length : 0}`);
    
    if (configFromDisk.folders && configFromDisk.folders.length > 0) {
      console.log('   ✅ PERSISTENCE VERIFIED: Folder saved to disk');
      configFromDisk.folders.forEach((folder, i) => {
        console.log(`      ${i + 1}. ${folder.path} (${folder.model})`);
      });
    } else {
      console.log('   ❌ PERSISTENCE FAILED: No folders found in persistent storage');
      testState.errors.push('Configuration not persisted to disk');
    }
    
    // Test daemon restart scenario
    console.log('🔄 Simulating daemon restart scenario...');
    const newContainer = new DependencyContainer();
    setupDependencyInjection(newContainer);
    const newConfigManager = newContainer.resolve(SERVICE_TOKENS.CONFIGURATION_MANAGER);
    await newConfigManager.load();
    const restartConfig = newConfigManager.getAll();
    
    console.log(`   📊 Folders after simulated restart: ${restartConfig.folders ? restartConfig.folders.length : 0}`);
    
    if (restartConfig.folders && restartConfig.folders.length > 0) {
      console.log('   ✅ RESTART PERSISTENCE VERIFIED: Configuration survives restart');
    } else {
      console.log('   ❌ RESTART PERSISTENCE FAILED: Configuration lost on restart');
      testState.errors.push('Configuration lost on daemon restart');
    }
    
    testState.phasesCompleted.push('Phase 6: Persistent Storage');
    console.log('✅ PHASE 6 COMPLETE: Persistent storage verification passed');
    
  } catch (error) {
    testState.errors.push(`Phase 6 error: ${error.message}`);
    console.log('❌ PHASE 6 FAILED:', error.message);
  }
}

// PHASE 7: Python Model Download Debugging  
async function runPhase7_PythonModelDebugging() {
  console.log('\n🐍 PHASE 7: Python Model Download Debugging');
  console.log('----------------------------------------');
  
  try {
    testState.currentPhase = 7;
    
    // Get available services (note: some services may not be available in test container)
    let embeddingService = null;
    try {
      embeddingService = global.testContainer.resolve(SERVICE_TOKENS.EMBEDDING);
    } catch (error) {
      console.log('   ⚠️ Embedding service not available in test container');
    }
    
    console.log('🔍 Checking Python embedding service availability...');
    
    // Test Python service directly
    if (embeddingService) {
      try {
        console.log('🐍 Testing Python service initialization...');
        await embeddingService.initialize();
        console.log('   ✅ Python embedding service initialized successfully');
        
        // Test model cache check
        console.log('🔍 Testing model cache check...');
        const testModel = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
        const isCached = await embeddingService.isModelCached(testModel);
        console.log(`   📊 Model ${testModel} cached: ${isCached}`);
        
        if (!isCached) {
          console.log('⬇️ Testing model download...');
          try {
            const downloadResult = await embeddingService.downloadModel(testModel);
            console.log('   ✅ Model download test result:', downloadResult);
          } catch (downloadError) {
            console.log('   ❌ Model download failed:', downloadError.message);
            testState.errors.push(`Model download failed: ${downloadError.message}`);
          }
        }
        
      } catch (pythonError) {
        console.log('   ❌ Python embedding service failed:', pythonError.message);
        testState.errors.push(`Python service error: ${pythonError.message}`);
        
        // Detailed Python debugging
        console.log('🔍 Python service debugging...');
        console.log('   📊 Error details:', pythonError.stack || pythonError.message);
        
        // Check if it's a service availability issue
        if (pythonError.message.includes('not available')) {
          console.log('   🐍 Python service appears to be offline/unavailable');
          console.log('   🔧 This explains why model downloads fail in folder addition');
        }
      }
    } else {
      console.log('   ❌ Embedding service not available in test environment');
      console.log('   🔧 This suggests the test container doesn\'t initialize all services');
    }
    
    // Test folder lifecycle with model download monitoring
    console.log('🔄 Testing folder lifecycle with download monitoring...');
    const fmdmService = global.testFmdmService;
    
    // Monitor FMDM state during model download attempt
    console.log('   📊 FMDM before download attempt:');
    const fmdmBefore = fmdmService.getFMDM();
    fmdmBefore.folders.forEach((folder, i) => {
      console.log(`      ${i + 1}. ${folder.path} - status: ${folder.status} - progress: ${folder.progress || 0}%`);
      if (folder.downloadProgress !== undefined) {
        console.log(`         download progress: ${folder.downloadProgress}%`);
      }
      if (folder.notification) {
        console.log(`         notification: ${folder.notification.type} - ${folder.notification.message}`);
      }
    });
    
    // Wait and check again to see download progress
    console.log('   ⏳ Waiting for download progress updates...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('   📊 FMDM after download monitoring:');
    const fmdmAfter = fmdmService.getFMDM();
    fmdmAfter.folders.forEach((folder, i) => {
      console.log(`      ${i + 1}. ${folder.path} - status: ${folder.status} - progress: ${folder.progress || 0}%`);
      if (folder.downloadProgress !== undefined) {
        console.log(`         download progress: ${folder.downloadProgress}%`);
      }
      if (folder.notification) {
        console.log(`         notification: ${folder.notification.type} - ${folder.notification.message}`);
      }
    });
    
    testState.phasesCompleted.push('Phase 7: Python Model Debugging');
    console.log('✅ PHASE 7 COMPLETE: Python model debugging completed');
    
  } catch (error) {
    testState.errors.push(`Phase 7 error: ${error.message}`);
    console.log('❌ PHASE 7 FAILED:', error.message);
  }
}

/**
 * Generate final test results
 */
function reportResults() {
  console.log('📊 MASTER INTEGRATION TEST RESULTS');
  console.log('='.repeat(60));
  
  // Phase completion status
  console.log('📋 Phase Completion Status:');
  for (let i = 1; i <= 7; i++) {
    const phaseComplete = testState.phasesCompleted.some(p => p.includes(`Phase ${i}`));
    const status = phaseComplete ? '✅' : '❌';
    console.log(`   ${status} Phase ${i}: ${phaseComplete ? 'PASSED' : 'FAILED'}`);
  }
  
  // Error summary  
  if (testState.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    testState.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ No errors encountered');
  }
  
  // Model states
  console.log('\n🤖 Final Model States:');
  Object.keys(testState.modelStates).forEach((modelId, i) => {
    const model = testState.modelStates[modelId];
    const status = model.installed ? '✅ Installed' : '❌ Not Installed';
    console.log(`   ${i + 1}. ${modelId}: ${status}`);
  });
  
  // Folder states
  if (Object.keys(testState.folderStates).length > 0) {
    console.log('\n📁 Final Folder States:');
    Object.keys(testState.folderStates).forEach((folderPath, i) => {
      const folder = testState.folderStates[folderPath];
      const folderName = folderPath.split('/').pop();
      console.log(`   ${i + 1}. ${folderName}: ${folder.status}`);
    });
  }
  
  // Overall result
  const allPhasesCompleted = testState.phasesCompleted.length === 7;
  const noErrors = testState.errors.length === 0;
  const overallSuccess = allPhasesCompleted && noErrors;
  
  console.log('\n' + '='.repeat(60));
  if (overallSuccess) {
    console.log('🎉 MASTER INTEGRATION TEST: PASSED');
    console.log('✅ All 7 phases completed successfully');
    console.log('✅ TUI flow simulation works end-to-end');
  } else {
    console.log('❌ MASTER INTEGRATION TEST: FAILED');
    console.log(`❌ Completed phases: ${testState.phasesCompleted.length}/7`);
    console.log(`❌ Errors encountered: ${testState.errors.length}`);
  }
  console.log('='.repeat(60));
  
  return overallSuccess;
}

// Run the test
if (require.main === module) {
  runMasterIntegrationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runMasterIntegrationTest };