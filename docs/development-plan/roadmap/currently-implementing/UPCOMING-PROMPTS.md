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


*** TMOAT Reminder ***
I remind you that we don't go and blindly change code hoping we fixed an issue.
Also, remember that we are still in pre-production phase. we don't need to maintain backwards compatibility or design any migration plans. we don't keep stale code.
fix documentation spam if you encounter it (don't hesitate to remove unnecessary comments or logs)
You as an agent can run bash commands, can call our endpoints directly using folder-mcp mcp server,  query databases and even access the daemon's websocket using scripts to add/remove folders from the indexing list. we are on a correct course task and should be very careful!
Be a good TMOAT agent and verify your changes! it doesn't have to be on every single change, but it should be done regularly to ensure stability and correctness.

────────────────────────────────────────────────────────────────────
                     ***Upcoming Prompts***
────────────────────────────────────────────────────────────────────
Lets start working on '/Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/Phase-9-Implementation-epic.md' 
We are working one task at a time, start sprint 1, task 1.
I just want to make it clear we're not eliminating the CLI parameter -d, We are removing the need to specify folders in the mcp connection string only.
let me know when the test passes.


I want you to help me create an epic document from the PRD "/Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/Phase-9-PRD-MCP-Endpoints-Multi-Folder-Support.md"
**Epic Creation Guidelines:**
File name: Phase-9-Implementation-epic.md
The plan should be linear, straightforward, and builds functionality incrementally. Each sprint delivers working, testable functionality without complex dependencies.
I will lay out the the steps we need to take in order to transition from the single-folder, old mcp endpoints to the new, multi-folder multi-model architecture.
Background: 
- our current MCP endpoints runs off /Users/hanan/Projects/folder-mcp/src/mcp-server.ts
- this predates our Daemon and also doesn't work anymore as we changed the architecture.
- MCP endpoints connected through REST API or Json RPC

** Epic Sprints Roadmap **
I plan to transition our endpoints one by one under the Deamon's control. create an Agent led, revolutionary debugging method and work gradually towards transitioning ALL current endpoints to our new Multi-folder, Multi-model architecture.
1. Create REST server under the control of the Daemon.
The Daemon controls when it starts and also makes all internal Daemon functionallity available for the endpoints so we build upon existing functionality instead of building bridges.
2. Have the Daemon manage the lifecycle of the endpoints, including starting and stopping them as needed. exposing the REST API and JSON RPC functionality.
3. Migrate the simplest endpoint out of the old interface into the new interface. refactor the code to use the new multi-folder structure.
4. At this point, once the daemon is running we have an MCP server with one endpoint migrated to the new architecture. now it's time for the revolutionary Agent led method to take over.
after moving the mcp endpoint to the daemon, removing the mandatory folder param and supporting multi-folder for a simple endpoint, I would like to add a sprint for creating Claude-code agent led testing:
- Add our project as an mcp server to claude code.
- Create a specialized testing agent that only uses the MCP, no other tools. it should be tasked with testing the endpoints directly and be our mcp client for the TMOAT tests.
being able to instantly figure out how our change is reflected all the way to the MCP clients will revolutionize how we develop.
- the following tasks should be centered around this ability, every change to the endpoints will be validated using that subagent
5. Migrate the rest of the endpoints, one by one, each in it's own sprint. tested by the new subagent that can actually see the changes.

The goal is to have all endpoints migrated to the new architecture as described in the PRD and fully tested by the agent.
If the PRD has contradicting instructions, these instructions take precedence. tell me if you find any discrepancies.


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
─────────────────────────────────────────────────────────────────────────────────────
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
─────────────────────────────────────────────────────────────────────────────────────
-------------------Code Rabbit
My automated code review suggested the following changes. I trust your judgment better so treat the recommendations with critical thinking!
The automated Code review system does not know what we worked on. I want you to: 
- read /Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/Phase-9-Implementation-epic.md
- read the commit messages for all of the changes in our branch. Once you understand the tasks We worked on during this sprint you should evaluate each of the suggestions.
- Don't fix anything yet!
- decide which suggestions are valid and which do not.
- group related valid suggestions together.
- create an md file with the groupped task list.

MY Code review system's suggestions:


----------
