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
**2. TMOAT IT UP!**
I love this approach.
let me tell you my requirements for verifications for each user story.
1. for user stories that starts with "As an LLM", they should be verified by a custom subagent that we create that can run our MCP server.
this is the specification of creating a custom agent: 
https://docs.anthropic.com/en/docs/claude-code/sub-agents
using a subagent to test the mcp endpoints will speed development significantly. creating this subagent and adding our mcp endpoints to claude code should be a task in this phase.
2. backend changes must be verified using the TMOAT method.
  ***BE A GOOD TMOAT AGENT***
This task to be tested hands-on.
You need to think like a human engineer. break this into verifiable tests to validate your assumptions
rather than blindly changing a bunch of files and hoping you magically fixed all issues at the first shot. IT NEVER WORKS!
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
3. TUI changes cannot be tested by an agent since you cannot run interactive terminals. these are the only tests that must be verified by a human in the loop.

────────────────────────────────────────────────────────────────────────
                              *TMOAT*
────────────────────────────────────────────────────────────────────────
***BE A GOOD TMOAT AGENT***
This task to be tested hands-on.
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


*** TMOAT Reminder ***
I remind you that we don't go and blindly change code hoping we fixed an issue. you as an agent can run bash commands and access the daemon's websocket using scripts. we are on a correct course task and should be very careful!
Be a good TMOAT agent!

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