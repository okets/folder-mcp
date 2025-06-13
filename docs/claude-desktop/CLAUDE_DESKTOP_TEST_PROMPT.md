# Claude Desktop MCP Server Test Prompt

Copy and paste this prompt to Claude Desktop to test the folder-mcp server integration:

---

**TEST PROMPT FOR CLAUDE DESKTOP:**

```
Hello! I need you to help me test the folder-mcp MCP server integration. Please perform the following checks:

1. **Server Connection Check:**
   - Can you see the "folder-mcp" server in your available servers/tools?
   - What is the connection status of the folder-mcp server?

2. **Tool Discovery:**
   - List all available tools from the folder-mcp server
   - Specifically, can you see a tool called "hello_world"?

3. **Tool Testing:**
   - Please execute the "hello_world" tool with no arguments
   - What response do you get?

4. **Error Check:**
   - Are there any error messages related to the folder-mcp server?
   - Is the server showing as connected/disconnected?

Please provide detailed information about each step, including any error messages or unexpected behavior. This will help me verify that the MCP server is working correctly with Claude Desktop.

If you cannot see the folder-mcp server at all, please let me know immediately.
```

---

**Expected Successful Response Should Include:**

✅ **Server Visible:** "I can see the folder-mcp server"  
✅ **Tool Available:** "I can see the hello_world tool"  
✅ **Tool Execution:** "Hello, World! MCP server is working correctly."  
✅ **No Errors:** No connection or execution errors

**Copy the response Claude gives you and paste it back for analysis.**
