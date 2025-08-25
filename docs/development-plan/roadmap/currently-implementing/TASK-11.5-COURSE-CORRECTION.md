
*****BE A GOOD TMOAT AGENT*****
I would actually like this task to be tested hands-on.
You need to think like a human engineer. break this into verifiable tests to validate your assumptions rather than blindly changing a bunch of files and hoping you magically fixed all issues at the first shot. IT NEVER WORKS!
While you don't have access to the TUI because you cannot run interactive terminals. the TUI is just a presentation layer, our issues can be verified through other means.
we can query database files, see runtime files get changed or added, we can use TMOAT scripts to connect to websocket endpoints and listen for events or trigger actions.
We can place logs in the Daemon's logs. it need to run in a background service but we always can spawn a new one using `npm run daemon:restart`. this will kill any other instance of the daemon and will run a fresh one.
We can design end to end flows and see exactly where they fail. we have full visibility.
I would actually like this task to be tested hands-on.
You need to think like a human engineer. break this into verifiable tests to validate your assumptions rather than blindly changing a bunch of files and hoping you magically fixed all issues at the first shot. IT NEVER WORKS!
While you don't have access to the TUI because you cannot run interactive terminals. the TUI is just a presentation layer, our issues can be verified through other means.
we can query database files, see runtime files get changed or added, we can use TMOAT scripts to connect to websocket endpoints and listen for events or trigger actions.
We can place logs in the Daemon's logs. it need to run in a background service but we always can spawn a new one using `npm run daemon:restart`. this will kill any other instance of the daemon and will run a fresh one.
We can design end to end flows and see exactly where they fail. we have full visibility.

We need to understand where in the folder lifecycle process the problems resides.
We fix issues in the order they appear in the folder lifecycle, fixing "downloading model" issues before "indexing" issues for example.
We need to work systematically towards a well defined, measurable goal that can be performed end-to-end by an AI agent.
You will need a TMOAT Script to add and remove folders consistently and clean up between test iterations. see if you can utilize the existing TMOAT script that already does this.

******Course correction steps*******
*Step 1, verifying folder indexing using a pre-downloaded model:* [Completed]
1. adding a folder (the project's folder), verifying that it indexes fully and reports FMDM state perfectly.
2. see that a deamon restart doesn't re-index the entire folder.
3. remove the folder, check that .folder-mcp internal folder is also being removed.
use a pre- downloaded GPU model only at this stage.
once it works with this, and I will verify this entire flow using the TUI, we will proceed to downloading a new model.

*Step 2, verifying GPU model downloading:* [Completed]
1. Clear the model cache: rm -rf ~/.cache/huggingface/hub/models
2. Add a the project's folder to be indexed using "MiniLM-L12 (Fast)" model
3. Watch the download progress reporting in the FMDM, see that it enters the "downloading model" state, reporting progress properly, then moves on to scanning, indexing and finally active.
I will verify this entire flow using the TUI once you are done with the previous steps.

*Step 3, create unified model interface and sequential processing:* [Completed]
**Issue discovered**: Multi-model support broke our system because only Python models have priority queues and orchestration. ONNX and Ollama models have no priority system or keep-alive management.

**Solution**: Implement sequential folder indexing with unified model interface. ONE FOLDER INDEXES AT A TIME - this eliminates memory competition and complex orchestration.

1. Define IEmbeddingModel interface that ALL model types implement (Python, ONNX, Ollama)
2. Create FolderIndexingQueue in daemon - process one folder at a time
3. Create PythonModelBridge implementing the interface (wraps existing Python service)
4. Test: Verify Python models still work through the bridge with project folder

*Step 4, urgent model ID fixes for ONNX system:* [Completed]
**Issue discovered**: ONNX models cannot be found due to model ID mismatch between the curated registry and the codebase expectations.

**Root cause**: 
- Test/code expects: `e5-small-onnx`, `e5-large-onnx`
- Registry contains: `folder-mcp-lite:xenova-multilingual-e5-small`, `folder-mcp-lite:xenova-multilingual-e5-large`
- Model catalog structure changed from flat array to nested `gpuModels` and `cpuModels` objects

**Urgent fixes required**:
1. Standardize model ID references across the codebase
2. Update model type detection in FolderIndexingQueue to recognize `folder-mcp-lite:*` as ONNX models
3. Fix any hardcoded references to old model IDs
4. Verify ONNXDownloader and ONNXEmbeddingService can find models with new IDs
5. Test: Successfully download and initialize `folder-mcp-lite:xenova-multilingual-e5-small`

*Step 5, rebuild ONNX service with proper implementation:* [Completed]
note: to reset downloaded models between TMOAT tests run 'rm -rf ~/.cache/folder-mcp/onnx-models/'
1. Create ONNXModelBridge implementing IEmbeddingModel interface
2. Integrate ONNXModelBridge with UnifiedModelFactory
3. Implement proper model loading/unloading for ONNX
4. Add simple priority handling (immediate flag for semantic search)
5. Test: Download and use "folder-mcp-lite:xenova-multilingual-e5-large" model for indexing

*Step 6, sequential indexing verification:* [Completed]
1. Add 2 folders with different models (Python and ONNX)
2. Verify they index sequentially - only ONE at a time
3. Second folder should show status "pending" until first completes
4. Monitor FMDM state changes through the queue

*Step 7, semantic search priority with sequential indexing:* [Completed]
**Critical**: Search queries MUST be embedded with the same model used to index that folder.

1. Implement basic vector storage and search (see step-7-details.md for implementation)
2. Wire semantic search to use real embeddings with immediate=true flag
3. Add pause/resume capability to FolderIndexingQueue for priority interruption
4. TMOAT Test A: Search on same folder being indexed (same model, no switch)
5. TMOAT Test B: While folder A indexes, search folder B (different model, requires switch)
6. Verify in daemon logs: pause → model switch → search → resume sequence
7. Create test script to automate validation of priority mechanism

**Success**: Semantic search interrupts indexing, switches models if needed, completes <2s, resumes indexing.
**Details**: See docs/development-plan/roadmap/currently-implementing/step-7-semantic-search-details.md

**COMPLETED**: ✅ Step 7 implementation successful:
- BasicVectorSearchService with cosine similarity implemented
- MCP endpoints wired to use real embeddings with priority queue
- FolderIndexingQueue with pause/resume capability added
- TMOAT validation test created and passing
- Daemon connectivity and basic search functionality verified

*Step 8, rename model ID prefixes to hardware-based convention* [Not-Started]
**Simple refactor**: Change model ID prefixes to be hardware/provider-based for clarity.

**Old prefixes**:
- `folder-mcp:` → GPU/Python models
- `folder-mcp-lite:` → ONNX/CPU models

**New prefixes**:
- `gpu:` → Python models requiring GPU (e.g., `gpu:bge-m3`)
- `cpu:` → ONNX models optimized for CPU (e.g., `cpu:xenova-multilingual-e5-small`)
- `ollama:` → Ollama models (e.g., `ollama:nomic-embed-text`)

**Tasks**:
1. Search and replace in `src/config/curated-models.json`:
   - Replace `"folder-mcp:` with `"gpu:`
   - Replace `"folder-mcp-lite:` with `"cpu:`
2. Update any hardcoded model ID references in the codebase
3. Update model type detection logic to use new prefixes
4. TMOAT verification:
   - Add folder with `gpu:all-MiniLM-L6-v2`
   - Add folder with `cpu:xenova-multilingual-e5-small`
   - Verify both models are correctly identified and loaded

*Step 9, fix daemon takes long time to load, TUI windows waiting for a daemon to load* [Not-Started]
Since we started working on task 11.5, the daemon takes long time to load. the TUI terminal keeps retrying a connection until it responds:
TUI wait "ascii screenshot":
                            ⚠ folder-mcp service not running
                    The daemon is required for folder-mcp to function.
                          Please start the daemon and try again.

                               Attempt 4 - Next retry in 2s

                             Press enter to start the service
                                     Press esc to exit

**Note**: With sequential indexing implementation, startup should be FASTER because:
- No preloading of multiple models
- Models load only when their folder starts indexing
- FolderIndexingQueue starts empty

1. run a daemon instance in the background and monitor it's logs.
2. analyze what actions are delaying the startup process (should be improved now).
3. based on the previous step, we should decide: If the delayed startup can't be avoided we should come up with a better TUI wait screen. I prefer optimizing the startup process.

*Step 10, Remove duplicate metadata JSON storage:* [Not-Started]
We discovered an incomplete migration from file-based caching to SQLite storage, causing duplicate data storage:
1. JSON files in `.folder-mcp/metadata/` contain the same chunk data that's already in the SQLite database
2. These files are created during indexing but never actually used (except for fingerprint tracking in IncrementalIndexer)
3. This wastes disk space and creates confusion about the source of truth

Tasks:
1. Stop creating metadata JSON files in `src/application/indexing/orchestrator.ts` and `src/application/indexing/pipeline.ts`
2. Remove the `saveToCache(..., 'metadata')` calls - the data is already saved to SQLite
3. Update IncrementalIndexer to use the SQLite database for fingerprint tracking instead of JSON cache
4. task validation: Remove the project's folder from indexing list, then re-add it. check if the metadata folder was created.
5. Update tests to not expect metadata JSON files

Testing:
1. Remove the project's folder from indexing list
2. Index the project's folder and verify NO JSON files are created in `.folder-mcp/metadata/`
3. Verify all chunk data is properly stored in SQLite: `sqlite3 .folder-mcp/embeddings.db "SELECT COUNT(*) FROM chunks;"`
4. Test incremental indexing still detects changes without the JSON cache
5. Ensure search endpoints can retrieve chunks from SQLite only

*Step 11, setting default model automatically:* [Not-Started]
All models are working perfectly at this stage with sequential processing. now we need to set the default one.
1. The logic to choose the default model should be: "The best quality model available for your machine's hardware and software."
2. Check for GPU and memory availability.
3. **Simplified with sequential processing**: No need to allocate memory budgets for multiple models - just ensure single model fits.
4. Register chosen default with FolderIndexingQueue.
We have a recommendation engine in place that can help with this decision. but it should be done once per daemon instance. the hardware doesn't change frequently, so this is a reasonable approach.

*Step 12, verify model picking robustness using TMOAT* [Not-Started]
- Create a set of test cases that cover various hardware configurations (e.g., different GPU/CPU combinations, memory sizes).
- For each test case, use the TMOAT method to simulate the folder indexing process.
- Verify that the correct model is selected based on the machine's capabilities.
1. verify that python proccess is not loaded at all unless we pick a python-based model.
2. verify that models re-download if they are not present locally when trying to load them.
3. **Sequential processing**: verify only ONE model loads at a time, others wait in queue.

*Step 13, sequential processing robustness verification* [Not-Started]
TMOAT comprehensive test of the sequential indexing system:
1. Setup test scenario:
   - Folder A: Python model (gpu:all-MiniLM-L6-v2)
   - Folder B: ONNX model (cpu:xenova-multilingual-e5-small)  
   - Folder C: Different Python model (gpu:all-mpnet-base-v2)
2. Add all three folders simultaneously to daemon
3. Verify sequential processing:
   - Only Folder A starts indexing immediately
   - Folders B,C show status "pending" in FMDM
   - When A completes → B starts automatically
   - When B completes → C starts automatically
4. Test semantic search interruption:
   - While B is indexing, trigger semantic search on A
   - Verify: B pauses → A's model loads → search completes → B's model reloads → B continues
5. Test queue management:
   - Add/remove folders while others are indexing
   - Test daemon restart with active queue
   - Test model download failure (should skip folder, continue queue)

*Step 14, performance and resource verification* [Not-Started]
Final verification of the sequential system:
1. Monitor memory usage stays predictable (only one model at a time)
2. Test edge cases: Out of memory during model load (should fail gracefully)
3. Verify semantic search response times (should be fast - no model competition)
4. Test with larger folders to verify system remains responsive
5. Ensure FMDM updates correctly show queue position and current processing folder