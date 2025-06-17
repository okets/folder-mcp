# VSCode MCP Development Configuration Examples

## 🚨 CRITICAL: Test Folder Setup

**⚠️ ALWAYS USE THE DEDICATED TEST FOLDER**: `C:\ThinkingHomes\test-folder`

- **✅ CORRECT**: `C:\ThinkingHomes\test-folder` - Use this for ALL testing and development
- **❌ WRONG**: `C:\ThinkingHomes\folder-mcp` - NEVER use the project folder as the target

### Why This Matters:
- Prevents cache pollution in the project directory  
- Ensures clean testing environment
- Avoids indexing source code files during development
- Prevents `.folder-mcp` cache folders from appearing in the project

### Test Folder Structure:
```
C:\ThinkingHomes\test-folder\
├── test-document-1.md
├── test-document-2.md  
├── sample.txt
├── subfolder/
│   └── nested-doc.md
└── (add your own test files here)
```

**Before running any tests**: Ensure the test folder exists and contains sample files.

## Basic Development Configuration

Add this to your VSCode MCP servers configuration to enable development mode with tool sets:

```json
{
  "servers": {
    "folder-mcp": {
      "command": "node",
      "args": ["C:\\ThinkingHomes\\folder-mcp\\dist\\index.js", "C:\\ThinkingHomes\\test-folder"],
      "dev": {
        "watch": "dist/**/*.js",
        "debug": { 
          "type": "node",
          "port": 9229 
        }
      },
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Tool Sets Feature

The server now organizes tools into logical groups:

### Document Access
- `get_document_content`
- `get_document_metadata` 
- `get_chunks`

### Content Analysis
- `summarize_document`
- `batch_summarize`
- `query_table`

### Workspace Navigation
- `list_folders`
- `list_documents`
- `get_status`

### Search Intelligence
- `search_documents`
- `search_chunks`

### System Operations
- `get_status`
- `refresh_document`
- `get_embeddings`

## MCP Resources

Resources are now available for save/drag operations:
- Search results can be saved as files
- Document content can be dragged to editor
- Analysis results can be attached as context

## Expected VSCode Features

With VSCode 1.101+, you should see:
1. **Organized Tools**: Tools grouped by functionality with icons
2. **MCP Prompts**: Use slash commands like `/mcp.folder-mcp.search`
3. **Save/Drag**: Save button on search results, drag to explorer
4. **Development Mode**: Hot reload when server files change
5. **Implicit Context**: Automatic awareness of current file

## Usage Examples

### Quick Search (MCP Prompt)
```
/mcp.folder-mcp.search documentation typescript
```

### Save Search Results
1. Run search_documents tool
2. Click "Save" button on results
3. Choose location in workspace

### Drag Document Content
1. Run get_document_content tool
2. Drag result to Explorer view
3. Creates new file with content

## Development Workflow

1. Make changes to server code
2. VSCode automatically detects changes
3. Server reloads without restart
4. Test changes immediately

This significantly improves the development experience compared to Claude Desktop's restart cycle.
