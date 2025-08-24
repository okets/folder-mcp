
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

*Step 3, verifying CPU, ONNX model downloading and indexing:* [Next]
1. Add a new folder to be indexed using the downloaded "○ E5-Large ONNX (High Accuracy)" model.
2. Add a the project's folder to be indexed using "MiniLM-L12 (Fast)" model
3. Watch the download progress reporting in the FMDM, see that it enters the "downloading model" state, reporting progress properly, then moves on to scanning, indexing and finally active.

*step 4, fix daemon takes long time to load, TUI windows waiting for a daemon to load* [Not-Started]
Since we started working on task 11.5, the daemon takes long time to load. the TUI terminal keeps retrying a connection until it responds:
TUI wait "ascii screenshot":
                            ⚠ folder-mcp service not running
                    The daemon is required for folder-mcp to function.
                          Please start the daemon and try again.

                               Attempt 4 - Next retry in 2s

                             Press enter to start the service
                                     Press esc to exit

1. run a daemon instance in the background and monitor it's logs.
2. analyze what actions are delaying the startup process.
3. based on the previous step, we should decide: If the delayed startup can't be avoided we should come up with a better TUI wait screen. I prefer optimizing the startup process.

*Step 5, Remove duplicate metadata JSON storage:* [Not-Started]
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

*Step 6, setting default model automatically:* [Not-Started]
All models are working perfectly at this stage. now we need to set the default one.
1. The logic to choose the default model should be: "The best quality model available for your machine's hardware and software."
check for GPU and memory availability.
We have a recommendation engine in place that can help with this decision. but it should be done once per daemon instance. the hardware doesn't change frequently, so this is a reasonable approach.
