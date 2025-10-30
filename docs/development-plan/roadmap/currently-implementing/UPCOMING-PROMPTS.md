**THIS FILE IS WHERE I STACK MY UPCOMING PROMPTS**
⧈◈⨳⎵⋮⋯⋰⋱ 
𝔽𝕠𝕝𝕕𝕖𝕣 𝓂𝒸𝓅 𝔽𝕠𝕝𝕕𝕖𝕣-𝔪𝔠𝔭 𝔽𝕠𝕝𝕕𝕖𝕣-𝕄𝕔𝕡 𝔽𝕠𝕝𝕕𝕖𝕣-𝕄₵ℙ 𝔽𝕠𝕝𝕕𝕖𝕣 ↦ 𝕞⋐𝕡

────────────────────────────────────────────────────────────────────────
                          *Plans Prompts*
────────────────────────────────────────────────────────────────────────
***CONVERT PLAN TO SPRINTS***
Create the plan in a PAHSE_NUM_STEP_NUM.md under /Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing
- the plan should have small sprints with measurable progress and user safety stops after TUI changes.
- each change should be led by a user story and with clear user interface impact.
- sub tasks should be prioritized and groupped to acomodate to the previous requirement.
- backend changes must be verified using the agent led TMAOT method.

*** A NEW VERSION OF THE ABOVE ***
Let's create a plan in an MD document for sprint 10. get technical but don't get into implementation details.
- each of the phases should be led by user stories where the user is YOU,
the mcp client Claude.
- each change should be led by a user story and with clear user interface
impact.
- sub tasks should be prioritized and groupped to acomodate to the
previous requirement.
the main user story for the sprint (kind of the grand finale, e2e test) is
running subagent with a blank context to fetch information we know exists
in our indexed folder and see if it was a smooth experience for him. if
he knew what to look for, if the process was clear and so on.
the subagent should ALWAYS fill a survey rating our interface on relevant
metrics measured by a range going from very confusing to very
straightforward.
Think really hard how we can make this sprint make us the leaders of our
industry by understanding how to serve AI agents.
────────────────────────────────────────────────────────────────────────
***REVIEW PLAN***
1. Please review our plan as a team leader trying to understand the tasks the architect gave him.
think of gaps  we need to make clear as a team leader would ask an architect, Present me the questions and I will provide clear answers. 

────────────────────────────────────────────────────────────────────────
***1. Implement with SCRUM***
For this task, I want to try implementing with SCRUM. I never tried scrum and would like to be guided through the method as we proceed.
I need you to act as a scrum master tasked with this prd:
'/Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/Phase-9-MCP-Endpoints-Multi-Folder-Support.md'
explain your thought process and your prioritization. if you use SCRUM terms give a short explaination of what the term is the first time you use it.

────────────────────────────────────────────────────────────────────────
***Sprint Complete, cleanup before commit***
 This sprint is now complete.
   Go over the changes, some work was done in another context window.
   1. Fix comments, we leave a lot of obscure comments such as we work such as "Sprint 12 fix" or "task 5- add buffer".
   comments should be helpful, not confusing. fix the comments in all changed files.
   2. standardize logging formats and improve readability. keep helpful logs, remove
   spam or repetitive messages. A lot of messages from the same loop. and general
   spamming of the logs.
────────────────────────────────────────────────────────────────────────
                              *TMOAT*
────────────────────────────────────────────────────────────────────────
***BE A GOOD TMOAT AGENT***
This task is to be tested and built using an agent-led-testing approach.
You need to think like a human engineer. break your assignments into verifiable tests to validate your assumptions rather than blindly changing a bunch of files and hoping you magically fixed all issues at the first shot. IT NEVER WORKS!
While you don't have access to the TUI because you cannot run interactive terminals. the TUI is just a presentation layer, our issues can be verified through other means.
TOOLS A GOOD TMOAT AGENT WILL USE:
1. Query database files using sqlite3.
2. See runtime files gets changed or added using file system.
3. Use TMOAT scripts to connect to websocket endpoints and listen for events, listen to FMDM stream or trigger actions. (see ./TMOAT folder for examples)
4. Run deamon in the background on demand: 
- place logs in the Daemon's logs.
- run `npm run daemon:restart` in a BACKGROUND, long running process. this command will kill any other instance of the daemon and will run a fresh one.
5. Call MCP endpoints directly using `folder-mcp mcp server` command. This is the ultimate test for any change we make. if the MCP endpoints work, we are good.
If a human is needed for reconnecting the MCP server STOP your work and ask for a human to reconnect the MCP server. (we are working on it live, it might be disconnected when we kill the daemon during development)
6. Trigger re-indexing: remove the .folder-mcp folder (delete the database folder), then restart the daemon in the background.

/Users/hanan/Projects/folder-mcp (our project's folder) is one of the indexed folders. we can use it to test our changes. as we know exactly what files are there and what content is in them. we can use it to test our changes.

We can design end to end flows and see exactly where they fail. we have full visibility!

We need to understand where in the folder lifecycle process the problems resides.
We fix issues in the order they appear in the folder lifecycle, fixing "downloading model" issues before "indexing" issues for example.
We need to work systematically towards a well defined, measurable goal that can be performed end-to-end by an AI agent.

I remind you that we are in pre production and do not need to keep ANY backwards compatibility! we do what is logically right and remove stale code!
We write informative comments, not "task 2 related" type of comments you like to leave. if you encounter bad documentation, fix/remove it.

*** TMOAT Reminder ***
I remind you that we don't go and blindly change code hoping we fixed an issue.
Also, remember that we are still in pre-production phase. we don't need to maintain backwards compatibility or design any migration plans. we don't keep stale code.
fix documentation spam if you encounter it (don't hesitate to remove unnecessary comments or logs)
You as an agent can run bash commands, can call our endpoints directly using folder-mcp mcp server,  query databases and even access the daemon's websocket using scripts to add/remove folders from the indexing list. we are on a correct course task and should be very careful!
Be a good TMOAT agent and verify your changes! it doesn't have to be on every single change, but it should be done regularly to ensure stability and correctness.


─────────────────────────────────────────────────────────────────────────────
-------------------           Code Rabbit        ----------------------------
─────────────────────────────────────────────────────────────────────────────
My automated code review suggested the following changes. I trust your judgment better so treat the recommendations with critical thinking!
The automated Code review system does not know what we worked on. I want you to: 
- read the sprint and epic documents.
- Once you understand the tasks We worked on during this sprint you should evaluate each of the suggestions.
- Don't fix anything yet!
- decide which suggestions are valid and which do not.
- group related valid suggestions together.
- create an md file with the groupped task list.
- the automated code review system might suggest changes that contradict our instruction to never silently fall back when critical errors happen. we want to fail loudly and visibly so we can fix the root cause. do not accept suggestions that contradict this principle.
- the automated code review system might suggest changes that contradict our instruction not keep backwards compatibility. we are in pre-production and can do radical changes. do not accept suggestions that contradict this principle.

MY Code review system's suggestions:
1. 

-----------------------------agent-to-endpoint
agent-to-endpoint testing using project's directory indexing:
You are ignoring the fact that the folder mcp project is indexed in the folder mcp. So basically every md file that you have access to also is indexed, our tests/fixtures folder also contains many documents. read them directly and through the endpoints. this will be much faste

search memory mcp on how we do agent-to-endpoint testing. it doesn't involve creating scripts. its direct polling by using the mcp server we are building as a tool.
agent-to-endpoint is not TMOAT, both serve similar purposes but when testing endpoints, a2e is superior. I want you to add an agent-to-endpoint testing instructions. Think like a human. A human would have looked at the project which is indexed by the folder-mcp system, Would have asked a question that it already knows the answer for. Then compare the result with the answer it expected to get.You can read files, specific files within our project's document and use the endpoint to see if you get real information. You have access for both the project and its files and the endpoints that query the same files.

Think of it like this: The key insight is that A2E testing means I, as the agent, AM the test - using the MCP tools directly to validate the system works as expected. This is far superior to writing test
  scripts because:
  1. It tests the actual tools that end users will use
  2. It validates the real integration, not a simulation
  3. It catches issues like the search index cleanup problem that a script might miss
----------------------------end-to-end TMOAT+agent-to-endpoint
Let me tell you how to run this test end-to-end using a mix of TMOAT and agent-to-endpoint techniques.
If anything fails during this process we fix the root cause and we start the entire sequence over again.
TMOAT part:
1. run the daemon in a background service using 'npm run daemon:restart' no need to kill previous instances, the daemon:restart will handle this for you. monitor the logs when you need to figure out what the daemon is doing.
2. connect to the websocket interface, Remove  /Users/hanan/Projects/folder-mcp from indexing list. if we are testing multiple folders, remove /Users/hanan/Projects/folder-mcp-copy too. (The ./TMOAT folder contains a lot of scripts that does this exactly, see how they connect and copy the behavior)
3. Monitor the FMDM and query the database embeddings directly. see if the indexing went as expected. (Again, look at the ./TMOAT folder for examples)
4. Then re-add the folders using the model you want to test (Python or ONNX or one of each). monitor the indexing process closely.
A2E part:
now that the indexing works, you can start testing the endpoints directly. Use the MCP server to query the indexed documents and verify the responses.
If you need a Human to reconnect the MCP. (we are working on it live, it might be disconnected when we kill the daemon during development)

This is a foolproof way to test everything about our system.
──────────────────────────────────────────────────────────────────────────────
---------------------Next Tasks
**Ultimate end to end test**
I want to test that all of our curated models are working properly.
To do so, we need to create a simple but very effective TMOAT + agent-to-endpoint test suite.
This is the flow:
1. Run the daemon in a background process.
2. Connect to the websocket interface and remove the folders from the indexing list.
We offer 5 models, 2 CPU and 3 GPU models. *Run this test 5 times! one for each model*
 - Add the following folder path to the indexing list using the websocket interface: /Users/hanan/Projects/folder-mcp/tmp/small-test-folder
 - once indexing is finished, add a text file with a secret to the folder something like "Cats likes blue bananas". it should be picked up and indexed right away. (use a different secret for each model)
 - query the database, see that the embeddings are correct and using the same dimensions as the selected model.
 - now YOU are the final test! use folder-mcp mcp server and use the semantic search endpoint to ask about the secret. see if it's being fetched.

**planning Ollama support:**
in /Users/hanan/Projects/folder-mcp/src/config/model-registry.ts
this method: getModelsByBackend(backend: 'python' | 'onnx' | 'ollama'): any[]
should return installed Ollama models.


────────────────────────────────────────────────────────────────────
                     ***Smoke test***
────────────────────────────────────────────────────────────────────
There are our currently 5 indexed folders, one for each curated model.
DB path example: tmp/cpu-xenova-multilingual-e5-large/.folder-mcp/embeddings.db
the folders are:
/Users/hanan/Projects/folder-mcp/tmp/cpu-xenova-multilingual-e5-large
/Users/hanan/Projects/folder-mcp/tmp/cpu-xenova-multilingual-e5-small
/Users/hanan/Projects/folder-mcp/tmp/gpu-bge-m3
/Users/hanan/Projects/folder-mcp/tmp/gpu-minilm-l12-fast
/Users/hanan/Projects/folder-mcp/tmp/gpu-xenova-multilingual-e5-large
Run the test routine to trigger re-indexing: 
1. for each of our indexed folders, remove the .folder-mcp folder we created that contains our database files.
2. kill any running daemon and run a new instance of our daemon in the background using this single command 'npm run daemon:restart'
3. read the daemon logs, wait for all folders to index fully, check the databases, see that we managed to index all 5 folders one by one successfully.

Note: the full test might take a while, don't give up, sleep for 2 minutes between each progress check.

────────────────────────────────────────────────────────────────────
                     ***Post Sprint Review Checklist***
────────────────────────────────────────────────────────────────────
next, lets figure out if ADD/UPDATE/REMOVE document's records updates the database properly.
we implemented a manual synchronization mechanism between vec tables (containing embeddings) and regular tables. it is time to test it.
- Our daemon monitors changes to indexed folders, while the daemon is running in the background:
1. verify deletion of a file removes it and it's embeddings from the database for all the chunks and the document itself. (please verify they actually existed before you delete the file)
the folders have change tracking, so removing a file should remove it from the database.
2. verify that changing a file's content removes it and re-adds it's data and embeddings properly.


next, delete all files from all indexed folders except folder-mcp-roadmap-1.1.md (that exists in all of them). after a while test that the database only contains records for that file both in the regular tables and the vec tables.


