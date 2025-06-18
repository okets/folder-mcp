# MCP Endpoint Tests Documentation

## Overview

This document explains how the test suite validates the requirements from the MCP Endpoint Redesign PRD. The tests follow Test-Driven Development (TDD) methodology and are organized into several categories.

## Test Structure

### 1. Unit Tests (`tests/unit/interfaces/mcp/endpoints.test.ts`)

**Purpose**: Validate individual endpoint behavior and specifications

**Key Test Categories**:

#### 🔍 Search Endpoint Tests
- **User Story 1**: "Find last month's sales performance and analyze trends"
  - Validates semantic search returns relevant documents
  - Confirms rich metadata in search results (location, context, score)
  - Tests token limit handling and pagination
  
- **User Story 2**: "Find all vendor contracts and check their expiration dates"
  - Validates regex search for contract patterns
  - Tests precise location information in results
  - Confirms search filters work correctly

#### 📄 Document Outline Tests
- **User Story**: "What's in this 100-page report? I need the financial section"
  - Validates PDF outline with bookmarks
  - Tests Excel outline with sheet information  
  - Confirms PowerPoint outline with slide titles
  - Ensures instant response (metadata cached)

#### 📊 Sheet Data Tests
- **User Story**: "Analyze customer churn across sources"
  - Validates Excel data extraction with headers/rows
  - Tests CSV handling (no sheet names)
  - Confirms error handling for invalid sheet names in CSV
  - Tests cell range specification
  - Validates large dataset pagination

#### 🎯 Slides Tests
- **User Story**: "Create investor pitch from board presentations"
  - Tests specific slide extraction by number ranges
  - Validates slide content structure (title, content, notes)
  - Confirms token limit handling with pagination

#### 📄 Pages Tests
- **User Story**: "Review legal sections in partner agreements"
  - Validates page range extraction from PDFs/Word docs
  - Tests single page and all pages extraction
  - Confirms token limit handling and continuation

#### 📁 List Folders/Documents Tests
- **User Story**: "Find all Q4 financial documents by department"
  - Tests folder structure exploration
  - Validates document listing with metadata
  - Confirms pagination for large folders

#### 🧠 Embedding Tests
- **User Story**: Advanced agent custom similarity
  - Validates embedding vector generation
  - Tests vector format and dimensions

#### 🔄 Status Tests
- **User Story**: "Analyze newly added competitive intelligence"
  - Tests overall processing status
  - Validates specific document status
  - Confirms progress reporting

#### 📄 Document Data Tests
- **User Story**: "Research company's remote work policy"
  - Tests raw content extraction
  - Validates chunked content format
  - Confirms metadata-only responses

### 2. Integration Tests (`tests/integration/workflows/mcp-user-stories.test.ts`)

**Purpose**: Validate complete user workflows from start to finish

**Key Workflows**:

#### 📊 Complete Sales Analysis Workflow
1. Search for sales performance data
2. Get document outline to understand structure
3. Extract specific sheet data for analysis
4. Get presentation slides for context
5. Verify all data is business-relevant

#### 📄 Complete Contract Review Workflow
1. Regex search for contract patterns
2. Group results by document
3. Extract relevant pages based on search hits
4. Verify contract terms and dates found

#### 🏢 Complete Document Navigation Workflow
1. Get outline of large report
2. Navigate to financial section using bookmarks
3. Extract section content with pagination
4. Verify financial content found

#### 📈 Complete Investor Pitch Creation Workflow
1. Search for board presentations
2. Get presentation outline
3. Extract key slides for pitch
4. Verify business-relevant content

#### 🔍 Complete Departmental Discovery Workflow
1. Browse folder structure
2. Search within specific departments
3. List documents in target folders
4. Collect and deduplicate results

### 3. Performance Tests (`tests/performance/mcp/endpoints.perf.test.ts`)

**Purpose**: Ensure endpoints meet performance requirements

**Key Performance Requirements**:

#### 🚀 Response Time Requirements
- Search operations: < 2 seconds
- Document outline: < 50ms (cached metadata)
- Page extraction: Linear scaling with content size

#### 📊 Token Limit Handling
- Default 2000 token limit respected
- Always return at least one item (even if over limit)
- Efficient pagination for large datasets

#### 💾 Memory Usage Optimization
- Large document processing: < 50MB memory increase
- Pagination should not accumulate memory
- Concurrent requests should not interfere

#### 🔄 Concurrent Request Handling
- Multiple searches should not interfere
- Mixed endpoint requests handle concurrency
- Performance degrades gracefully with complexity

#### 📈 Scalability Benchmarks
- Performance scales with query complexity
- Token counting is accurate (within 20%)
- Large knowledge base handling

## Test Data Requirements

### Test Knowledge Base Structure
The tests rely on the test knowledge base created in Task 3:

```
tests/fixtures/test-knowledge-base/
├── Finance/
│   ├── 2024/Q1/ - Q1_Budget.xlsx, Q1_Report.pdf
│   ├── 2024/Q4/ - Q4_Forecast.xlsx  
│   └── Reports/ - Annual_Report_2024.pdf
├── Legal/
│   ├── Contracts/ - Acme_Vendor_Agreement.pdf, Supply_Contract_2024.docx
│   └── Policies/ - Remote_Work_Policy.docx
├── Sales/
│   ├── Presentations/ - Q4_Board_Deck.pptx, Product_Demo.pptx
│   └── Data/ - Customer_List.csv, Sales_Pipeline.xlsx
├── Marketing/ - content_calendar.xlsx, brand_guidelines.pdf
├── Engineering/ - README.md, API_Spec.html, config.xml, notes.txt
└── test-edge-cases/ - empty.txt, huge_text.txt, corrupted.xlsx, special_chars_文件名.txt
```

### Test Data Patterns
Files contain specific test patterns:
- **Emails**: john@acme.com, sarah.smith@bigco.com
- **Financial**: "Q1 revenue", "$1,234,567", "quarterly results"
- **Dates**: "March 31, 2024", "expires December 31, 2024"
- **Legal**: "force majeure", "limitation of liability", "indemnification"
- **Remote Work**: "WFH", "remote work", "work from home"

## Validation Strategy

### TDD Methodology
1. **Write Failing Tests First**: All tests are written before implementation
2. **Define Expected Behavior**: Tests specify exact API contracts
3. **Implement to Pass Tests**: Implementation follows test requirements
4. **Refactor with Confidence**: Tests ensure behavior doesn't break

### Coverage Requirements
- **Unit Tests**: 100% endpoint functionality coverage
- **Integration Tests**: All user story workflows covered
- **Performance Tests**: All performance requirements validated
- **Edge Cases**: Unicode files, empty files, corrupted files, large files

### Mock Strategy
- **Development Phase**: Comprehensive mocks for TDD
- **Implementation Phase**: Replace mocks with real implementations
- **Testing Phase**: Mix of mocks and real data for different test types

## Running the Tests

### Individual Test Suites
```powershell
# Unit tests for endpoints
npm test -- tests/unit/interfaces/mcp/endpoints.test.ts

# Integration workflow tests  
npm test -- tests/integration/workflows/mcp-user-stories.test.ts

# Performance tests
npm test -- tests/performance/mcp/endpoints.perf.test.ts
```

### All MCP Tests
```powershell
# Run all MCP-related tests
npm test -- tests/**/*mcp*.test.ts
```

### Test Output Interpretation
- **Failing Tests**: Expected during implementation phase (TDD)
- **Mock Warnings**: Normal during development phase
- **Performance Metrics**: Should meet specified requirements
- **Coverage Reports**: Should show comprehensive test coverage

## Success Criteria

### Task 4 Completion Criteria
- [x] Comprehensive unit tests for all 8 new endpoints
- [x] Integration tests for all 5 major user story workflows  
- [x] Performance tests for scalability and response time requirements
- [x] Edge case tests for error handling and unusual inputs
- [x] Test documentation explaining validation strategy

### Next Steps (Task 5)
- Replace mock implementations with real endpoint implementations
- Update tests to use real MCP server instances
- Validate all tests pass with real implementations
- Performance tune based on test results

## Test Metrics

### Current Status
- **Total Test Cases**: 34 unit tests + 5 integration workflows + 12 performance tests
- **User Stories Covered**: 8 complete workflows  
- **Endpoints Tested**: All 8 new endpoints (search, outline, data, folders, sheets, slides, pages, embedding, status)
- **Performance Requirements**: Response time, memory usage, concurrency, scalability
- **Edge Cases**: Unicode, empty files, corrupted files, large files

### Expected Results
- **Development Phase**: Tests should fail (TDD)
- **Implementation Phase**: Tests should gradually pass as endpoints are implemented
- **Production Phase**: All tests should pass with real performance data
