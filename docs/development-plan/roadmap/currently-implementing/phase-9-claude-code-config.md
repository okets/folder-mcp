# Claude Code Configuration for Phase 9 Multi-Folder Support

## Overview

In Phase 9, the folder-mcp MCP server has been updated to support multi-folder operations via a daemon connection. The MCP server no longer requires a folder path argument and instead connects to the daemon's REST API to access multiple folders.

## Configuration Changes

### Old Configuration (Single-Folder Mode - DEPRECATED)
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": ["/path/to/folder-mcp/dist/mcp-server.js", "/path/to/folder"],
      "env": {}
    }
  }
}
```

### New Configuration (Multi-Folder Mode via Daemon)

Replace `{{FOLDER_MCP_PATH}}` with your actual folder-mcp installation or build path:

```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": ["{{FOLDER_MCP_PATH}}/dist/mcp-server.js"],
      "env": {
        "DAEMON_URL": "http://localhost:3002",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

For example:
- Local development: `/path/to/folder-mcp/dist/mcp-server.js`
- Global install: `/usr/local/lib/node_modules/folder-mcp/dist/mcp-server.js`
- Windows: `C:\\Users\\YourName\\folder-mcp\\dist\\mcp-server.js`

## Key Changes

1. **No Folder Path Required**: The MCP server no longer needs a folder path as the last argument
2. **Daemon Connection**: The server connects to the daemon REST API on port 3002
3. **Environment Variables**: 
   - `DAEMON_URL`: Optional, defaults to `http://localhost:3002`
   - `LOG_LEVEL`: Optional, for debugging (values: debug, info, warn, error)

## Setup Instructions

### 1. Ensure the Daemon is Running

Before using the MCP server in Claude Code, make sure the daemon is running:

```bash
# Start the daemon (if not already running)
npm run daemon:restart

# Verify the daemon is running
curl http://localhost:3002/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 123,
  "version": "2.0.0-dev",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Build the MCP Server

```bash
npm run build
```

### 3. Update Claude Code Configuration

1. Open Claude Code settings
2. Navigate to the MCP servers configuration
3. Update or add the folder-mcp configuration using the new format above
4. Save and restart Claude Code

### 4. Verify Connection

In Claude Code, you should be able to use folder-mcp tools. Test with:
- "Use the get_server_info tool to check the connection"
- The response should show multi-folder information from the daemon

## Troubleshooting

### MCP Server Cannot Connect to Daemon

**Error**: "Failed to connect to daemon at http://localhost:3002"

**Solutions**:
1. Ensure the daemon is running: `npm run daemon:restart`
2. Check the daemon logs for any errors
3. Verify port 3002 is not blocked by firewall
4. Try setting explicit DAEMON_URL in the env section

### No Tools Available in Claude Code

**Error**: MCP tools don't appear in Claude Code

**Solutions**:
1. Check the MCP server logs (visible in Claude Code developer console)
2. Ensure the path to mcp-server.js is correct
3. Verify the build completed successfully: `npm run build`
4. Restart Claude Code after configuration changes

### Connection Timeout

**Error**: "Request to daemon timed out"

**Solutions**:
1. Check if daemon is under heavy load
2. Increase timeout by modifying the DaemonRESTClient timeout value
3. Check network connectivity to localhost:3002

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DAEMON_URL` | `http://localhost:3002` | URL of the daemon REST API |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

## Migration from Single-Folder Mode

If you were previously using folder-mcp in single-folder mode:

1. Remove the folder path from the args array
2. Add the DAEMON_URL environment variable (optional if using default)
3. Configure your folders in the daemon instead of passing a single folder path
4. Restart Claude Code

## Future Enhancements

In upcoming sprints, the following features will be added:
- Full multi-folder search capabilities
- Folder-specific document operations
- Cross-folder search (Sprint 7+)
- Authentication and rate limiting (Sprint 8)

## Example Use Cases

### Checking Multi-Folder Status
Ask Claude: "Use the get_server_info tool to show me how many folders are configured"

### Future: Searching Specific Folders (Sprint 7)
Ask Claude: "Search for 'revenue projections' in the Sales folder"

### Future: Listing Documents (Sprint 5)
Ask Claude: "List all documents in the Engineering folder"

## Notes

- The daemon must be running before starting Claude Code with the MCP server
- All folder configuration is now managed through the daemon, not through MCP server arguments
- The MCP server acts as a stateless bridge between Claude Code and the daemon
- Multiple MCP clients can connect to the same daemon simultaneously