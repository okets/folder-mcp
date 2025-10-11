# MCP Server Request Flow Diagram

## Complete Agent → MCP Server → Daemon → Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             AI AGENT (Claude Desktop)                           │
│                                                                                 │
│  User: "Search for documents about revenue"                                     │
│  Agent: mcp__folder-mcp__search("revenue", "/path/to/folder")                   │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              │ JSON-RPC over STDIO
                              │ {"jsonrpc":"2.0","method":"tools/call",
                              │  "params":{"name":"search","arguments":{...}}}
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          MCP SERVER ENTRY POINT                                │
│                         src/mcp-server.ts                                      │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. StdioServerTransport                                                 │   │
│  │    - Listens on stdin/stdout                                            │   │
│  │    - Parses JSON-RPC messages                                           │   │
│  │    - Routes to request handlers                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                 │
│                              ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 2. CallToolRequestSchema Handler (line 315)                            │   │
│  │    server.setRequestHandler(CallToolRequestSchema, async (request) => { │   │
│  │      const { name, arguments: args } = request.params;                 │   │
│  │      switch (name) {                                                    │   │
│  │        case 'search': {                                                 │   │
│  │          const result = await daemonEndpoints.search(...);             │   │
│  │          return result as any;                                          │   │
│  │        }                                                                │   │
│  │      }                                                                  │   │
│  │    });                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              │ Method call
                              │ daemonEndpoints.search(query, folderPath, options)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          MCP ENDPOINTS LAYER                                   │
│                   src/interfaces/mcp/daemon-mcp-endpoints.ts                   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 3. DaemonMCPEndpoints.search() (line 178)                              │   │
│  │    async search(query, folderPath, options): Promise<MCPToolResponse> { │   │
│  │      try {                                                              │   │
│  │        // Call daemon REST API search endpoint                          │   │
│  │        const searchResponse = await this.daemonClient.searchFolder(    │   │
│  │          folderPath, { query, limit, threshold, includeContent }       │   │
│  │        );                                                               │   │
│  │        return { content: [{ type: 'text', text: formattedResults }] }; │   │
│  │      } catch (error) {                                                  │   │
│  │        return { content: [{ type: 'text', text: `Error: ${error}` }] }; │   │
│  │      }                                                                  │   │
│  │    }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              │ HTTP REST call
                              │ this.daemonClient.searchFolder(folderPath, searchParams)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REST CLIENT LAYER                                     │
│                  src/interfaces/mcp/daemon-rest-client.ts                      │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 4. DaemonRESTClient.searchFolder() (line 442)                          │   │
│  │    async searchFolder(folderPath, searchParams): Promise<SearchResult> {│   │
│  │      const path = `/api/v1/folders/${encodeURIComponent(folderPath)}    │   │
│  │                    /search`;                                            │   │
│  │      return await this.makeRequest(path, {                              │   │
│  │        method: 'POST',                                                  │   │
│  │        headers: { 'Content-Type': 'application/json' },                 │   │
│  │        body: JSON.stringify(searchParams)                               │   │
│  │      });                                                                │   │
│  │    }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                 │
│                              ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 5. DaemonRESTClient.makeRequest() (line 218) 🔄 RECOVERY LOGIC         │   │
│  │    private async makeRequest<T>(path, options): Promise<T> {            │   │
│  │      const url = `${this.baseUrl}${path}`;                             │   │
│  │      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) { │   │
│  │        try {                                                            │   │
│  │          const response = await fetch(url, options);                   │   │
│  │          return await response.json();                                  │   │
│  │        } catch (error) {                                                │   │
│  │          // Retry logic with exponential backoff                       │   │
│  │        }                                                                │   │
│  │      }                                                                  │   │
│  │      // 🔄 AUTO-RECOVERY: If daemon down, restart it!                  │   │
│  │      if (isDaemonDownError(finalError)) {                              │   │
│  │        await attemptDaemonAutoStart();                                  │   │
│  │        return await this.makeRequest(path, options); // Retry           │   │
│  │      }                                                                  │   │
│  │    }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              │ HTTP POST Request
                              │ POST http://localhost:3002/api/v1/folders/[path]/search
                              │ Body: {"query":"revenue","limit":10,"threshold":0.3}
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DAEMON PROCESS                                    │
│                          src/daemon/index.ts                                   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 6. Express HTTP Server (port 3002)                                     │   │
│  │    app.post('/api/v1/folders/:folderPath/search_content', async (req, res) => { │   │
│  │      const { folderPath } = req.params;                                │   │
│  │      const { semantic_concepts, exact_terms, min_score, limit } = req.body; │   │
│  │      // Route to search service (Sprint 8 hybrid search)               │   │
│  │    });                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                 │
│                              ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 7. DocumentService.searchDocuments()                                   │   │
│  │    src/daemon/services/document-service.ts                             │   │
│  │    - Load folder configuration                                          │   │
│  │    - Get embedding model for folder                                     │   │
│  │    - Perform semantic search on indexed documents                      │   │
│  │    - Return ranked results with relevance scores                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                 │
│                              ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 8. Vector Search & Embedding Models                                    │   │
│  │    - Python GPU models (BGE-M3, E5-Large, etc.)                      │   │
│  │    - ONNX CPU models (Xenova transformers)                            │   │
│  │    - SQLite vector storage with embeddings                             │   │
│  │    - Semantic similarity matching                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              │ HTTP Response
                              │ {results: [{documentName, relevance, snippet}], 
                              │  performance: {searchTime, modelUsed}}
                              ▼
            ┌─────────────────────────────────────────┐
            │          RESPONSE FLOW (Reverse)        │
            └─────────────────────────────────────────┘
                              │
                              │ 9. DaemonRESTClient returns SearchResult
                              ▼
                              │ 10. DaemonMCPEndpoints formats as MCPToolResponse
                              ▼
                              │ 11. mcp-server.ts returns JSON-RPC response
                              ▼
                              │ 12. StdioTransport sends to Claude Desktop
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             AI AGENT RECEIVES                                  │
│                                                                                 │
│  🔍 Search Results for "revenue"                                               │
│  ════════════════════════════════════                                         │
│  📁 Folder: /path/to/folder                                                   │
│  📊 Search Performance: 145ms, BGE-M3 model                                   │
│  📄 Results:                                                                   │
│     1. 📄 Q1_Revenue_Report.pdf (0.89 relevance)                             │
│        Snippet: "Total revenue for Q1 was $2.3M, showing 15% growth..."      │
│     2. 📄 Sales_Analysis.docx (0.82 relevance)                               │
│        Snippet: "Revenue breakdown by product category shows..."              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Error Recovery Flow (When Daemon is Down)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DAEMON DOWN SCENARIO                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

Agent makes request → MCP Server → DaemonMCPEndpoints → DaemonRESTClient.makeRequest()
                                                                    │
                                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ HTTP Request to localhost:3002 FAILS    │
                               │ Error: ECONNREFUSED                     │
                               └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ 🔄 AUTO-RECOVERY TRIGGERED              │
                               │ isDaemonDownError(error) = true         │
                               └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ attemptDaemonAutoStart()                │
                               │ - Find daemon executable                │
                               │ - spawn('node', [daemon-path])          │
                               │ - Wait for health check (10s timeout)  │
                               └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ Daemon Started Successfully              │
                               │ Health check: status = "healthy"        │
                               └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ RETRY ORIGINAL REQUEST                  │
                               │ return await this.makeRequest(path)     │
                               └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │ ✅ SUCCESS: Request completes normally  │
                               │ Agent never knows daemon was down!      │
                               └─────────────────────────────────────────┘
```

## Key Files and Their Roles

### **1. Entry Point: `src/mcp-server.ts`**
- **Purpose**: Main MCP server implementing JSON-RPC protocol
- **Key Methods**: 
  - `setupMCPServer()` - Creates MCP server with tool handlers
  - `CallToolRequestSchema` handler - Routes tool calls to daemon endpoints
  - `attemptDaemonAutoStart()` - Auto-recovery for STDIO path

### **2. MCP Interface: `src/interfaces/mcp/daemon-mcp-endpoints.ts`**
- **Purpose**: Transforms daemon responses to MCP protocol format
- **Key Methods**:
  - `search()` - Formats search results for MCP
  - `listFolders()` - Shows available folders  
  - `getDocument()` - Retrieves document content

### **3. REST Client: `src/interfaces/mcp/daemon-rest-client.ts`**
- **Purpose**: HTTP client for daemon communication with auto-recovery
- **Key Methods**:
  - `makeRequest()` - Core HTTP request with retry + recovery logic
  - `searchFolder()` - Search endpoint wrapper
  - `connect()` - Auto-discovers daemon port and connects

### **4. Daemon Core: `src/daemon/index.ts`**
- **Purpose**: Background service managing folders and search
- **Key Components**:
  - Express HTTP server (port 3002)
  - Document indexing and search services
  - Embedding model management (GPU/CPU)
  - File watching and real-time updates

## Request Types and Flows

| **Tool** | **MCP Method** | **Daemon Endpoint** | **Purpose** |
|----------|---------------|-------------------|-------------|
| `search_content` | `daemonEndpoints.searchContent()` | `POST /api/v1/folders/:path/search_content` | Chunk-level semantic search with hybrid scoring (Sprint 8) |
| `list_folders` | `daemonEndpoints.listFolders()` | `GET /api/v1/folders` | Show configured folders |
| `get_document_data` | `daemonEndpoints.getDocument()` | `GET /api/v1/folders/:path/documents/:id` | Retrieve document content |
| `get_server_info` | `daemonEndpoints.getServerInfo()` | `GET /api/v1/server/info` | System status and capabilities |

This architecture provides **complete auto-recovery** at multiple levels, ensuring agents never experience permanent failures from daemon shutdowns! 🎉