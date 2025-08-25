# Step 7: Semantic Search Priority Implementation Details

## Overview
This document provides detailed implementation guidance for Step 7 of the course correction plan. The goal is to implement basic semantic search with priority interruption to test the sequential processing system.

## Critical Understanding: Model Matching Requirement

**MUST USE SAME MODEL**: Search queries MUST be embedded with the exact same model that was used to index that folder's documents. Different models create incompatible vector spaces.

### Why This Matters
```typescript
// Folder A indexed with: 'gpu:all-MiniLM-L6-v2' (384 dims)
// Query embedded with: 'cpu:xenova-e5-small' (384 dims but different space)
// Result: Meaningless similarity scores, garbage results

// Correct approach:
// Folder A → use 'gpu:all-MiniLM-L6-v2' for both indexing AND search
```

## Implementation Tasks

### 7.1 Basic Vector Storage Service

**File**: `src/infrastructure/storage/basic-vector-search.ts`

```typescript
export interface StoredEmbedding {
  id: string;
  documentId: string;
  chunkId: string;
  vector: number[];
  folderPath: string;
  modelId: string;
  metadata: {
    content: string;
    page?: number;
    section?: string;
  };
}

export class BasicVectorSearchService implements IVectorSearchService {
  private embeddings: StoredEmbedding[] = [];
  
  async buildIndex(embeddings: EmbeddingVector[], metadata: any[]): Promise<void> {
    // Store embeddings with metadata
  }
  
  async search(queryVector: EmbeddingVector, topK = 5): Promise<SearchResult[]> {
    // Cosine similarity search
    // Return sorted by similarity score
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    // Standard cosine similarity calculation
  }
}
```

**Validation**:
```bash
# Unit test with known vectors
npm test -- tests/unit/infrastructure/basic-vector-search.test.ts
```

### 7.2 MCP Endpoints Integration

**File**: `src/interfaces/mcp/endpoints.ts` (lines 112-194)

**Changes needed**:
1. Replace mock `generateMockSemanticResults()` with real embedding generation
2. Pass `immediate=true` flag to embedding service
3. Use folder's model ID for query embedding

```typescript
// Replace this section (lines 112-194):
if (request.mode === 'semantic') {
  // 1. Get folder config to determine model ID
  const folderConfig = await this.getFolderConfig(request.filters?.folder);
  const modelId = folderConfig.modelId;
  
  // 2. Generate query embedding with SAME model as folder
  const queryEmbedding = await this.embeddingService.generateQueryEmbedding(
    request.query, 
    { modelId, immediate: true } // Priority flag
  );
  
  // 3. Search the folder's vector store
  const vectorResults = await this.vectorSearchService.search(
    queryEmbedding,
    { limit: request.limit || 10 }
  );
  
  // 4. Convert to MCP format
  // ...existing result conversion code...
}
```

**Validation**:
```bash
# Test search endpoint returns real similarity scores
curl -X POST localhost:3001/mcp/search \
  -d '{"query":"sales performance","mode":"semantic"}'
```

### 7.3 Priority Interruption in FolderIndexingQueue

**File**: `src/domain/daemon/services/folder-indexing-queue.ts`

**New methods to add**:

```typescript
export class FolderIndexingQueue {
  private isPausedForSearch = false;
  private pausedFolder: FolderQueueItem | null = null;
  
  /**
   * Pause current indexing for priority search
   */
  async pauseForSearch(searchFolderPath: string): Promise<void> {
    this.logger.info(`SEARCH_PRIORITY: Pausing current indexing for search on ${searchFolderPath}`);
    
    if (this.currentItem) {
      this.isPausedForSearch = true;
      this.pausedFolder = this.currentItem;
      
      // Unload current model
      await this.unifiedModelFactory.unloadCurrentModel();
      this.logger.info(`SEARCH_PRIORITY: Unloaded model ${this.currentItem.config.modelId}`);
    }
  }
  
  /**
   * Resume indexing after search completes
   */
  async resumeAfterSearch(): Promise<void> {
    if (this.pausedFolder) {
      this.logger.info(`SEARCH_PRIORITY: Resuming indexing for ${this.pausedFolder.config.name}`);
      
      // Reload the paused folder's model
      await this.unifiedModelFactory.loadModel(this.pausedFolder.config.modelId);
      this.logger.info(`SEARCH_PRIORITY: Reloaded model ${this.pausedFolder.config.modelId}`);
      
      this.currentItem = this.pausedFolder;
      this.pausedFolder = null;
      this.isPausedForSearch = false;
      
      // Continue indexing
      this.continueIndexing();
    }
  }
}
```

**Validation**:
```bash
# Check daemon logs for priority events
tail -f ~/.folder-mcp/daemon.log | grep SEARCH_PRIORITY
```

### 7.4 TMOAT Test Scripts

**File**: `TMOAT/test-search-priority.ts`

```typescript
#!/usr/bin/env tsx

/**
 * TMOAT Test: Search Priority System
 * 
 * Validates that semantic search interrupts indexing,
 * switches models if needed, and resumes correctly.
 */

import WebSocket from 'ws';

interface TestScenario {
  name: string;
  setup: () => Promise<void>;
  test: () => Promise<boolean>;
  cleanup: () => Promise<void>;
}

// Scenario A: Same model search (no switch needed)
const sameModelTest: TestScenario = {
  name: "Search same folder being indexed (no model switch)",
  
  async setup() {
    // 1. Clean daemon state
    await exec('rm -rf ~/.folder-mcp/');
    await exec('npm run daemon:restart');
    await wait(2000);
    
    // 2. Add folder with specific model
    await addFolder('/Users/hanan/Projects/folder-mcp', 'gpu:all-MiniLM-L6-v2');
    await wait(1000);
  },
  
  async test() {
    // Wait for indexing to start
    await waitForLog('Starting indexing for folder');
    
    // Trigger search on same folder
    const startTime = Date.now();
    const result = await searchMCP('typescript interface', { folder: 'folder-mcp' });
    const searchTime = Date.now() - startTime;
    
    // Validate results
    const hasResults = result.data.results.length > 0;
    const fastEnough = searchTime < 2000;
    const realScores = result.data.results.every(r => r.score > 0 && r.score <= 1);
    
    return hasResults && fastEnough && realScores;
  },
  
  async cleanup() {
    await removeAllFolders();
  }
};

// Scenario B: Different model search (switch required)
const differentModelTest: TestScenario = {
  name: "Search different folder (requires model switch)",
  
  async setup() {
    await exec('rm -rf ~/.folder-mcp/');
    await exec('npm run daemon:restart');
    await wait(2000);
    
    // Add two folders with different models
    await addFolder('/Users/hanan/Projects/folder-mcp', 'gpu:all-MiniLM-L6-v2', 'folderA');
    await addFolder('/tmp/test-docs', 'cpu:xenova-multilingual-e5-small', 'folderB');
    await wait(1000);
  },
  
  async test() {
    // Wait for folderA to start indexing
    await waitForLog('Starting indexing for folderA');
    
    // Search folderB while folderA is indexing
    const startTime = Date.now();
    const result = await searchMCP('test document', { folder: 'folderB' });
    const searchTime = Date.now() - startTime;
    
    // Check logs for proper sequence
    const logs = await getRecentLogs();
    const hasCorrectSequence = 
      logs.includes('SEARCH_PRIORITY: Pausing folder') &&
      logs.includes('SEARCH_PRIORITY: Unloading model gpu:all-MiniLM-L6-v2') &&
      logs.includes('SEARCH_PRIORITY: Loading model cpu:xenova-multilingual-e5-small') &&
      logs.includes('SEARCH_PRIORITY: Resuming indexing');
    
    return hasCorrectSequence && searchTime < 2000;
  },
  
  async cleanup() {
    await removeAllFolders();
  }
};

// Test runner
async function runTests() {
  const scenarios = [sameModelTest, differentModelTest];
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    
    try {
      await scenario.setup();
      const passed = await scenario.test();
      await scenario.cleanup();
      
      results.push({ name: scenario.name, passed });
      console.log(passed ? '✅ PASSED' : '❌ FAILED');
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      results.push({ name: scenario.name, passed: false });
    }
  }
  
  // Summary
  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n📊 Results: ${passedCount}/${results.length} tests passed`);
  process.exit(passedCount === results.length ? 0 : 1);
}

// Helper functions
async function addFolder(path: string, modelId: string, name?: string) { /* ... */ }
async function searchMCP(query: string, options: any) { /* ... */ }
async function waitForLog(pattern: string) { /* ... */ }
async function getRecentLogs() { /* ... */ }

if (require.main === module) {
  runTests();
}
```

**Usage**:
```bash
# Run the complete test suite
tsx TMOAT/test-search-priority.ts

# Run individual scenarios
tsx TMOAT/test-search-priority.ts --scenario same-model
tsx TMOAT/test-search-priority.ts --scenario different-model
```

## Manual Testing Steps

### Test A: Same Model (No Switch)
```bash
# 1. Setup
rm -rf ~/.folder-mcp/
npm run daemon:restart
tail -f ~/.folder-mcp/daemon.log &

# 2. Add folder and wait for indexing
# (Use TUI or daemon API)
# Add: /Users/hanan/Projects/folder-mcp with gpu:all-MiniLM-L6-v2

# 3. While indexing, trigger search
curl -X POST localhost:3001/mcp/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "typescript interface definition",
    "mode": "semantic",
    "filters": { "folder": "folder-mcp" }
  }'

# 4. Verify logs show NO model switch
# Should see: search without "SEARCH_PRIORITY: Unloading model"
```

### Test B: Different Model (Switch Required)
```bash
# 1. Setup
rm -rf ~/.folder-mcp/
npm run daemon:restart

# 2. Add two folders with different models
# Folder A: /Users/hanan/Projects/folder-mcp (gpu:all-MiniLM-L6-v2)
# Folder B: /tmp/docs (cpu:xenova-multilingual-e5-small)

# 3. Wait for Folder A to start indexing

# 4. Search Folder B while A is indexing
curl -X POST localhost:3001/mcp/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test document content",
    "mode": "semantic", 
    "filters": { "folder": "docs" }
  }'

# 5. Verify logs show model switch sequence:
grep -A 5 -B 5 "SEARCH_PRIORITY" ~/.folder-mcp/daemon.log
```

## Success Criteria Checklist

- [ ] Search uses the SAME model that indexed the folder
- [ ] MCP search endpoint returns real similarity scores (not mocked)
- [ ] Priority interruption pauses current indexing
- [ ] Model switching works: unload → load → search → unload → reload
- [ ] Daemon logs show complete pause/resume/switch sequence
- [ ] Search completes in <2 seconds
- [ ] Original indexing resumes with correct model after search
- [ ] No memory leaks or orphaned model processes
- [ ] Edge cases handled: non-existent folder, multiple rapid searches
- [ ] TMOAT test script validates all scenarios automatically

## Important Notes

1. **This is NOT full semantic search**: This implementation focuses on priority mechanism testing. Full multi-folder search with result aggregation is Task 12.

2. **Model management is key**: The success of this step depends on proper model loading/unloading in the UnifiedModelFactory.

3. **Logging is critical**: Comprehensive SEARCH_PRIORITY logs are essential for debugging and validation.

4. **Sequential processing advantage**: Our one-model-at-a-time approach makes priority switching simpler than multi-model systems.

## Troubleshooting

### Common Issues
- **No model switch logs**: Check if folders actually have different models
- **Search timeout**: Verify embedding service is responding with immediate=true
- **Wrong similarity scores**: Confirm same model is being used for query and stored vectors
- **Indexing doesn't resume**: Check for proper cleanup in resumeAfterSearch()

### Debug Commands
```bash
# Monitor daemon logs in real-time
tail -f ~/.folder-mcp/daemon.log | grep -E "(SEARCH_PRIORITY|model|pause|resume)"

# Check folder configurations
sqlite3 ~/.folder-mcp/config.db "SELECT name, modelId FROM folders;"

# Verify vector storage
ls -la ~/.folder-mcp/storage/

# Test embedding service directly
curl -X POST localhost:3001/debug/embed -d '{"text":"test","modelId":"gpu:all-MiniLM-L6-v2"}'
```