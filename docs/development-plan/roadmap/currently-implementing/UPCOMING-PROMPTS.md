**THIS FILE IS WHERE I STACK MY UPCOMING PROMPTS**
⧈◈⨳⎵⋮⋯⋰⋱
𝔽𝕠𝕝𝕕𝕖𝕣 𝓂𝒸𝓅
𝔽𝕠𝕝𝕕𝕖𝕣-𝔪𝔠𝔭
𝔽𝕠𝕝𝕕𝕖𝕣-𝕄𝕔𝕡
𝔽𝕠𝕝𝕕𝕖𝕣-𝕄₵ℙ
𝔽𝕠𝕝𝕕𝕖𝕣 ↦ 𝕞⋐𝕡

***What Is TMOAT?***
C:\Thinking Homes\folder-mcp\TMOAT

TMOAT is a agent led testing method. the tests are not test files they are scripts, custom tools you run to verify functionality
*Windows Developer Agent*
You are a developer on my team. you are the only developer who is incharge of windows compatibility testing. all these tests are passing perfectly on mac os.
these are my tasks for you.


***Requested:***
I call subtask completed. embeddings storage is robust!
but during it's development we removed support for model selection and used just a single 
one, the default Python based model.
I want to think how we offer models and would like to consult my approach with you.
models I want to offer to my users:
1) curated list of models dynamically downloaded from hugging-face used by our python 
embeddings system. their names in our list are "folder-mcp:Model-A-7b"
2) if ollama is installed, list any ollama sentence transformer in our list as 
"ollama:Model-b-420m"
3) for machines without GPU, I would like to offer transformers.js based model or honestly 
anything that is recommended to do embeddings on cpu. I really need good recommendation here.
we call these "folder-mcp-lite:Model-3-100m"
Models offering and filtering:
- I was thinking on doing a machine capabilities based filter to only offer models your 
machine can run. so we should check for gpu,memory...etc and offer only models that can run 
or warn about slowness. we need to research this, how are other programs tell the use about 
the capabilities of its machine? does hugging-face have APIs or guidlines for that?
- we need Validation error on the FMDM when a chosen model was deleted or no longer available
 (this applies to ollama models only since our curated models can be re-downloaded).
- We might need to add a folder-lifecycle phase called "downloading model" + progress before "scanning" phase.

------------------------------------------------------

your plan is a bit confusing. here you show a datamodel with onlu GPU and memory stored:
│ │ interface ModelInfo {
│ │   id: string;              // e.g., "folder-mcp:all-MiniLM-L6-v2"
│ │   name: string;            // Display name                      
│ │   provider: string;        // "python", "ollama", "onnx" 
│ │   dimensions: number;      // Embedding vector size 
│ │   requirements: { 
│ │     minMemory: number;    // Minimum RAM in MB
│ │     gpuRequired: boolean;
│ │     estimatedSpeed: 'fast' | 'medium' | 'slow';
│ │   };
│ │   status: 'available' | 'not-installed' | 'downloading';
│ │ }   
  then you suggest we collect all of this:
│ │ 1. Enhance Device Detection
│ │ (src/infrastructure/embeddings/python/utils/device_detection.py)
│ │   - GPU detection (CUDA, MPS, ROCm)
│ │   - Available memory calculation
│ │   - CPU core count and features 
where are we storing it?
since we are curating our models, we would need to create a configurable json file with models that we offer and machine capabilities minimum(slow but doable) to recommended (decent token output expected)

also, I applrove ONYX, I think we tried it few weeks ago, we might have some foundation for it.

---------------------------------------
1. a cpu capabilities check should be done even for machines with gpu. sometimes the CPU has more memory and can run better models. (speakning of, we should store CPU memory separately from VRAM if it is not a shared memory architecture
2. I don't think we should scan the folder to detect language. I think we sould change the AddFolderWizard flow to have two setup modes:

Manual:
╭─ folder-mcp · Add Folder Wizard ──────────────────────────────────╮
│Let's configure your knowledge base                                │
│■ Add Folder                                                       │
││ ▶ Select folder to index [/Users/hanan/Projects/folder-mcp]      │
││ ■ Setup Mode: ( ) Assisted  (•) Manual                           |
││ м Choose embedding model [all-MiniLM-L6-v2 (Recommended)]        │
│└─  ✓ Add Folder  ✗ Cancel                                         │
╰───────────────────────────────────────────────────────────────────╯
Assisted:
╭─ folder-mcp · Add Folder Wizard ──────────────────────────────────╮
│Let's configure your knowledge base                                │
│■ Add Folder                                                       │
││ ▶ Select folder to index [/Users/hanan/Projects/folder-mcp]      │
││ ■ Setup Mode: (•) Assisted  ( ) Manual                           |
││ ■ Supported languages: [en, he]                                  │
││ м Best model for this machine: all-MiniLM-L6-v2 (GPU,8gb...etc.) │
│└─  ✓ Add Folder  ✗ Cancel                                         │
╰───────────────────────────────────────────────────────────────────╯

---------------------------------------
CONVERT PLAN TO SPRINTS
Create the plan in a PAHSE_NUM_STEP_NUM.md under /Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing
- the plan should have small sprints with measurable progress and user safety stops after TUI changes.
- each change should be led by a user story and with clear user interface impact.
- sub tasks should be prioritized and groupped to acomodate to the previous requirement.
- backend changes can be verified using the agent led TMAOT method.

---------------------------------------
REVIEW PLAN
1. Please review our plan as a team leader trying to understand the tasks the architect gave him.
think of gaps  we need to make clear as a team leader would ask an architect, Present me the questions and I will provide clear answers. 


***Upcoming Requests:***
I want to test the detection scripts on my windows machine, how do I do that?



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





We are working on '/Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/TASK-11.5-COURSE-CORRECTION.md'
if you would like to understand what task 11.5 was, this is the documentation:
'/Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/Phase-8-task-11.5-models-offering.md'
We continue our session after fixing few issues using this method:
'/Users/hanan/Projects/folder-mcp/TMOAT/debugging-methodology.md'
We will continue our session with me telling you issues I see during my QA and you fixing them one by one until the course is aligned and task 11.5 is fully completed


──────────────────────────────────────────────────────────────────────────────────
our next issue is related the the folder lifecycle FMDM reporting.
This is the behavior I observe:
1. adding a folder using the AddFolderWizard. choosing a model that is already downloaded. [Image #1]
2. it shows "indexing 3%" for a while [Image #2] then shows "active" [Image #3] seems like the progress reporting is a bit broken.

the next thing I am going to QA is adding a big model we haven't downloaded before and would like to see the progress reported correctly.
Your task is to review the folder lifecycle process and how it reports progress to the FMDM.
You can write TMOAT scripts to gain better understanding than just reading code but
don't make any changes to the codebase until we have a good understanding of the
issues.


────────────────────────────────────────────────────────────────────────
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

Now, let's redefine the task at hand:
We need to understand where in the folder lifecycle process the problems resides.
We fix issues in the order they appear in the folder lifecycle, fixing "downloading model" issues before "indexing" issues for example.
We need to work systematically towards a well defined, measurable goal that can be performed end-to-end by an AI agent.
You will need a TMOAT Script to add and remove folders consistently and clean up between test iterations. see if you can utilize the existing TMOAT script that already does this.

Now, let's redefine the task at hand:
We need to understand where in the folder lifecycle process the problems resides.
We fix issues in the order they appear in the folder lifecycle, fixing "downloading model" issues before "indexing" issues for example.
We need to work systematically towards a well defined, measurable goal that can be performed end-to-end by an AI agent.




────────────────────────────────────────────────────────────────────

────────────────────────────────────────────────────────────────────
follow this TMOAT procedure to verify success:
1. Run a daemon in the background. monitor it's output byt dumping it to a file you can read later in the investigation stage.
2. use the websocket API to remove the project's folder from indexing.
3. verify that ...

────────────────────────────────────────────────────────────────────

I remind you that we don't go and blindly change code hoping we fixed an issue. you as an agent can run bash commands and access the daemon's websocket using scripts. we are on a correct course task and should be very careful!
Be a good TMOAT agent!



Please erase all local models. I want to see how fast each takes myself.

1. the model is downloading behind the scenes. but the TUI shows something timed out before it downloads.[Image #1]
2. We invested effort in download progress and progress simulation for model downloading. can't we show a live status update the way we do for indexing?