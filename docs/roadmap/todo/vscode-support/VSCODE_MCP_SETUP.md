# VSCode MCP Configuration Example

This document provides VSCode-specific configuration examples for the enhanced folder-mcp MCP server.

## 🚨 CRITICAL: Test Folder Setup

**⚠️ ALWAYS USE THE DEDICATED TEST FOLDER**: `C:\ThinkingHomes\test-folder`

- **✅ CORRECT**: Use `C:\ThinkingHomes\test-folder` as the target folder in ALL configurations
- **❌ WRONG**: NEVER use `C:\ThinkingHomes\folder-mcp` (the project folder) as the target

This prevents:
- Cache pollution in the project directory
- `.folder-mcp` folders appearing in your source code
- Indexing of source files during development
- Confusion between project files and test content

## VSCode Settings Configuration

Add this to your VSCode `settings.json` file to enable folder-mcp with VSCode MCP features:

```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": [
        "C:\\ThinkingHomes\\folder-mcp\\dist\\index.js",
        "C:\\ThinkingHomes\\test-folder"  
      ],
      "env": {},
      "dev": {
        "watch": "dist/**/*.js",
        "debug": { 
          "type": "node" 
        }
      }
    }
  }
}
```

## Enhanced Configuration with Tool Sets

For the full VSCode MCP experience with tool sets and enhanced features:

```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": [
        "C:\\ThinkingHomes\\folder-mcp\\dist\\index.js",
        "C:\\ThinkingHomes\\test-folder"
      ],
      "env": {
        "DEBUG": "folder-mcp:*"
      },
      "dev": {
        "watch": "dist/**/*.js",
        "debug": { 
          "type": "node",
          "port": 9229
        }
      },
      "toolSets": {
        "document-access": {
          "tools": ["get_document_content", "get_document_metadata", "get_chunks"],
          "description": "Direct document access and content retrieval",
          "icon": "file-text"
        },
        "content-analysis": {
          "tools": ["summarize_document", "batch_summarize", "query_table"],
          "description": "Document analysis and summarization", 
          "icon": "graph"
        },
        "workspace-navigation": {
          "tools": ["list_folders", "list_documents", "get_status"],
          "description": "Workspace exploration and status monitoring",
          "icon": "folder"
        },
        "search-intelligence": {
          "tools": ["search_documents", "search_chunks"],
          "description": "Semantic search and content discovery",
          "icon": "search"
        },
        "system-operations": {
          "tools": ["hello_world", "refresh_document", "get_embeddings"],
          "description": "System utilities and debugging tools",
          "icon": "tools"
        }
      }
    }
  }
}
```

## MCP Prompts (Slash Commands)

With the enhanced configuration, you can use these slash commands in VSCode:

- `/mcp.folder-mcp.search` - Quick document search
- `/mcp.folder-mcp.analyze` - Document analysis
- `/mcp.folder-mcp.navigate` - Workspace navigation
- `/mcp.folder-mcp.status` - System status check

## Development Mode Benefits

1. **Hot Reload**: Changes to the server code automatically restart the MCP connection
2. **Debug Support**: Node.js debugging available on port 9229
3. **Watch Mode**: Automatic file watching for `dist/**/*.js` files
4. **Enhanced Logging**: Debug information available when needed

## Resource Management

Search results and document content can be:
- **Saved** via the Save button in chat
- **Dragged** to the Explorer view
- **Added as context** via "Add Context... > MCP Resources"

## Testing the Configuration

1. Restart VSCode after adding the configuration
2. Open the workspace folder specified in your config
3. Test the connection with: `/mcp.folder-mcp.hello` (if prompts are enabled)
4. Use `hello_world` tool to verify basic connectivity

## Troubleshooting

### Common Issues

1. **Server not starting**: Check the paths in your configuration
2. **Tools not showing**: Verify the build completed successfully with `npm run build`
3. **Debug not working**: Ensure port 9229 is available

### Debug Logs

Enable debug logging by setting the `DEBUG` environment variable:
```json
"env": {
  "DEBUG": "folder-mcp:*"
}
```

All MCP protocol logs go to stderr to avoid interfering with the JSON-RPC communication on stdout.
