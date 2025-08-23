
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

*Step 2, verifying GPU model downloading:* [in progress]
1. Clear the model cache: rm -rf ~/.cache/torch/sentence_transformers/
2. Add a the project's folder to be indexed using "MiniLM-L12 (Fast)" model
3. Watch the download progress reporting in the FMDM, see that it enters the "downloading model" state, reporting progress properly, then moves on to scanning, indexing and finally active.
I will verify this entire flow using the TUI once you are done with the previous steps.


*Step 3, verifying CPU, ONYX model downloading and indexing:* [Not Started]
1. Add a new folder to be indexed using the downloaded "○ E5-Large ONNX (High Accuracy)" model.
2. Add a the project's folder to be indexed using "MiniLM-L12 (Fast)" model
3. Watch the download progress reporting in the FMDM, see that it enters the "downloading model" state, reporting progress properly, then moves on to scanning, indexing and finally active.
I will verify this entire flow using the TUI once you are done with the previous steps.