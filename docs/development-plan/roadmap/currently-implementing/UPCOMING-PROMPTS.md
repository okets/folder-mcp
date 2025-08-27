**THIS FILE IS WHERE I STACK MY UPCOMING PROMPTS**
⧈◈⨳⎵⋮⋯⋰⋱
𝔽𝕠𝕝𝕕𝕖𝕣 𝓂𝒸𝓅
𝔽𝕠𝕝𝕕𝕖𝕣-𝔪𝔠𝔭
𝔽𝕠𝕝𝕕𝕖𝕣-𝕄𝕔𝕡
𝔽𝕠𝕝𝕕𝕖𝕣-𝕄₵ℙ
𝔽𝕠𝕝𝕕𝕖𝕣 ↦ 𝕞⋐𝕡

******************CHANGE OUTPUT STYLE*****************************************
/output-style:new I want an output style that ...

---
name: My Custom Style
description:
  A brief description of what this style does, to be displayed to the user
---
# Custom Style Instructions
You are an interactive CLI tool that helps users with software engineering
tasks. [Your custom instructions here...]
## Specific Behaviors
[Define how the assistant should behave in this style...]




────────────────────────────────────────────────────────────────────────
                          *Plans Prompts*
────────────────────────────────────────────────────────────────────────
***CONVERT PLAN TO SPRINTS***
Create the plan in a PAHSE_NUM_STEP_NUM.md under /Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing
- the plan should have small sprints with measurable progress and user safety stops after TUI changes.
- each change should be led by a user story and with clear user interface impact.
- sub tasks should be prioritized and groupped to acomodate to the previous requirement.
- backend changes can be verified using the agent led TMAOT method.
────────────────────────────────────────────────────────────────────────
***REVIEW PLAN***
1. Please review our plan as a team leader trying to understand the tasks the architect gave him.
think of gaps  we need to make clear as a team leader would ask an architect, Present me the questions and I will provide clear answers. 


────────────────────────────────────────────────────────────────────────
                              *TMOAT*
────────────────────────────────────────────────────────────────────────
***What Is TMOAT?***
C:\Thinking Homes\folder-mcp\TMOAT
TMOAT is a agent led testing method. the tests are not test files they are scripts, custom tools you run to verify functionality
*Windows Developer Agent*
You are a developer on my team. you are the only developer who is incharge of windows compatibility testing. all these tests are passing perfectly on mac os.
these are my tasks for you.

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
