**THIS FILE IS WHERE I STACK MY UPCOMING PROMPTS**
⧈◈⨳⎵⋮⋯⋰⋱
𝔽𝕠𝕝𝕕𝕖𝕣 𝓂𝒸𝓅
𝔽𝕠𝕝𝕕𝕖𝕣-𝔪𝔠𝔭
𝔽𝕠𝕝𝕕𝕖𝕣-𝕄𝕔𝕡
𝔽𝕠𝕝𝕕𝕖𝕣-𝕄₵ℙ
𝔽𝕠𝕝𝕕𝕖𝕣 ↦ 𝕞⋐𝕡

***after indexing process is perfected, I want to work on the available models lists:***
- I want to discuss the list of sentence transformers we are about to offer. We need to list existing ollama sentence transformers the user might have installed.
As for our python offerings, I want to offer few, but I don’t want to download all of them, just cache them as they first download.
- Validation error on the FMDM when a chosen model was deleted (llama only our models can be re-downloaded).


***Next:***
I call subtask 
 completed. embeddings storage is robust!
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
1. create the plan in a Phase-8-task-11.5-models-offering.md under /Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing
- the plan should have small sprints with measurable progress and user safety stops after TUI changes.
- each change should be led by a user story and with clear user interface impact.
- sub tasks should be prioritized and groupped to acomodate to the previous requirement.
- backend changes can be verified using the agent led TMAOT method.
2. add task 11.5 to /Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/Phase-8-Unified-Application-Flow-plan.md ,mark task 11 as complete


sprint 5:
- the FMDM hould update for all folders using a downloaded model with the new status.
- deleted models should auto downloaded again.

sprint 6:
- ollama models will not be automatically picked, they will only be available in "manual" mode.

general note, we need to properly cache machine capabilities and make the onboarding process very smooth.


--------------REVIEW PLAN
now please review our plan as a team leader trying to understand the tasks the architect gave him. think of gaps  we need to make clear such as matching capabilities to a curated list of models, where do we get a list of best models and realize their capabilities?  
this is just one gap, there are few more questions a team leader would ask, we need to provide clear answers. 