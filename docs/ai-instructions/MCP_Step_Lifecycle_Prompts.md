# 🧭 MCP Step Lifecycle Prompts

This guide organizes your AI prompts into **5 lifecycle phases** for each roadmap step:

---

## 1. 🧱 PLANNING

Use **before coding** starts for the current step.

### ✅ Step Implementation Plan Prompt
```
Read the success criteria for [Step XX].

Create `implementation_plan.md` with:

1. All tasks in **linear order**.
2. For each task:
   - Clear task description
   - Precise success criterion
3. Format as checklist: `- [ ]`

Instructions for agents:
- Update the file regularly and mark completed steps `- [x]`.
- Keep this as the source of truth for this step's progress.
```

---

## 2. 🛠️ EXECUTION

Use **during** implementation.

### 🧾 Task Checklist Enforcement
```
This step is only considered complete when:

- [ ] All tests pass
- [ ] TypeScript compiles with **zero errors**
- [ ] Claude Desktop runs the MCP server without issues  
  → See `CLAUDE_DESKTOP_TEST_ROUTINE.md`
```

### 📁 Test Environment Info (Windows Paths)
```
- Full test folder:     C:\ThinkingHomes\test-folder  
- Simple test folder:   C:\ThinkingHomes\test-simple
```

### 📝 Development Control Reminder
```
Do not proceed to the next step until I explicitly approve it.

You may work autonomously within this step.

Temporary or legacy code is not allowed — clean up as you go.
```

---

## 3. 🧹 CLEANUP & VALIDATION

Use **after task implementation**, before marking as complete.

### 🧼 Finalization Prompt
```
Step [XX] is ready for finalization.

Please:

1. ✅ Confirm all success criteria are satisfied.
2. 🧹 Fix all TypeScript compilation errors.
3. 🧼 Remove all temporary files and folders.
4. ✅ Check that all necessary tests exist.
5. 🧪 Run all tests — they must pass!
6. 🧪 Validate with:
   node dist/index.js "C:\ThinkingHomes\test-folder"
```

---

## 4. 📚 DOCUMENTATION & ROADMAP UPDATE

Use **once cleanup is done**, before starting the next step.

### 📘 Update Roadmap Docs Prompt
```
1. In the roadmap folder:
   - Mark step as ✅ COMPLETED
   - Check off all success criteria
   - Point to implementation files
   - Set current status to next step
```

---

## 5. ⬆️ GIT & GITHUB OPERATIONS

Do this **after roadmap update** and before moving on.

### ✅ Commit & Push Prompt
```
- git add .
- git commit -m "Step XX: ✅ Completed <summary>"
- git push
```

### 🐙 Update GitHub Issue Prompt
```
- Use `gh issue list` to find the issue
- Mark all criteria with [x]
- Add implementation notes
- Close with completion comment
```

### 🆕 Create Next Step Issue Prompt
```
- gh issue create -t "Step XX" -b "<success criteria list>"
- gh label list (to assign proper labels)
```

---

## 📦 Special Case: Cloudflare Tunnel Setup

Use only when working on tunnel deployment (likely a dedicated step).

### ☁️ Cloudflare Tunnel Setup Prompt
```
Goal: Serve the user’s CLI app via a public MCP server using Cloudflare Tunnel.

Public format: fdsl3442356lkl.folder-mcp.link

Tasks:
1. Register domain: mcp-folder.link OR folder-mcp.app
2. Set up DNS records
3. Install & configure Cloudflare Tunnel
4. Integrate with MCP server
5. Implement dynamic subdomain provisioning

Also:
- Explore behavior if user shuts off computer
- Ensure tunnel restarts cleanly on boot
```