# Unified Application Architecture Design

**Status**: 🎯 In Design  
**Created**: 2025-07-08  
**Purpose**: Define the architecture for a unified folder-mcp application with persistent services, intelligent setup, and seamless user experience.

## Executive Summary

This document outlines the architecture for transforming folder-mcp from a simple MCP server into a production-ready application with:
- Single-command installation
- First-run setup wizard
- Persistent background services
- Visual TUI for monitoring and control
- Power-user CLI capabilities
- Auto-start system integration

## User Journey

### 1. Installation

**Single Command Installation:**
```bash
# Option 1: NPM (cross-platform)
npm install -g folder-mcp

# Option 2: Homebrew (macOS/Linux)
brew install folder-mcp

# Option 3: Install script
curl -sSL https://install.folder-mcp.dev | bash
```

**Result:**
- `folder-mcp` command available globally
- No PATH configuration needed
- Ready to run from any directory

### 2. First Run Experience

**Pre-Wizard System Assessment:**
```typescript
// Before showing wizard, we run:
async function assessSystem() {
  return {
    ollama: await checkOllama(),        // Is Ollama installed/running?
    models: await getAvailableModels(), // What embedding models available?
    gpu: await detectGPU(),             // GPU available for Transformers.js?
    memory: await getAvailableMemory(), // RAM for model loading
    language: await detectSystemLocale() // User's system language
  };
}
```

**Scenario**: User runs `folder-mcp` for the first time

```
$ folder-mcp

Welcome to folder-mcp! 🎉
Let's set up your first knowledge base.

[Detecting available embedding models...]

Step 1: Choose a folder to index
📁 Select folder: [~/Documents/MyProject] _

Step 2: Configure indexing
🤖 Embedding model: [Auto-select best available] ▼
   ├─ ✓ Transformers.js (all-MiniLM-L6-v2) - Built-in, works offline
   ├─ ○ Ollama models... → Shows all available models
   └─ ○ Advanced: Enter model name manually

🌍 Content language: [English (detected)] ▼
   ├─ ✓ Based on your system: en_US
   ├─ ○ Spanish
   └─ ○ Multi-language

Step 3: System integration
🚀 Start automatically when computer starts?
   ◉ Yes (recommended)
   ○ No, I'll start it manually

[Continue] [Cancel]
```

**What happens under the hood:**
```bash
# Default selection (Transformers.js):
folder-mcp add ~/Documents/MyProject \
  --model transformers:all-MiniLM-L6-v2 \
  --language en \
  --auto-start

# Power user selects Ollama model:
folder-mcp add ~/Documents/MyProject \
  --model ollama:nomic-embed-text-v1.5 \
  --language en \
  --auto-start

# Advanced user with custom model:
folder-mcp add ~/Documents/MyProject \
  --model ollama:mxbai-embed-large:latest \
  --language en \
  --auto-start
```

**Ollama Model Selection Flow:**
```
User selects "Ollama models..." →

Detecting Ollama models...
✓ Found 5 models:

1. nomic-embed-text (274MB) - General purpose
2. mxbai-embed-large (669MB) - High quality
3. bge-base-en-v1.5 (391MB) - English optimized
4. e5-mistral-7b-instruct (4.1GB) - Instruction-following
5. multilingual-e5-large (2.2GB) - 100+ languages

6. Pull a different model...
7. Back to model selection

Select model [1-7]: _
```

### 3. Normal Operation

**Subsequent runs show full TUI:**
```
$ folder-mcp

╭─────────────────────────────────────────────── folder-mcp ──╮
│ 📁 folder-mcp    status: Connected to server (PID: 12345)   │
╰──────────────────────────────────────────────────────────────╯

┌─ Indexed Folders ────────────────────────────────────────────┐
│ → ~/Documents/MyProject    15,234 files • 2.3GB • English   │
│   ~/Work/ClientDocs         8,456 files • 1.1GB • Mixed     │
│   ~/Research/Papers         3,234 files • 567MB • English   │
└──────────────────────────────────────────────────────────────┘

┌─ Server Status ──────────────────────────────────────────────┐
│ Uptime: 2d 14h 32m          Memory: 234MB / 512MB           │
│ Requests: 1,234             Cache hits: 89%                 │
│ Last indexed: 5 minutes ago Next scan: in 25 minutes        │
└──────────────────────────────────────────────────────────────┘

[a]dd folder [r]emove [s]ettings [q]uit [e]xit+stop server
```

### 3.5 Agents Connection Screen (TUI)

**Problem**: MCP stdio transport only supports one connection at a time, but users may want to use multiple agents (Claude Desktop, VSCode, etc.)

**Solution**: Smart agent management through the TUI that allows users to:
- Select ONE agent to get the fast stdio connection
- All other agents automatically use HTTP
- Auto-configure agent configuration files

**Agents Connection Screen:**
```
┌─ Agents Connection ─────────────────────────────────────┐
│                                                         │
│ Select Primary Agent (stdio - fastest):                 │
│   ◉ Claude Desktop                                      │
│   ○ VSCode MCP                                         │
│   ○ None (HTTP only)                                   │
│                                                         │
│ Current Connections:                                    │
│ ├─ Claude Desktop [PRIMARY] via stdio                   │
│ └─ VSCode MCP [CONNECTED] via http://localhost:3000    │
│                                                         │
│ HTTP Connection String:                                 │
│ ┌─────────────────────────────────────────────────┐   │
│ │ http://localhost:3000/mcp                      │   │
│ └─────────────────────────────────────────────────┘   │
│ [Copy] [Show Auth Token]                               │
│                                                         │
│ [Apply Changes] [Auto-Configure Agents]                │
└─────────────────────────────────────────────────────────┘
```

**Auto-Configuration Logic:**
- When user selects a primary agent, the TUI automatically:
  1. Updates the selected agent's config to use stdio (command/args)
  2. Updates all other agents' configs to use HTTP (url)
  3. Shows confirmation and requires agent restart

**Connection Detection:**
- When an agent tries to connect via stdio while another has the slot:
  - Return helpful error with HTTP fallback URL
  - Update TUI to show connection attempt
  - Offer to switch primary agent

**Benefits:**
- Users don't need to manually edit JSON configs
- stdio performance for the most-used agent
- Seamless multi-agent support
- Clear visibility of all connections

### 4. CLI Commands (Single Code Path)

**Core Commands - Used by Wizard, TUI, and CLI:**
```bash
# Add folder (what the wizard ultimately calls)
folder-mcp add <folder> [options]
  --model <model>        # Embedding model (default: auto)
  --language <lang>      # Content language (default: auto)
  --exclude <patterns>   # Exclude patterns (default: node_modules,.git)
  --auto-start          # Setup auto-start on system boot

# Examples:
folder-mcp add ~/Documents/MyProject
folder-mcp add ~/Work --model ollama:nomic-embed-text --language es
folder-mcp add . --exclude "*.tmp,*.log,build/**"

# Remove folder
folder-mcp remove <folder-id-or-path>

# List folders
folder-mcp list

# Server control
folder-mcp start        # Start server if not running
folder-mcp stop         # Stop server
folder-mcp restart      # Restart server
folder-mcp status       # Show server status

# Headless mode (no TUI)
folder-mcp --headless   # Start server without TUI
```

**Power User Features:**
```bash
# JSON output for scripting
folder-mcp status --json
folder-mcp list --json

# Batch operations
folder-mcp add ~/Documents ~/Projects ~/Work --model auto

# Configuration
folder-mcp config get server.port
folder-mcp config set server.logLevel debug

# Logs
folder-mcp logs --follow
folder-mcp logs --tail 100
```

## Technical Architecture

### Component Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CLI Entry     │     │   TUI Client    │     │  First-Run      │
│  (folder-mcp)   │     │   (Ink/React)   │     │    Wizard       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Command Parser       │
                    │ • Unified CLI params  │
                    │ • add/remove/status   │
                    │ • Validation          │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Service Manager      │
                    │ • Process detection    │
                    │ • Server lifecycle     │
                    │ • IPC communication   │
                    └───────────┬────────────┘
                                │
                ┌───────────────┴────────────────┐
                ▼                                ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │   MCP Server        │         │  Configuration      │
    │ • Runs detached     │         │ • ~/.folder-mcp/    │
    │ • HTTP API          │         │ • Auto-persistence  │
    │ • File watching     │         │ • Multi-folder      │
    └─────────────────────┘         └─────────────────────┘
```

### Unified Command Flow

**All paths lead to the same command parser:**

```typescript
// Wizard constructs parameters
const wizardResult = await runWizard();
const params = wizardResultToCliParams(wizardResult);
// Execute: folder-mcp add ~/Documents --model auto --language auto

// TUI "Add Folder" constructs parameters  
const tuiResult = await showAddFolderDialog();
const params = tuiResultToCliParams(tuiResult);
// Execute: folder-mcp add ~/Documents --model auto --language auto

// CLI direct usage
// User types: folder-mcp add ~/Documents --model auto --language auto

// ALL THREE execute the same code path:
async function executeCommand(params: CliParams) {
  switch (params.command) {
    case 'add':
      return addFolder(params);
    case 'remove':
      return removeFolder(params);
    case 'status':
      return showStatus(params);
  }
}
```

### Configuration Schema

**Location**: `~/.folder-mcp/config.json`

```json
{
  "version": "1.0",
  "server": {
    "port": 9876,
    "autoStart": true,
    "logLevel": "info"
  },
  "folders": [
    {
      "id": "uuid-v4",
      "path": "~/Documents/MyProject",
      "name": "My Project",
      "settings": {
        "model": "auto",
        "language": "auto",
        "batchSize": "auto",
        "excludePatterns": ["node_modules", ".git", "*.log"]
      },
      "stats": {
        "filesIndexed": 15234,
        "totalSize": "2.3GB",
        "lastSync": "2024-01-08T10:30:00Z",
        "lastModified": "2024-01-08T10:25:00Z"
      }
    }
  ],
  "ui": {
    "theme": "auto",
    "animations": true
  }
}
```

### Service Discovery

**PID File**: `~/.folder-mcp/server.pid`
```
12345
```

**Lock File**: `~/.folder-mcp/server.lock`
- Prevents multiple server instances
- Contains server metadata

**Health Check Endpoint**: `http://localhost:9876/health`
```json
{
  "status": "healthy",
  "pid": 12345,
  "uptime": 234567,
  "version": "1.0.0",
  "folders": 3
}
```

### Communication Protocol

**HTTP API** (Chosen for simplicity and debugging)

```
GET  /health                 # Server health check
GET  /status                 # Detailed server status
GET  /folders                # List indexed folders
POST /folders                # Add new folder
DELETE /folders/:id          # Remove folder
PUT  /folders/:id            # Update folder settings
POST /reindex/:id            # Force reindex folder
POST /shutdown               # Graceful shutdown
GET  /logs                   # Stream server logs
```

### Auto-Start Integration

**macOS (launchd)**
```xml
<!-- ~/Library/LaunchAgents/com.folder-mcp.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.folder-mcp</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/folder-mcp</string>
        <string>--headless</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

**Linux (systemd)**
```ini
# ~/.config/systemd/user/folder-mcp.service
[Unit]
Description=folder-mcp Knowledge Base Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/folder-mcp --headless --daemon
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

**Windows (Registry)**
```
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
  folder-mcp = "C:\Program Files\folder-mcp\folder-mcp.exe" --headless --daemon
```

## Embedding Model Strategy

### Current State
- **Ollama**: Primary option, requires external installation
- **Transformers.js**: Package installed but not implemented
- **Fallback**: Mock embeddings (testing only)

### Proposed Implementation

**1. Transformers.js as Default**
```typescript
// Built-in models that work offline
const BUILTIN_MODELS = {
  'all-MiniLM-L6-v2': {
    size: '90MB',
    quality: 'good',
    speed: 'fast',
    dimensions: 384,
    pooling: 'mean' // Requires mean pooling
  },
  'all-mpnet-base-v2': {
    size: '420MB', 
    quality: 'excellent',
    speed: 'medium',
    dimensions: 768,
    pooling: 'mean' // Requires mean pooling
  }
};
```

**Mean Pooling Implementation**
```typescript
class TransformersEmbeddingService implements EmbeddingOperations {
  async generateSingleEmbedding(text: string): Promise<EmbeddingVector> {
    // 1. Tokenize and get model output
    const output = await this.model(text);
    
    // 2. Extract token embeddings and attention mask
    const tokenEmbeddings = output.last_hidden_state;
    const attentionMask = output.attention_mask;
    
    // 3. Apply mean pooling
    const pooled = this.meanPooling(tokenEmbeddings, attentionMask);
    
    // 4. Normalize (optional but recommended)
    const normalized = this.normalize(pooled);
    
    return {
      vector: Array.from(normalized.data),
      dimensions: normalized.size,
      model: this.modelName,
      createdAt: new Date().toISOString()
    };
  }
  
  private meanPooling(tokenEmbeddings: Tensor, attentionMask: Tensor): Tensor {
    // Expand attention mask to match embedding dimensions
    const maskExpanded = attentionMask.unsqueeze(-1)
      .expand(tokenEmbeddings.size())
      .float();
    
    // Apply mask and sum
    const sumEmbeddings = (tokenEmbeddings * maskExpanded).sum(1);
    
    // Count non-masked tokens
    const sumMask = maskExpanded.sum(1).clamp(min=1e-9);
    
    // Divide sum by count (mean)
    return sumEmbeddings / sumMask;
  }
  
  private normalize(tensor: Tensor): Tensor {
    // L2 normalization
    const norm = tensor.norm(2, -1, true);
    return tensor / norm.clamp(min=1e-9);
  }
}
```

**2. Model Selection Logic**
```typescript
async function selectBestModel() {
  // 1. Check if Ollama is available with good models
  if (await checkOllama()) {
    const models = await getOllamaModels();
    if (models.includes('nomic-embed-text')) {
      return 'ollama:nomic-embed-text'; // Best quality
    }
  }
  
  // 2. Fall back to Transformers.js
  const memory = await getAvailableMemory();
  if (memory > 2048) { // 2GB+ RAM
    return 'transformers:all-mpnet-base-v2';
  } else {
    return 'transformers:all-MiniLM-L6-v2';
  }
}
```

**3. Ollama Power User Integration**
```typescript
// List ALL available Ollama embedding models
async function getOllamaEmbeddingModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    // Filter for embedding models (they have specific naming patterns)
    return data.models.filter(model => 
      model.name.includes('embed') || 
      model.name.includes('e5') ||
      model.name.includes('bge') ||
      model.name.includes('gte') ||
      model.name.includes('instructor') ||
      // Let power users try ANY model they want
      true // Show all models, let user decide
    ).map(model => ({
      name: model.name,
      size: model.size,
      quantization: model.details?.quantization_level,
      pulled: true
    }));
  } catch {
    return [];
  }
}

// Enhanced wizard for Ollama users
if (userSelectedOllama) {
  const models = await getOllamaEmbeddingModels();
  
  if (models.length === 0) {
    console.log(`
No Ollama models found. Would you like to:
1. Pull recommended models (nomic-embed-text, mxbai-embed-large)
2. Install a specific model
3. Use built-in Transformers.js instead
    `);
  } else {
    console.log(`
Available Ollama models:
${models.map((m, i) => `${i+1}. ${m.name} (${formatBytes(m.size)})`).join('\n')}

Or pull a new model:
${models.length + 1}. Pull a different model...
    `);
  }
}

// Power user can use ANY Ollama model
async function pullOllamaModel(modelName: string) {
  console.log(`Pulling ${modelName}...`);
  await execAsync(`ollama pull ${modelName}`);
  console.log(`✅ ${modelName} ready for use!`);
}
```

## Implementation Phases

### Phase 1: Foundation + Transformers.js
- [ ] Implement TransformersEmbeddingService
- [ ] Service manager architecture
- [ ] Configuration system
- [ ] PID/lock file management
- [ ] Basic health check API

### Phase 2: First-Run Wizard
- [ ] System assessment (Ollama, GPU, memory)
- [ ] Wizard UI components
- [ ] Folder selection dialog
- [ ] Model auto-detection
- [ ] Language detection
- [ ] Auto-start setup

### Phase 3: Server Separation
- [ ] Detached server process
- [ ] HTTP API implementation
- [ ] TUI client mode
- [ ] Status monitoring

### Phase 4: Power User Features
- [ ] CLI commands (add, remove, status)
- [ ] JSON output mode
- [ ] Batch operations
- [ ] Configuration management

### Phase 5: Polish
- [ ] Error recovery
- [ ] Update notifications
- [ ] Performance monitoring
- [ ] Documentation

## Key Decisions

### 1. Why HTTP instead of Unix Sockets?
- **Cross-platform**: Works on Windows
- **Debuggable**: Can use curl/browser
- **Extensible**: Ready for remote access
- **Simple**: Well-understood protocol

### 2. Why PID files over service discovery?
- **Simple**: No dependencies
- **Reliable**: OS guarantees PID uniqueness
- **Standard**: Common pattern in Unix
- **Portable**: Works everywhere

### 3. Configuration location?
- **~/.folder-mcp/**: User-specific, hidden
- **XDG compliant** on Linux
- **Standard locations** per platform
- **Backup friendly**: Single directory

## Security Considerations

1. **Local Only**: Server binds to localhost only
2. **No Auth**: Relies on file system permissions
3. **Safe Defaults**: Conservative file access
4. **No Secrets**: No API keys in config

## Future Enhancements

1. **System Tray**: Native GUI for status
2. **Web UI**: Browser-based management
3. **Multi-user**: Shared server mode
4. **Cloud Sync**: Backup configurations
5. **Plugins**: Extensibility system

## Answers to Your Concerns

### "Who handles mean pooling?"
**Current state**: Nobody! This is a critical gap.

**Where it should be handled**:
1. **Ollama**: Handles it internally (returns sentence embeddings) ✅
2. **Transformers.js**: We must implement it in `TransformersEmbeddingService` ⚠️
3. **Why it matters**: Without mean pooling, we'd store token embeddings (wrong!) instead of sentence embeddings

**The implementation**:
- Take token embeddings from the model
- Apply attention mask (ignore padding tokens)
- Average the embeddings (mean pooling)
- Normalize the result (optional but recommended)

### "Now it's easy to extend functionality with Ollama"
**Exactly!** Your insight transforms Ollama from a dependency to an enhancement:

**Before (problematic)**:
- Ollama required for embeddings to work
- We had to guide users through specific model installation
- Limited to models we knew about

**After (your solution)**:
1. **Transformers.js as base**: Everyone has working embeddings out-of-box
2. **Ollama as power-up**: Advanced users can use ANY Ollama model
3. **Model discovery**: List all available models dynamically
4. **User freedom**: Let users experiment with any model they want

**Benefits**:
- No dependency on Ollama for basic functionality
- Power users can use cutting-edge models (e.g., `nomic-embed-text-v1.5`, `bge-m3`, etc.)
- Future-proof: New Ollama models work automatically
- Supports specialized models (multilingual, domain-specific, etc.)

### "How can we add sentence transformers to Ollama?"
**Short answer**: We can't programmatically, but we don't need to!

**Better approach**:
1. **Transformers.js first**: Built-in models that work immediately
2. **Ollama optional**: For power users who want better quality
3. **Guided setup**: If user selects Ollama, we guide them through installation

### "This looks like a challenge"
**You're right, but the solution is simpler than it seems:**

1. **Phase 1**: Implement Transformers.js with proper mean pooling
   ```typescript
   import { pipeline } from '@xenova/transformers';
   const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
   // We handle mean pooling in our service layer
   ```

2. **Wizard detects** what's available and recommends the best option
3. **Users always have** a working option (Transformers.js)

### "How are we running transformers now?"
**Current state**: We're NOT! 
- Ollama is primary (external dependency)
- Transformers.js is installed but unused
- Mean pooling is not implemented
- This is why Phase 1 is critical

## Technical Deep Dives

### Embedding Pipeline Architecture

```
Text Input → Tokenization → Model → Token Embeddings → Mean Pooling → Sentence Embedding → Storage
     ↓            ↓           ↓            ↓                ↓               ↓              ↓
"Hello world" → [101,7592,2088,102] → BERT → [768x4] → [1x768] → normalize → FAISS
```

**Responsibility Matrix:**
| Component | Tokenization | Model Inference | Mean Pooling | Normalization | Storage |
|-----------|--------------|-----------------|--------------|---------------|---------|
| Ollama API | ✅ Internal | ✅ Internal | ✅ Internal | ✅ Internal | ❌ Our job |
| Transformers.js | ✅ Built-in | ✅ Built-in | ❌ Our job | ❌ Our job | ❌ Our job |
| Domain Layer | ❌ | ❌ | ❌ | ❌ | ❌ |
| Service Layer | ❌ | ✅ Orchestrate | ✅ Implement | ✅ Implement | ✅ Call domain |
| Infrastructure | ❌ | ✅ API calls | ❌ | ❌ | ✅ FAISS |

### Error Handling Strategy

**1. Service Availability Errors**
```typescript
// Graceful degradation chain
try {
  // Try Ollama first (best quality)
  return await ollamaService.embed(text);
} catch (ollamaError) {
  logger.warn('Ollama unavailable, falling back to Transformers.js');
  try {
    // Try Transformers.js (built-in)
    return await transformersService.embed(text);
  } catch (transformersError) {
    logger.error('All embedding services failed');
    throw new EmbeddingServiceUnavailableError();
  }
}
```

**2. Model Download Failures**
```typescript
// Retry with exponential backoff
async function downloadModel(modelName: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await transformers.downloadModel(modelName);
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
}
```

**3. Memory/Resource Errors**
```typescript
// Adaptive batch sizing
if (availableMemory < 1024) { // Less than 1GB
  batchSize = 8;
} else if (availableMemory < 2048) { // Less than 2GB
  batchSize = 16;
} else {
  batchSize = 32;
}
```

### Multi-Folder Architecture

**1. Folder Identity**
```typescript
interface FolderConfig {
  id: string;              // UUID
  path: string;            // Absolute path
  name: string;            // Display name
  model: string;           // Embedding model for this folder
  language: string;        // Primary language
  vectorStore: string;     // Path to FAISS index
  lastIndexed: Date;       // Last successful index
  fileCount: number;       // Cached count
  totalSize: number;       // Cached size in bytes
}
```

**2. Isolation Strategy**
```
~/.folder-mcp/
├── config.json                    # Global config
├── folders/
│   ├── folder-uuid-1/
│   │   ├── config.json           # Folder-specific config
│   │   ├── vectors.faiss         # Vector index
│   │   ├── metadata.json         # File metadata cache
│   │   └── embeddings.cache      # Embedding cache
│   └── folder-uuid-2/
│       └── ...
└── models/                       # Shared models
    ├── all-MiniLM-L6-v2/
    └── all-mpnet-base-v2/
```

**3. Cross-Folder Search**
```typescript
// Search across multiple folders
async function searchAllFolders(query: string): Promise<SearchResult[]> {
  const folders = await getFolderConfigs();
  const results = await Promise.all(
    folders.map(folder => searchFolder(folder, query))
  );
  return mergeAndRankResults(results);
}
```

### Process Communication (TUI ↔ Server)

**1. HTTP API Design**
```typescript
// Server endpoints
POST   /api/folders                    # Add new folder
GET    /api/folders                    # List all folders
GET    /api/folders/:id                # Get folder details
DELETE /api/folders/:id                # Remove folder
POST   /api/folders/:id/reindex        # Trigger reindex
GET    /api/folders/:id/search?q=...   # Search in folder
GET    /api/search?q=...               # Search all folders
GET    /api/status                     # Server status
POST   /api/shutdown                   # Graceful shutdown

// Optional: WebSocket for real-time updates
WS     /api/events                     # Progress updates (if needed)
```

**2. Simplified Communication**

**For Human Users (TUI):**
- Poll `/api/status` every second during indexing
- Simple and reliable
- No WebSocket complexity unless we need sub-second updates

**For AI Agents (MCP):**
- No HTTP needed at all
- Direct disk access to indexes
- Stateless operation

```typescript
// TUI polls for updates (simple!)
setInterval(async () => {
  const status = await fetch('/api/status');
  updateUI(status);
}, 1000);

// MCP reads directly (even simpler!)
const index = await FAISSIndex.load(indexPath);
const results = await index.search(query);
```

### Agent Connection Management

**1. Connection Detection and Routing**
```typescript
// Daemon tracks active connections
interface ConnectionState {
  primaryAgent: 'claude' | 'vscode' | 'none';
  stdioClient: ClientInfo | null;
  httpClients: Map<string, ClientInfo>;
  lastStdioAttempt: { agent: string; timestamp: Date } | null;
}

// On MCP server startup
async function startMCPServer() {
  const daemon = await connectToDaemon();
  const state = await daemon.getConnectionState();
  
  const callingAgent = detectCallingAgent(); // From process info
  
  if (callingAgent === state.primaryAgent) {
    // This agent gets stdio!
    await daemon.registerStdioConnection(callingAgent);
    return new StdioTransport();
  } else {
    // Redirect to HTTP with helpful message
    console.error(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Please use HTTP transport",
        data: {
          reason: `stdio reserved for ${state.primaryAgent}`,
          httpUrl: "http://localhost:3000/mcp",
          setupCommand: "folder-mcp agents"
        }
      }
    }));
    process.exit(1);
  }
}
```

**2. Auto-Configuration Implementation**
```typescript
class AgentConfigurator {
  private configs = {
    claude: {
      path: "~/Library/Application Support/Claude/claude_desktop_config.json",
      stdioConfig: (mcpPath: string, folderPath: string) => ({
        "folder-mcp": {
          "command": "node",
          "args": [mcpPath, folderPath]
        }
      }),
      httpConfig: (url: string) => ({
        "folder-mcp": { "url": url }
      })
    },
    vscode: {
      path: "~/.vscode/mcp-config.json",
      stdioConfig: (mcpPath: string, folderPath: string) => ({
        "folder-mcp": {
          "command": "node",
          "args": [mcpPath, folderPath]
        }
      }),
      httpConfig: (url: string) => ({
        "folder-mcp": { "url": url }
      })
    }
  };
  
  async switchPrimaryAgent(newPrimary: string) {
    // Update all agent configs atomically
    const updates = [];
    
    for (const [agent, config] of Object.entries(this.configs)) {
      if (agent === newPrimary) {
        updates.push(this.updateConfig(
          config.path,
          config.stdioConfig(this.mcpPath, this.folderPath)
        ));
      } else {
        updates.push(this.updateConfig(
          config.path,
          config.httpConfig("http://localhost:3000/mcp")
        ));
      }
    }
    
    await Promise.all(updates);
    
    // Update daemon state
    await this.daemon.setPrimaryAgent(newPrimary);
  }
}
```

**3. Connection Status Tracking**
```typescript
// Daemon maintains connection status
class ConnectionManager {
  async handleStdioAttempt(agent: string): Promise<boolean> {
    if (this.state.stdioClient) {
      // Log failed attempt for TUI display
      this.state.lastStdioAttempt = {
        agent,
        timestamp: new Date()
      };
      
      // Notify TUI of connection attempt
      this.emit('stdio-conflict', {
        requestingAgent: agent,
        currentAgent: this.state.primaryAgent,
        suggestion: 'Use TUI to switch primary agent'
      });
      
      return false;
    }
    
    // Grant stdio access
    this.state.stdioClient = {
      agent,
      pid: process.pid,
      connectedAt: new Date()
    };
    
    return true;
  }
}
```

### Performance Considerations

**1. Embedding Cache**
```typescript
// LRU cache for embeddings
class EmbeddingCache {
  private cache = new LRUCache<string, EmbeddingVector>({
    max: 10000, // Max items
    maxSize: 1024 * 1024 * 100, // 100MB
    sizeCalculation: (embedding) => embedding.vector.length * 4 // Float32
  });
  
  async getOrCompute(text: string, compute: () => Promise<EmbeddingVector>) {
    const hash = crypto.hash(text);
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }
    const embedding = await compute();
    this.cache.set(hash, embedding);
    return embedding;
  }
}
```

**2. Incremental Indexing**
```typescript
// Only process changed files
async function incrementalIndex(folder: FolderConfig) {
  const lastIndexed = folder.lastIndexed;
  const changedFiles = await getFilesModifiedSince(folder.path, lastIndexed);
  
  if (changedFiles.length === 0) {
    return { status: 'up-to-date' };
  }
  
  // Remove old embeddings for changed files
  await removeEmbeddings(changedFiles);
  
  // Generate new embeddings
  await indexFiles(changedFiles);
  
  return { status: 'updated', filesProcessed: changedFiles.length };
}
```

### Security & Privacy

**1. Local-Only by Default**
```typescript
// Server binds to localhost only
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Server listening on http://localhost:${port}`);
});
```

**2. File Access Control**
```typescript
// Prevent directory traversal
function validatePath(requestedPath: string, allowedRoot: string): boolean {
  const resolved = path.resolve(requestedPath);
  const root = path.resolve(allowedRoot);
  return resolved.startsWith(root);
}
```

**3. No Telemetry Without Consent**
```typescript
// Opt-in only
if (config.telemetry.enabled && config.telemetry.userConsent) {
  // Send anonymous usage stats
}
```

### Platform-Specific Considerations

**1. macOS**
```typescript
// Code signing for distribution
codesign --sign "Developer ID" folder-mcp

// Notarization for Gatekeeper
xcrun altool --notarize-app --file folder-mcp.pkg

// Permissions
// Need to request folder access permissions
```

**2. Windows**
```typescript
// Windows Defender exclusion
// May need to whitelist model downloads

// Path handling
const configPath = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'folder-mcp')
  : path.join(os.homedir(), '.folder-mcp');
```

**3. Linux**
```typescript
// XDG Base Directory compliance
const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local/share');
const cacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
```

### Installation & Distribution

**1. NPM Package Structure**
```
folder-mcp/
├── bin/
│   └── folder-mcp          # Entry point script
├── dist/
│   └── ...                 # Compiled TypeScript
├── models/                 # Pre-downloaded models (optional)
│   └── all-MiniLM-L6-v2/
└── package.json
```

**2. Binary Distribution**
```typescript
// Using pkg or nexe for standalone binaries
{
  "pkg": {
    "scripts": "dist/**/*.js",
    "assets": [
      "node_modules/@xenova/transformers/**/*"
    ],
    "targets": [
      "node18-macos-x64",
      "node18-macos-arm64", 
      "node18-win-x64",
      "node18-linux-x64"
    ]
  }
}
```

**3. Auto-Update Mechanism**
```typescript
// Check for updates
async function checkForUpdates() {
  const currentVersion = packageJson.version;
  const latestVersion = await fetchLatestVersion();
  
  if (semver.gt(latestVersion, currentVersion)) {
    return {
      available: true,
      currentVersion,
      latestVersion,
      downloadUrl: getDownloadUrl(latestVersion, process.platform)
    };
  }
}
```

### Monitoring & Diagnostics

**1. Health Metrics**
```typescript
interface HealthMetrics {
  server: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: number;
    pid: number;
  };
  folders: {
    total: number;
    indexed: number;
    errors: number;
  };
  embeddings: {
    totalGenerated: number;
    cacheHitRate: number;
    averageLatency: number;
  };
  search: {
    queriesPerMinute: number;
    averageResponseTime: number;
  };
}
```

**2. Debug Mode**
```typescript
// Enable verbose logging
if (process.env.FOLDER_MCP_DEBUG) {
  logger.setLevel('debug');
  
  // Log all HTTP requests
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, { 
      query: req.query, 
      body: req.body 
    });
    next();
  });
  
  // Log embedding pipeline details
  embedder.on('tokenization', (data) => logger.debug('Tokenization', data));
  embedder.on('inference', (data) => logger.debug('Inference', data));
  embedder.on('pooling', (data) => logger.debug('Pooling', data));
}
```

**3. Diagnostics Command**
```bash
folder-mcp diagnose

System Information:
  OS: macOS 14.2.1 (arm64)
  Node: v20.11.0
  gpu: v1.0.0

Services:
  ✅ Ollama: Running (localhost:11434)
  ✅ Transformers.js: Ready
  ✅ FAISS: Loaded

Configuration:
  Config path: ~/.folder-mcp/config.json
  Model cache: ~/.folder-mcp/models/ (423MB)
  
Folders:
  1. ~/Documents (15,234 files, last indexed: 2 hours ago)
  2. ~/Projects (8,456 files, last indexed: 1 day ago)

Recent Errors:
  None
```

### Data Migration & Upgrades

**1. Version Detection**
```typescript
interface SchemaVersion {
  version: string;
  migratedAt?: Date;
  migrations: string[];
}

// Check if migration needed
async function checkMigration() {
  const currentSchema = await readSchemaVersion();
  const targetVersion = packageJson.version;
  
  if (semver.lt(currentSchema.version, targetVersion)) {
    return getMigrationPath(currentSchema.version, targetVersion);
  }
}
```

**2. Migration Strategy**
```typescript
// Migrations are incremental
const migrations = {
  '1.0.0-to-1.1.0': async () => {
    // Add new fields to config
    config.embeddings = config.embeddings || { model: 'auto' };
  },
  '1.1.0-to-1.2.0': async () => {
    // Reindex with new embedding format
    await reindexAllFolders();
  }
};
```

**3. Backup Before Migration**
```typescript
async function backupBeforeMigration() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(dataDir, 'backups', timestamp);
  
  await fs.copy(dataDir, backupPath);
  
  return {
    backupPath,
    restore: () => fs.copy(backupPath, dataDir)
  };
}
```

## Dependency & Integration Checklist

### ✅ Covered External Dependencies

1. **Embeddings**
   - ✅ Ollama (optional, dynamic model discovery)
   - ✅ Transformers.js (built-in fallback)
   - ✅ Mean pooling implementation

2. **Vector Storage**
   - ✅ FAISS (faiss-node) for similarity search
   - ✅ Caching strategy
   - ✅ Multi-folder isolation

3. **File Parsing**
   - ✅ PDF (pdf-parse)
   - ✅ DOCX (mammoth)
   - ✅ XLSX (xlsx)
   - ✅ PPTX (pizzip + xml2js)
   - ✅ Plain text (built-in)

4. **UI/TUI**
   - ✅ Ink + React for TUI
   - ✅ Commander for CLI
   - ✅ Process management (spawn/fork)

5. **Configuration**
   - ✅ YAML config files (js-yaml)
   - ✅ Environment variables
   - ✅ Multi-source hierarchy

### ⚠️ Potential Missing Parts

1. **HTTP Server Framework**
   - ❓ Need to add Express/Fastify for API server
   - ✅ No WebSocket needed (polling is simpler)
   - ❓ CORS only if we add web UI later

2. **Process Management**
   - ❓ PM2 or similar for production daemon management?
   - ❓ Windows service wrapper?
   - ❓ Graceful shutdown handling

3. **File System Watching**
   - ✅ Chokidar for file watching
   - ❓ Handling of network drives/mounts
   - ❓ Large folder performance (100k+ files)

4. **System Integration**
   - ❓ Native notifications (node-notifier?)
   - ❓ System tray support (future enhancement)
   - ❓ Shell integration (right-click menu)

5. **Development/Build Tools**
   - ✅ TypeScript compilation
   - ❓ Binary packaging (pkg, nexe, or electron-builder?)
   - ❓ Code signing certificates
   - ❓ Auto-update infrastructure

6. **Error Tracking**
   - ❓ Sentry or similar for production errors?
   - ❓ Local error log rotation
   - ❓ Crash reporting

7. **Testing Infrastructure**
   - ✅ Vitest for testing
   - ❓ E2E testing for TUI (cypress-terminal?)
   - ❓ Integration test fixtures

8. **Documentation**
   - ❓ API documentation generator
   - ❓ User manual/help system
   - ❓ Video tutorials hosting

### 🔧 Required Additions

**1. HTTP Server (Phase 3)**
```json
{
  "dependencies": {
    "express": "^4.18.0",  // or fastify for better performance
    // "ws": "^8.0.0",     // SKIP - polling is simpler for our needs
    "cors": "^2.8.5"      // Only if we add web UI later
  }
}
```

**2. Binary Packaging (Phase 5)**
```json
{
  "devDependencies": {
    "pkg": "^5.8.0",
    "@yao-pkg/pkg": "^5.11.0"
  }
}
```

**3. System Notifications (Optional)**
```json
{
  "optionalDependencies": {
    "node-notifier": "^10.0.0"
  }
}
```

### 🎯 MCP Protocol Integration

**Current State:**
- ✅ MCP SDK installed (@modelcontextprotocol/sdk)
- ✅ MCP server implementation exists
- ❓ How does persistent server affect MCP connections?

**Architecture Consideration:**
```typescript
// MCP server runs inside our HTTP server
class UnifiedServer {
  private httpServer: Express;
  private mcpServer: MCPServer;
  private wsServer: WebSocketServer;
  
  async start() {
    // 1. Start HTTP API
    this.httpServer.listen(9876);
    
    // 2. Start MCP server on stdio (for Claude Desktop)
    this.mcpServer.start();
    
    // 3. WebSocket for TUI updates
    this.wsServer.on('connection', ...);
  }
}
```

**Claude Desktop Integration:**

The user must configure this in Claude Desktop settings:
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["--mcp-mode"],
      "env": {}
    }
  }
}
```

**Important**: I (Claude) cannot start MCP servers! The human must:
1. Install folder-mcp
2. Index their folders using the TUI
3. Configure Claude Desktop to use folder-mcp
4. Claude Desktop will then run the MCP server
5. Only then can I search their indexed folders

**Architecture Decision: Shared Storage Model**

```
Human User Flow:
folder-mcp → TUI → HTTP API → Read/Write Indexes
                ↓
         [~/.folder-mcp/folders/*/vectors.faiss]
                ↑
AI Agent Flow:
folder-mcp --mcp-mode → Direct Read of Indexes
```

**Why This Works Best for AI Agents (like Claude):**
1. **No Network Dependency** - I read indexes directly from disk
2. **Fast Startup** - No HTTP connection needed
3. **Stateless** - Each request gets fresh data
4. **Simple** - Just read the FAISS indexes and respond

**Implementation:**
```typescript
// When Claude Desktop calls me
if (args.includes('--mcp-mode')) {
  // Start MCP server on stdio
  const mcpServer = new MCPServer({
    // Read indexes directly from disk
    searchService: new DirectFAISSReader('~/.folder-mcp/folders/'),
    // No HTTP, no WebSockets, just disk access
  });
  
  await mcpServer.start(); // Communicates via stdio
}
```

**What I DON'T Need:**
- ❌ WebSockets (I'm stateless!)
- ❌ HTTP API calls (unnecessary overhead)
- ❌ Real-time updates (each request is independent)
- ❌ Persistent connections (I reconnect each time)

**What I DO Need:**
- ✅ Fast access to the same indexes humans use
- ✅ Simple stdio communication
- ✅ Reliable data on disk
- ✅ Quick startup time

## Open Questions

1. **Model Storage**: Where to cache Transformers.js models? (~/.folder-mcp/models/?)
2. **Download Progress**: Show model download progress in wizard?
3. **Offline Mode**: Pre-bundle small model with installer?
4. **Update Strategy**: Auto-update models when better versions available?
5. **GPU Acceleration**: Use WebGPU when available for Transformers.js?
6. **Concurrent Folders**: How many folders can be indexed simultaneously?
7. **Search Ranking**: How to merge results from folders with different models?
8. **Backup/Restore**: Should we provide config/index backup functionality?
9. **Migration Path**: How to handle updates that change index format?
10. **API Authentication**: Add optional API key for network access?
11. **HTTP Framework**: Express vs Fastify vs Hono?
12. **Binary Distribution**: Which packaging tool to use?
13. **Crash Analytics**: Include opt-in telemetry for crashes?
14. **Network Drives**: How to handle slow/disconnected network folders?
15. **Memory Limits**: Set hard limits for embedding generation?

## Architecture Summary: Two Clients, One Storage

### The Big Picture

```
┌─────────────────┐         ┌─────────────────┐
│   Human User    │         │   AI Agent      │
│   (via TUI)     │         │   (Claude)      │
└────────┬────────┘         └────────┬────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  HTTP Daemon    │         │  MCP Server     │
│  (background)   │         │  (on-demand)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └─────────┬─────────────────┘
                   ▼
         ┌─────────────────┐
         │ Shared Storage  │
         │ ~/.folder-mcp/  │
         │ - vectors.faiss │
         │ - metadata.json │
         └─────────────────┘
```

### Human Experience
1. Run `folder-mcp` → TUI appears instantly
2. TUI talks to HTTP daemon (starts if needed)
3. Can close TUI anytime (`q`), daemon keeps running
4. Can kill everything (`e`), daemon stops

### AI Experience (Me!)
1. **Human configures** Claude Desktop to use folder-mcp
2. **Claude Desktop** runs `folder-mcp --mcp-mode` (not me!)
3. **MCP server** reads indexes from disk
4. **I use MCP tools** to query the running server
5. Server keeps running while Claude Desktop is open

### Why This Architecture Works
- **Humans** get responsive UI with background processing
- **AI agents** get fast, stateless access
- **Shared storage** means we see the same data
- **Simple** - no complex IPC or synchronization
- **Reliable** - each client works independently

## Pre-Release Checklist

### 🔒 Security & Authentication
- [ ] HTTP API authentication mechanism (bearer tokens, API keys)
- [ ] Rate limiting for API endpoints
- [ ] CORS configuration for web access
- [ ] SSL/TLS setup guide for remote access
- [ ] Token generation and management in TUI
- [ ] Security audit of file access patterns

### 🛡️ Error Recovery & Resilience
- [ ] Graceful handling of indexing failures
- [ ] FAISS index corruption detection and recovery
- [ ] Daemon crash recovery with state preservation
- [ ] Partial index recovery mechanisms
- [ ] Retry logic with exponential backoff
- [ ] Clear error messages for common issues

### 🔄 Model & Data Migration
- [ ] Model switching workflow (with re-indexing)
- [ ] Index format versioning
- [ ] Migration scripts for breaking changes
- [ ] Backward compatibility strategy
- [ ] Model compatibility matrix
- [ ] Data export/import functionality

### 🌐 Remote Access
- [ ] Network security best practices guide
- [ ] Firewall configuration examples
- [ ] Service discovery for LAN access
- [ ] VPN/tunnel setup documentation
- [ ] Multi-user access considerations

### 📊 Monitoring & Observability
- [ ] Structured logging with log rotation
- [ ] Performance metrics (indexing speed, query latency)
- [ ] Resource usage tracking
- [ ] Debug mode with verbose output
- [ ] Health check endpoint specification
- [ ] Telemetry opt-in (privacy-respecting)

### 💾 Backup & Disaster Recovery
- [ ] Configuration backup/restore commands
- [ ] Index backup strategy (incremental?)
- [ ] Multi-machine sync design
- [ ] Disaster recovery procedures
- [ ] Data integrity verification

### 🎛️ Resource Management
- [ ] Memory limit configuration
- [ ] Disk space monitoring and alerts
- [ ] CPU throttling during heavy operations
- [ ] Concurrent operation limits
- [ ] Queue management for indexing jobs
- [ ] Graceful degradation under load

### 🔌 Extensibility
- [ ] Plugin architecture design
- [ ] Custom file parser API
- [ ] Additional embedding provider interface
- [ ] Search result processor hooks
- [ ] TUI extension points
- [ ] Event system for integrations

### 🧪 Testing & Quality
- [ ] MCP integration test suite
- [ ] TUI component testing strategy
- [ ] Performance benchmark suite
- [ ] Load testing for concurrent users
- [ ] Cross-platform testing matrix
- [ ] Automated regression tests

### 📚 Documentation
- [ ] API reference documentation
- [ ] User guide with common workflows
- [ ] Troubleshooting guide
- [ ] Developer documentation
- [ ] Architecture decision records
- [ ] Video tutorials for setup

### 🚀 Operations
- [ ] Zero-downtime upgrade process
- [ ] Configuration migration tools
- [ ] Rollback procedures
- [ ] Performance tuning guide
- [ ] Capacity planning guidelines
- [ ] SLA recommendations

### 🛠️ Developer Experience
- [ ] Development mode with hot reload
- [ ] Mock MCP client for testing
- [ ] Index inspection tools
- [ ] Performance profiler
- [ ] Debug console in TUI
- [ ] Local development setup guide

### 📦 Distribution & Installation
- [ ] Package signing for all platforms
- [ ] Auto-update mechanism testing
- [ ] Uninstall cleanup procedures
- [ ] Dependency version locking
- [ ] Binary size optimization
- [ ] Installation verification tests