# End-to-End Claude Desktop Integration Test - MCP v2.0 Endpoints (macOS)

**Main Goal**: Verify all 8 new MCP endpoints work seamlessly with Claude Desktop on macOS  
**Sub Goal**: Validate real-world usage scenarios for the redesigned MCP API  
**Test Environment**: `/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base`  
**Updated**: June 2025 - Adapted from Windows version for macOS testing

## Pre-Test Cleanup (Steps 1-6)

### 1. Kill Running MCP Server Instances
```bash
pkill -f "node.*mcp" 2>/dev/null || true
```

### 2. Check for Port Conflicts
```bash
lsof -i :3000
# If conflicts found, note PIDs and kill if necessary
```
*(Adjust port number as needed for your configuration)*

### 3. Clear Stuck Processes
```bash
pkill -f node 2>/dev/null || true
```

### 4. Clear Claude Desktop Logs (MANDATORY)
```bash
rm -rf "$HOME/Library/Logs/Claude"/* 2>/dev/null || true
rm -rf "$HOME/Library/Application Support/Claude/logs"/* 2>/dev/null || true
```

### 5. Delete MCP Cache Folder  
```bash
rm -rf "/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/.folder-mcp" 2>/dev/null || true
```

### 6. Fresh Terminal Session
- Close current Terminal
- Open new Terminal 
- Navigate to project directory: `cd /Users/hanan/Projects/folder-mcp`

## Test Execution (Steps 7-11)

### 7. Start MCP Server & Verify New Architecture
- Verify zero TypeScript errors: `npm run build`
- Ensure all tests pass: `npm test` (should show real integration tests passing)
- Launch server: `node dist/mcp-server.js /Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base`
- Verify startup logs show new endpoint registrations
- **Success Criteria**: No TS errors, all tests pass, server starts with stdio transport, new endpoints loaded

### 8. Verify Existing Test Knowledge Base
Your project already has a comprehensive test knowledge base! Verify it contains:

**Document Structure**:
```bash
ls -la /Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/
```

**Expected Structure**:
- `Finance/` - Financial documents (Q1_Report.pdf, Q4_Budget.xlsx, etc.)
- `Sales/` - Sales data (Customer_List.csv, Sales_Pipeline.xlsx, Q4_Board_Deck.pptx)  
- `Legal/` - Legal documents (Acme_Vendor_Agreement.pdf, Supply_Contract_2024.docx)
- `Policies/` - Policy documents (Remote_Work_Policy.pdf, Remote_Work_Policy.docx)
- `test-edge-cases/` - Edge case files (empty.txt, huge_test.txt, unicode files)

**Advantage**: Your test knowledge base already contains 36+ realistic business documents that have been tested in the real integration test suite!

### 9. Configure Claude Desktop for Testing
Create or update your Claude Desktop configuration:

**File**: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": [
        "/Users/hanan/Projects/folder-mcp/dist/mcp-server.js", 
        "/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base"
      ],
      "env": {}
    }
  }
}
```

### 10. Verify Indexing & File Watching
- Restart Claude Desktop completely
- Wait 30-45 seconds for complete indexing of all test documents
- **Verification**: Check server logs for successful indexing messages  
- **Test File Update**: `echo "Updated: $(date)" >> /Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/Finance/test_update.txt`
- **Verify Hot Reload**: Confirm file changes are detected and re-indexed
- **Success Criteria**: All documents indexed, file watching active, updates detected within 30 seconds

### 11. Claude Desktop MCP v2.0 Endpoint Testing (MANDATORY)

Test all 8 new MCP endpoints in realistic scenarios. Use these prompts with Claude Desktop:

#### **Test Scenario 1: Document Discovery & Search**
```
I need to explore this knowledge base and find information about our business operations. Please:

1. Show me the folder structure and what types of documents are available
2. Search for "sales performance" or "revenue" content across all documents  
3. Find any vendor or contract information from Legal documents
4. Tell me what endpoints you used for each step

Format as JSON:
{
  "folder_structure": "...",
  "search_results": "...", 
  "legal_contracts": "...",
  "endpoints_used": ["list_folders", "search", ...]
}
```

#### **Test Scenario 2: Document Deep Dive**
```
I want to analyze our business documents in detail. Please:

1. Get the outline/structure of the Q4 Board Deck presentation
2. Extract data from the Sales Pipeline Excel file (show me the sheets and sample data)
3. Get the first few pages of the Q1 Report PDF
4. Tell me the metadata for each document type

Provide detailed results showing what information you can extract from each document type.
```

#### **Test Scenario 3: Specific Data Extraction**
```  
I need specific data extraction from our business documents. Please:

1. Get specific slides from the Q4 Board Deck (slides 1-3)
2. Extract customer data from the Customer_List.csv file
3. Get pages 1-2 from the Acme Vendor Agreement PDF
4. Search for "remote work" or "policy" terms across all documents

Show me exactly what data you can retrieve and how precise the extraction is.
```

#### **Test Scenario 4: System Health & Performance**
```
I want to understand the system status and capabilities. Please:

1. Check the system status and health
2. Tell me what embedding/vector capabilities are available
3. Show me performance metrics if available
4. List all available functions/endpoints you can use

Provide a comprehensive system report.
```

#### **Test Scenario 5: Real User Stories (From Development Plan)**
Test the actual user stories from your development plan:

```
Test these real business scenarios:

1. "Find last month's sales performance and analyze trends"
2. "Find all vendor contracts and check expiration dates"  
3. "What's in this 100-page report? I need the financial section"
4. "Analyze customer churn across sources"
5. "Research company's remote work policy"

For each scenario, show me what documents you find and what specific data you can extract.
```

### 12. Results Analysis & Validation

For each test scenario, analyze Claude Desktop's responses:

#### **Expected Endpoint Usage**:
- **`search`**: Semantic and keyword searching across your real business documents
- **`get_document_outline`**: Structure discovery for PDFs, Excel, PowerPoint  
- **`get_document_data`**: Content extraction from actual policy and contract documents
- **`get_sheet_data`**: Real customer and sales data from CSV/Excel files
- **`get_slides`**: Board deck and presentation content
- **`get_pages`**: Legal document and report page access
- **`list_folders`** / **`list_documents`**: Navigation of Finance/Sales/Legal structure
- **`get_status`**: System health with real indexing metrics

#### **Validation Checklist**:
- [ ] **Endpoint Coverage**: Did Claude use all 8 endpoint types appropriately?
- [ ] **Data Quality**: Are search results from real documents relevant and accurate?
- [ ] **Token Management**: Are responses properly paginated (no token overflow)?
- [ ] **Error Handling**: How does Claude handle edge case files (empty.txt, corrupted files)?
- [ ] **Performance**: Are responses fast enough for interactive use?
- [ ] **Real Content**: Does Claude accurately extract content from your test business documents?

#### **Success Metrics**:
- [ ] All 8 endpoints successfully called
- [ ] Search finds relevant content in Finance/Sales/Legal documents
- [ ] Document structures properly extracted from real PDFs/Excel/PowerPoint
- [ ] Customer data correctly extracted from CSV files
- [ ] Board deck slides properly accessed
- [ ] Legal document pages correctly retrieved
- [ ] System status reports real indexing of 36+ documents
- [ ] File watching detects changes in real-time

### 13. Advanced Testing with Real Integration Test Knowledge

**Leverage Your Existing Test Suite**:
Your project has comprehensive real integration tests that validate exactly what Claude Desktop should be able to do. Compare Claude Desktop results with your test expectations:

```bash
# Run your real integration tests to see expected behavior
npm test -- --testPathPattern="real-integration"
```

**Cross-Reference Results**:
- **search-real.test.ts**: Compare Claude's search results with test expectations
- **document-data-real.test.ts**: Verify Claude extracts same content as tests
- **user-story-workflows-real.test.ts**: Validate Claude can complete same workflows
- **cache-validation-real.test.ts**: Check that .folder-mcp cache is created

### 14. Issue Resolution & Enhancement Planning

**Issue Categories**:
1. **Critical**: Endpoints not working, server crashes, no data returned
2. **Performance**: Slow responses, memory issues, indexing delays  
3. **Data Quality**: Claude can't find content that tests prove exists
4. **Integration**: Results differ significantly from real integration test expectations

**Documentation Process**:
- Document issues in `docs/testing/claude-desktop-test-results-$(date +%Y%m%d).md`
- Include specific error messages, response times, and reproduction steps
- Compare actual Claude Desktop behavior with real integration test expectations
- For each issue, specify: endpoint involved, input parameters, expected vs actual behavior

## Success Metrics for MCP v2.0 Architecture on macOS

### **Endpoint Functionality**:
- [ ] **`search`**: Finds sales data in Customer_List.csv and Sales_Pipeline.xlsx
- [ ] **`get_document_outline`**: Extracts structure from Q1_Report.pdf and Q4_Board_Deck.pptx
- [ ] **`get_document_data`**: Retrieves policy content from Remote_Work_Policy documents
- [ ] **`list_folders`** / **`list_documents`**: Navigates Finance/Sales/Legal/Policies structure
- [ ] **`get_sheet_data`**: Accesses real customer and sales data
- [ ] **`get_slides`**: Extracts board presentation content
- [ ] **`get_pages`**: Retrieves vendor agreement and report pages
- [ ] **`get_status`**: Reports indexing of actual business document collection

### **Performance & Quality on macOS**:
- [ ] **Response Time**: All endpoints respond within 2 seconds for typical requests
- [ ] **macOS Integration**: Proper file watching with FSEvents
- [ ] **Search Relevance**: Finds relevant content in real business documents
- [ ] **File Watching**: Changes detected using macOS native file system events
- [ ] **Memory Usage**: Server remains stable during extended testing
- [ ] **Real Content Accuracy**: Claude extracts same content validated by real integration tests

### **Integration Quality**:
- [ ] **Claude Desktop**: Successfully connects and uses all endpoints with real data
- [ ] **Real Document Processing**: Accurately processes your actual test business documents
- [ ] **User Experience**: Claude can complete the 10 user stories from your development plan
- [ ] **Test Parity**: Results match expectations set by your comprehensive real integration test suite

**This test concludes when all 8 endpoints work reliably with Claude Desktop using your real test business documents, demonstrating the effectiveness of the new MCP v2.0 architecture on macOS.**

---

## Quick Start Command Reference

```bash
# Complete test setup
cd /Users/hanan/Projects/folder-mcp
npm run build && npm test

# Start server with your real test knowledge base
node dist/mcp-server.js /Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base

# Monitor server in separate terminal
tail -f /tmp/mcp-server.log

# Test file watching
echo "Test update: $(date)" >> /Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/Finance/test_update.txt
```

## Troubleshooting

**Common Issues**:
- **Server won't start**: Check for TypeScript errors with `npm run build`
- **Tests failing**: Run `npm test` to identify failing test cases
- **Claude can't connect**: Verify MCP server config in `~/Library/Application Support/Claude/claude_desktop_config.json`
- **No search results**: Check if indexing completed (wait 30-60 seconds after startup)
- **Different results than tests**: Compare with `npm test -- --testPathPattern="real-integration"`

**Debug Commands**:
```bash
# Check server process
ps aux | grep node

# View detailed logs  
DEBUG="*" node dist/mcp-server.js /Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base

# Test cache creation
ls -la /Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/.folder-mcp/
```

**Advantage**: Your test routine can validate against 36+ real business documents that have already been proven to work through your comprehensive real integration test suite!