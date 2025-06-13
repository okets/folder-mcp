# Claude Desktop MCP Configuration

## Quick Setup

1. **Ensure the MCP server is built:**
   ```powershell
   npm run build
   ```

2. **Claude Desktop Configuration Location:**
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

3. **Configuration Content:**
   ```json
   {
     "mcpServers": {
       "folder-mcp": {
         "command": "node",
         "args": [
           "C:\\ThinkingHomes\\folder-mcp\\dist\\mcp-server.js",
           "C:\\ThinkingHomes\\folder-mcp"
         ],
         "env": {}
       }
     }
   }
   ```

## Testing the Connection

### Command Line Testing (Verify first)
```powershell
# Test tool discovery
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node ./dist/mcp-server.js .

# Test hello_world tool
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hello_world","arguments":{}}}' | node ./dist/mcp-server.js .
```

### Claude Desktop Testing
1. **Restart Claude Desktop** completely (close and reopen)
2. **Check for MCP Server**: Look for "folder-mcp" in the available tools
3. **Test hello_world tool**: Should be available in Claude's tool list
4. **Execute hello_world**: Should return "Hello World!" message

## Expected Behavior

### ✅ Success Indicators
- [ ] Claude Desktop shows "folder-mcp" server as connected
- [ ] "hello_world" tool appears in tool list
- [ ] Executing "hello_world" returns "Hello World!" message
- [ ] No error messages in Claude Desktop
- [ ] Server logs show connection and tool execution

### ❌ Troubleshooting Common Issues

**If Claude Desktop doesn't see the server:**
1. Check that the path in config is correct and absolute
2. Verify `npm run build` completed successfully
3. Test with command line first to ensure server works
4. Restart Claude Desktop completely
5. Check Claude Desktop logs for connection errors

**CRITICAL: Ensure valid JSON-RPC protocol**
1. Only valid JSON-RPC messages should go to stdout
2. All logs must be redirected to stderr, NEVER stdout
3. Never use console.log() directly, use process.stderr.write() instead
4. Any debugging that pollutes stdout will break the connection

**If tools don't appear:**
1. Verify JSON-RPC responses are valid
2. Check server logs for errors
3. Test tools/list manually with command line

**If tool execution fails:**
1. Check that arguments match inputSchema
2. Verify server logs for execution errors
3. Ensure proper error handling in tool handlers

## Current Available Tools

### hello_world
- **Description**: Returns a hello world message
- **Arguments**: None
- **Response**: "Hello World!" text message
- **Purpose**: Verify MCP server connection and basic functionality

## Next Steps

Once hello_world is working in Claude Desktop:
1. Add file operation tools (read_file, list_files, search_files)
2. Add system information tools (get_folder_info)
3. Integrate with existing application layer services
4. Add knowledge/vector search capabilities (if available)
