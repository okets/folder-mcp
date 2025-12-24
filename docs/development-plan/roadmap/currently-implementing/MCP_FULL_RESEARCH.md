
# MCP Client Integration Research
## One-Click and Low-Friction Connection Patterns

This document provides a comprehensive survey of popular local AI agents and IDE assistants that support the Model Context Protocol (MCP), and analyzes how leading MCP server providers simplify connection with minimal user friction.

The explicit goal is to identify the **simplest, lowest-friction connection mechanisms**, ideally enabling a true **“Connect” button per client** inside MCP server applications such as **folderMCP** and **OrcaMCP**.

This document is written to be directly shareable via email or repository, without requiring additional context.

---

## 1. Scope and Assumptions

### In Scope
- MCP servers exposing tools via STDIO or local / remote HTTP (JSON-RPC)
- Local-first AI agents, IDE assistants, and developer tools
- Cross-platform support: macOS, Windows, Linux
- Optional remote access via secure tunnels (Cloudflare Tunnel)

### Out of Scope
- Pure web chat UIs without local execution capabilities
- Non-MCP plugin systems (OpenAI plugins, browser extensions)

---

## 2. UX Goal Hierarchy

| UX Pattern | Friction Level | Description |
|-----------|---------------|-------------|
| One-click install bundle | Lowest | Download and open, no config |
| Deep-link install | Very Low | Click link, client auto-configures |
| Single CLI command | Low | Copy-paste one command |
| Paste JSON config | Medium | Manual but simple |
| Manual config + restart | High | Error-prone, avoid |

The closer a client is to the top of this table, the more desirable it is for default integration.

---

## 3. Local MCP Clients and Integration Methods

### 3.1 Claude Desktop (Anthropic)

**Type:** Desktop AI application  
**Platforms:** macOS, Windows  
**MCP Support:** Native

#### Connection Mechanism
- Uses `.mcpb` extension bundles
- User downloads file and double-clicks
- Claude Desktop installs and registers MCP server automatically
- No manual JSON editing
- No CLI usage

#### Why This Matters
This is currently the **gold standard** MCP integration experience:
- True one-click install
- Safe execution sandbox
- Handles lifecycle and permissions
- Accessible to non-developers

#### Recommendation
You should ship:
- `folderMCP.mcpb`
- `orcaMCP.mcpb`

This enables a **“Connect to Claude Desktop”** button that simply downloads and opens the bundle.

---

### 3.2 Claude Code (Anthropic)

**Type:** CLI and IDE-integrated coding agent  
**Platforms:** macOS, Windows, Linux  
**MCP Support:** Native

#### Connection Mechanisms
- Interactive CLI:
  ```bash
  claude mcp add foldermcp -- node index.js
  ```
- JSON-based configuration import:
  ```bash
  claude mcp add-json < config.json
  ```
- Supports STDIO and HTTP MCP servers

#### Characteristics
- Developer-focused
- Fast setup
- Shared configuration across environments
- Supports importing configs from Claude Desktop

#### Recommendation
Provide:
- Copy button for CLI command
- Generated JSON config
- Optional HTTP endpoint option

---

### 3.3 OpenAI Codex CLI

**Type:** CLI with VS Code extension  
**Platforms:** macOS, Windows, Linux  
**MCP Support:** Native

#### Connection Mechanisms
- One-line CLI command:
  ```bash
  codex mcp add foldermcp -- node index.js
  ```
- Supports STDIO and HTTP servers
- Shared config between CLI and IDE plugin

#### Characteristics
- Extremely low friction for developers
- Similar UX to Claude Code
- Well-suited for automation

#### Recommendation
Provide:
- Copyable CLI command
- Optional HTTP MCP URL
- Minimal instructions

---

### 3.4 Cursor

**Type:** AI-first IDE  
**Platforms:** macOS, Windows, Linux  
**MCP Support:** Native

#### Connection Mechanisms
- UI-based MCP server management
- Custom URL scheme deep-links
- MCP server registry / directory

Example behavior:
```
cursor://install-mcp?config=BASE64_ENCODED_JSON
```

Clicking the link:
- Opens Cursor
- Installs MCP server automatically
- No user interaction beyond confirmation

#### Why This Is Critical
Cursor enables **true Connect buttons** from:
- Websites
- Desktop apps
- Documentation

#### Recommendation
- Generate Cursor deep-links dynamically
- Provide “Install in Cursor” button
- Consider submitting to Cursor Directory

---

### 3.5 Windsurf

**Type:** AI IDE  
**Platforms:** macOS, Windows, Linux  
**MCP Support:** Yes

#### Connection Mechanisms
- MCP JSON configuration
- UI-based server addition
- Emerging plugin ecosystem

#### Characteristics
- Slightly behind Cursor in UX
- Similar configuration model

#### Recommendation
- Provide Windsurf-compatible MCP JSON
- One-click copy button
- Monitor for deep-link support

---

### 3.6 GitHub Copilot Chat (Agent Mode)

**Type:** IDE-embedded agent  
**Platforms:** VS Code, JetBrains, Xcode  
**MCP Support:** Native

#### Connection Mechanisms
- `.vscode/mcp.json`
- UI-based configuration
- Built-in MCP marketplace

#### Characteristics
- Strong enterprise adoption
- One-click installs via marketplace
- Supports HTTP MCP servers

#### Recommendation
- Publish MCP metadata
- Provide JSON snippet
- Target Copilot MCP registry

---

## 4. Emerging and Adjacent MCP Clients

| Client | Notes |
|------|------|
| Augment Code (Auggie) | MCP-native, Claude compatible |
| Omni AI | Consumes MCP servers |
| Tabby | MCP planned |
| LM Studio | No MCP yet |
| Open Interpreter | Partial MCP patterns |

---

## 5. Remote Access via Cloudflare Tunnel

### Supported Clients
- Claude Code
- Codex CLI
- Cursor
- GitHub Copilot

### How It Works
- MCP server exposes HTTP endpoint
- Cloudflare Tunnel publishes secure HTTPS URL
- Client connects using HTTP transport

Example:
```bash
claude mcp add foldermcp --transport http https://xyz.trycloudflare.com/mcp
```

### Security Considerations
- Localhost-only by default
- Explicit opt-in for remote
- Auth token required
- Origin validation

---

## 6. Web-Based Tools

### Currently Not Supported
- Claude Web UI
- ChatGPT UI
- Gemini Web

Reason:
- Arbitrary local execution is sandboxed

### Viable Workarounds
- Desktop bridge apps
- IDE-based agents
- Remote MCP endpoints with auth

---

## 7. Recommended “Connect” Button Strategy

### Step 1: Detect Installed Clients
- Claude Desktop
- Cursor
- VS Code
- Windsurf

### Step 2: Render Buttons

| Client | Action |
|------|------|
| Claude Desktop | Download `.mcpb` |
| Cursor | Open deep-link |
| Claude Code | Copy CLI command |
| Codex CLI | Copy CLI command |
| VS Code Copilot | Show JSON |
| Windsurf | Show JSON |

### Step 3: Advanced Options
- Enable HTTP MCP
- Generate tunnel URL
- Token management

---

## 8. Key Takeaways

- MCP ecosystem is converging on one-click installs
- Deep-link configuration is the future
- `.mcpb` is the best UX today
- Cursor-style deep-links are the most flexible
- Your apps are well positioned to lead by example

---

## 9. Suggested Next Steps

- Unified MCP manifest format
- Client capability detection matrix
- Cursor deep-link generator
- `.mcpb` packaging checklist
- UI flow mockups

