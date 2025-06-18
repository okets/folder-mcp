# End-to-End Claude Desktop Integration Test - MCP v2.0 Endpoints

**Main Goal**: Verify all 8 new MCP endpoints work seamlessly with Claude Desktop  
**Sub Goal**: Validate real-world usage scenarios for the redesigned MCP API  
**Test Environment**: `C:\ThinkingHomes\test-folder`  
**Updated**: June 2025 - Tests new MCP endpoint architecture

## Pre-Test Cleanup (Steps 1-6)

### 1. Kill Running MCP Server Instances
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.CommandLine -like "*mcp*"} | Stop-Process -Force
```

### 2. Check for Port Conflicts
```powershell
netstat -ano | findstr :3000
# If conflicts found, note PIDs and kill if necessary
```
*(Adjust port number as needed for your configuration)*

### 3. Clear Stuck Processes
```powershell
taskkill /f /im node.exe
```

### 4. Clear Claude Desktop Logs (MANDATORY)
```powershell
Remove-Item "$env:APPDATA\Claude\logs\*" -Force -ErrorAction SilentlyContinue
```

### 5. Delete MCP Cache Folder
```powershell
Remove-Item "C:\ThinkingHomes\test-folder\.folder-mcp" -Recurse -Force -ErrorAction SilentlyContinue
```

### 6. Fresh Terminal Session
- Close current PowerShell
- Open new PowerShell as Administrator
- Navigate to project directory

## Test Execution (Steps 7-11)

### 7. Start MCP Server & Verify New Architecture
- Verify zero TypeScript errors: `npm run build`
- Ensure all tests pass: `npm test` (should show 34/34 MCP endpoint tests passing)
- Launch server: `npm start` or direct execution via `node dist/mcp-server.js`
- Verify startup logs show new endpoint registrations
- **Success Criteria**: No TS errors, all tests pass, server starts with stdio transport, new endpoints loaded

### 8. Create Comprehensive Test Knowledge Base
Create a realistic test environment that exercises all endpoint capabilities:

**Document Structure**:
```powershell
# Create test folder structure
New-Item -Path "C:\ThinkingHomes\test-folder" -ItemType Directory -Force
New-Item -Path "C:\ThinkingHomes\test-folder\Engineering" -ItemType Directory -Force
New-Item -Path "C:\ThinkingHomes\test-folder\Finance" -ItemType Directory -Force
New-Item -Path "C:\ThinkingHomes\test-folder\Legal" -ItemType Directory -Force
New-Item -Path "C:\ThinkingHomes\test-folder\Marketing" -ItemType Directory -Force
```

**Test Documents** (create these files with realistic content):
- `Engineering\README.md` - Technical project documentation
- `Engineering\API_Design.md` - API specifications  
- `Finance\Q4_Budget.xlsx` - Excel spreadsheet with multiple sheets
- `Finance\Expense_Report.csv` - CSV data file
- `Legal\Service_Agreement.docx` - Word document
- `Legal\Privacy_Policy.pdf` - PDF document (multiple pages)
- `Marketing\Campaign_Deck.pptx` - PowerPoint presentation
- `Marketing\Brand_Guidelines.pdf` - Multi-page PDF with images

**Agent Task**: Create realistic, substantial content for each file type to ensure meaningful search results and data extraction.

### 9. Verify Indexing & File Watching
- Wait 30-45 seconds for complete indexing of all test documents
- **Verification**: Check server logs for successful indexing messages
- **Test File Update**: Modify `Engineering\README.md` with new content
- **Verify Hot Reload**: Confirm file changes are detected and re-indexed
- **Success Criteria**: All documents indexed, file watching active, updates detected within 30 seconds

### 10. Claude Desktop MCP v2.0 Endpoint Testing (MANDATORY)

Test all 8 new MCP endpoints in realistic scenarios. Use these prompts with Claude Desktop:

#### **Test Scenario 1: Document Discovery & Search**
```
I need to explore this knowledge base and find information about our engineering projects and financial data. Please:

1. Show me the folder structure and what types of documents are available
2. Search for "API" or "technical" content across all documents  
3. Find any budget or financial information from Q4
4. Tell me what endpoints you used for each step

Format as JSON:
{
  "folder_structure": "...",
  "search_results": "...", 
  "financial_data": "...",
  "endpoints_used": ["list_folders", "search", ...]
}
```

#### **Test Scenario 2: Document Deep Dive**
```
I want to analyze our documents in detail. Please:

1. Get the outline/structure of the PowerPoint presentation
2. Extract data from the Excel budget file (show me the sheets and some sample data)
3. Get the first few pages of the PDF documents
4. Tell me the metadata for each document type

Provide detailed results showing what information you can extract from each document type.
```

#### **Test Scenario 3: Specific Data Extraction**
```  
I need specific data extraction. Please:

1. Get specific slides from the PowerPoint (slides 1-3)
2. Extract data from the "Summary" sheet in the Excel file (if it exists)
3. Get pages 1-2 from any PDF documents
4. Search for "agreement" or "contract" terms across all documents

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

### 11. Results Analysis & Validation

For each test scenario, analyze Claude Desktop's responses:

#### **Expected Endpoint Usage**:
- **`list_folders`** / **`list_documents`**: Directory navigation
- **`search`**: Semantic and keyword searching  
- **`get_document_outline`**: Document structure discovery
- **`get_document_data`**: Content and metadata extraction
- **`get_sheet_data`**: Excel/CSV data access
- **`get_slides`**: PowerPoint content extraction  
- **`get_pages`**: PDF page-level access
- **`get_embedding`**: Vector/embedding access
- **`get_status`**: System health monitoring

#### **Validation Checklist**:
- [ ] **Endpoint Coverage**: Did Claude use all 8 endpoint types appropriately?
- [ ] **Data Quality**: Are search results relevant and accurate?
- [ ] **Token Management**: Are responses properly paginated (no token overflow)?
- [ ] **Error Handling**: How does Claude handle missing files or invalid requests?
- [ ] **Performance**: Are responses fast enough for interactive use?
- [ ] **Metadata Richness**: Do responses include helpful context (file types, locations, etc.)?

#### **Success Metrics**:
- [ ] All 8 endpoints successfully called
- [ ] Search results are relevant and well-ranked
- [ ] Document structures properly extracted
- [ ] Excel/PowerPoint/PDF data correctly accessed
- [ ] No token limit issues or pagination problems
- [ ] System status properly reported
- [ ] File watching detects changes in real-time

### 12. Issue Resolution & Enhancement Planning

**Issue Categories**:
1. **Critical**: Endpoints not working, server crashes, no data returned
2. **Performance**: Slow responses, memory issues, indexing delays  
3. **Usability**: Confusing responses, missing metadata, poor search relevance
4. **Enhancement**: Feature requests, optimization opportunities

**Documentation Process**:
- Document issues in `docs/testing/claude-desktop-test-results-[date].md`
- Include specific error messages, response times, and reproduction steps
- For each issue, specify: endpoint involved, input parameters, expected vs actual behavior
- Prioritize fixes based on impact on user experience

**Next Steps Planning**:
- **If all tests pass**: Plan production deployment and monitoring
- **If minor issues**: Create enhancement backlog
- **If major issues**: Create immediate fix plan with timeline
- **If critical issues**: Rollback to previous version and investigate

## Success Metrics for MCP v2.0 Architecture

### **Endpoint Functionality**:
- [ ] **`search`**: Returns relevant results with proper scoring and metadata
- [ ] **`get_document_outline`**: Extracts document structure (TOC, sheets, slides, pages)
- [ ] **`get_document_data`**: Retrieves content and metadata efficiently
- [ ] **`list_folders`** / **`list_documents`**: Navigates directory structure correctly
- [ ] **`get_sheet_data`**: Accesses Excel/CSV data with proper formatting
- [ ] **`get_slides`**: Extracts PowerPoint content with images and text
- [ ] **`get_pages`**: Retrieves PDF pages with text and metadata
- [ ] **`get_embedding`**: Provides vector search capabilities
- [ ] **`get_status`**: Reports system health and indexing status

### **Performance & Quality**:
- [ ] **Response Time**: All endpoints respond within 2 seconds for typical requests
- [ ] **Token Management**: No response exceeds token limits, pagination works correctly
- [ ] **Search Relevance**: Semantic search returns highly relevant results (>0.8 score for exact matches)
- [ ] **File Watching**: Changes detected and indexed within 30 seconds
- [ ] **Memory Usage**: Server remains stable during extended testing
- [ ] **Error Recovery**: Graceful handling of invalid requests and missing files

### **Integration Quality**:
- [ ] **Claude Desktop**: Successfully connects and uses all endpoints
- [ ] **JSON Responses**: All responses are well-formed and complete
- [ ] **User Experience**: Claude can complete complex multi-step tasks efficiently
- [ ] **Documentation**: Endpoint behavior matches specification

**This test concludes when all 8 endpoints work reliably with Claude Desktop in realistic usage scenarios, demonstrating the effectiveness of the new MCP v2.0 architecture.**

---

## Quick Start Command Reference

```powershell
# Complete test setup
npm run build && npm test
node dist/mcp-server.js

# Create test environment
New-Item -Path "C:\ThinkingHomes\test-folder" -ItemType Directory -Force
# (Add test documents as specified in step 8)

# Monitor server logs
# Watch stderr output for MCP server logs during testing
```

## Troubleshooting

**Common Issues**:
- **Server won't start**: Check for TypeScript errors with `npm run build`
- **Tests failing**: Run `npm test` to identify failing test cases
- **Claude can't connect**: Verify MCP server config in Claude Desktop settings
- **No search results**: Check if indexing completed (wait 30-60 seconds after startup)
- **Slow responses**: Monitor memory usage and consider restarting server

**Debug Commands**:
```powershell
# Check server process
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# View detailed logs
$env:DEBUG="*"
node dist/mcp-server.js
```