# 🧭 MCP Step Lifecycle Prompts
This guide organizes your AI prompts into breaking out a step into manageable tasks, ensuring clarity and efficiency in your development process.
Copy and paste the relevant prompts into the agent as needed.
Keep this file updated with any new prompts or modifications to existing ones.




## 1. 🧱 PLANNING A STEP
Use **before coding** starts for the current step.

### ✅ Create Step Implementation Plan .md File
```
Identify the next Step from `UPCOMING_TASKS.md`.  
From now on, we will refer to this step as `STEP_[current_step_number]`. e.g. `STEP_31`.

Generate the file `STEP_[current_step_number]_IMPLEMENTATION_PLAN.md` and save it to the roadmap folder. Include these sections in the file:
1. A description of the step.

2. A checklist of all tasks in **linear execution order**.  
   - For each task:
     - A short **description**.
     - A **clear success criterion**.
   - Format the tasks using markdown checkboxes: `- [ ]`.

3. The last task of the plan should be "Run a real world example with Claude Desktop."  
   - The procedure for testing Claude Desktop is described in `CLAUDE_DESKTOP_TEST_ROUTINE.md`.  
   - Ask the Agent to supply a prompt to test MCP server functionality and this step's implementation.  
   - When you create this last task, also insert a link to the `CLAUDE_DESKTOP_TEST_ROUTINE.md` file.

4. Add a section for **Agent Instructions** at the end of the file with the following content:  
   - This tool is in pre-production, so do **not** preserve any legacy code.  
   - Test folder paths:
     - Full test folder: `C:\ThinkingHomes\test-folder`
     - Simple test folder: `C:\ThinkingHomes\test-simple`
   - On Windows, use PowerShell command chaining with `;` instead of `&&`.
   - Regularly update the file and mark completed steps: `- [x]`.
   - Keep the plan file as the **single source of truth** for progress tracking.
```


## 2. 🛠️ STEP MID EXECUTION INTERVENTION PROMPTS
Use **during** implementation.

### 2.1 🧾 Figure out where we left off in our tasklist.
```
**Figure out where we left off in our tasklist**:
   - Identify the next Step from `UPCOMING_TASKS.md`. from now on, we will refer to this step as `STEP_[current_step_number]`. eg `STEP_31`.
   - Read the STEP_[current_step_number]_IMPLEMENTATION_PLAN.md file.
   - check if the progress is up to date. fix it if not.
   - let me know where we left off in the task list.
```


## 3. 📚 CONCLUDING A STEP
Use **once cleanup is done**, before starting the next step.
### DOCUMENTATION & ROADMAP UPDATE
#### 3.1 📘 Update Roadmap Docs Prompt
```
**[Step 31] is Complete, Update UPCOMING_TASKS.md and COMPLETED_TASKS.md in roadmap documents folder**:
   - Mark the step as "✅ COMPLETED"
   - Update "current" status to the next step
   - review the rest of our upcoming tasks and suggest if any decision we took to complete the current step has affected any of the upcoming tasks.
   - move this step, along with other completed steps, to the "COMPLETED_TASKS.md" file.
```
#### 3.2 📘 Running manual tests
```
**Lets verify that the MCP server is working correctly**:
   - Make sure there are no typescript compilation errors.
   - Run npm test to verify that ALL tests pass.
   - Run the `CLAUDE_DESKTOP_TEST_ROUTINE.md` routine to verify that the MCP server is working correctly.

```
#### 3.3 📘GIT & GITHUB OPERATIONS
##### 3.3.1 ✅ Close Current Step Issue Prompt
```
**Close the current step issue in GitHub**:
   - Using gh tool Find the GitHub issue for the step
   - Update step body to the content of `STEP_X_IMPLEMENTATION_PLAN.md` (make sure all the tasks are marked as completed, otherwise warn me and stop!)
   - Close the issue with completion comment
```
##### 3.3.2 🆕 Create Next Step Issue Prompt
```
**Create a new GitHub issue for the next step in the roadmap.**:
1. Check the labels using `gh label list` since you tend to invent non-existing labels.
2. Create a new issue for the upcoming step
   - For the body use the Step's description from `UPCOMING_TASKS.md`
```


[Work in Progress]
####  ☁️ Cloudflare Tunnel plan prompt
Give me full implementation plan for implementing cloudflare Tunnel. with all required steps, including registering the domain mcp-folder.link (or folder-mcp.app, haven't decided yet) with the  service.
my goal is to have the user run my CLI app locally, have it process the data -> serve it using MCP server
the user should have a connection address with this format fdsl3442356lkl.folder-mcp.link
also, check what are the implications if the user shuts off his computer for the night.
will it still work after starting it again?