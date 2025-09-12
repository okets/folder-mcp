# Sprint 10: Semantic Metadata Enhancement Plan

## 🎯 Sprint Vision: Making folder-mcp the Industry Leader for AI Agent Interfaces

**Core Insight**: AI agents navigate information differently than humans. They need structured semantic signals to make intelligent decisions about what to explore, when to dive deeper, and how to synthesize knowledge efficiently.

**Success Metric**: A blank-context subagent should discover, understand, and navigate our knowledge base with zero friction, rating our interface as "very straightforward" on all key metrics.

---

## 📊 AI Agent Experience Metrics Framework

### Survey Metrics (1-5 Scale: Very Confusing → Very Straightforward)

1. **Discovery Efficiency**: How easily can I find what capabilities are available?
2. **Content Understanding**: How quickly can I grasp what's in a folder/document without reading it?
3. **Navigation Clarity**: How intuitive is it to find specific topics or themes?
4. **Relevance Confidence**: How certain am I that I've found all relevant content?
5. **Cognitive Load**: How much mental effort is required to use the interface?
6. **Information Density**: Is the right amount of information provided at each level?
7. **Semantic Accuracy**: Do the semantic hints accurately represent the actual content?

---

## 🚀 User Stories & Interface Impact

### Epic User Story: The Blank-Context Discovery Journey

**As Claude (blank-context subagent), I need to understand and navigate a completely unknown knowledge base so that I can answer user questions accurately and efficiently.**

**Acceptance Criteria**:
- I can understand folder purposes without listing documents
- I can identify relevant documents without reading them
- I can navigate to specific topics within documents
- I can assess content complexity before processing
- I rate the experience ≥4 on all survey metrics

---

## Phase 1: Folder Intelligence (Day 21 Morning)

### 🎭 User Story 1.1: Instant Folder Understanding
**As Claude**, when I call `list_folders`, **I need to immediately understand what each folder contains** without having to list documents or search, **so that I can make intelligent decisions about where to look for information**.

**Current Pain Point**:
```json
// What I see now (confusing):
{
  "folders": [
    {"id": "folder-mcp", "path": "/Users/hanan/Projects/folder-mcp", "documentCount": 258}
  ]
}
// I have NO IDEA what's in this folder!
```

**Desired Experience**:
```json
// What I need to see (straightforward):
{
  "folders": [{
    "id": "folder-mcp",
    "path": "/Users/hanan/Projects/folder-mcp",
    "documentCount": 258,
    "semanticPreview": {
      "topTopics": ["TypeScript Development", "MCP Protocol", "Database Systems"],
      "dominantThemes": ["software architecture", "API design", "semantic search"],
      "contentComplexity": "Technical/Advanced",
      "languageDistribution": {"English": 100},
      "lastSemanticUpdate": "2024-01-20T10:30:00Z"
    }
  }]
}
```

**Interface Impact**: 
- Eliminates need for exploratory document listing
- Reduces API calls by 60% for folder discovery
- Enables topic-based folder selection

**Technical Requirements**:
- SQL aggregation of chunk-level topics
- Weighted topic ranking by frequency
- Complexity scoring algorithm
- Smart cache invalidation

---

### 🎭 User Story 1.2: Folder Comparison Intelligence
**As Claude**, when working with multiple folders, **I need to understand their semantic relationships** so that **I can identify overlaps, gaps, and the best folder for specific queries**.

**Desired Capability**:
```json
{
  "folders": [
    {
      "id": "engineering-docs",
      "semanticProfile": {
        "uniqueTopics": ["deployment", "CI/CD"],
        "sharedTopics": ["API design", "testing"],
        "complementaryTo": ["sales-docs"],
        "similarityScore": 0.3
      }
    }
  ]
}
```

**Interface Impact**:
- Enables cross-folder intelligence
- Prevents redundant searches
- Guides optimal folder selection

---

## Phase 2: Document Intelligence (Day 21 Afternoon)

### 🎭 User Story 2.1: Document Purpose Discovery
**As Claude**, when I call `list_documents`, **I need to understand each document's purpose and content focus** without reading it, **so that I can select the most relevant documents for deeper analysis**.

**Current Pain Point**:
```json
// What I see now (requires guessing):
{
  "documents": [
    {"name": "Phase-9-Implementation-epic.md", "size": 48976}
  ]
}
// Is this about planning? Coding? Testing? I have to read it to know!
```

**Desired Experience**:
```json
// What I need (instant understanding):
{
  "documents": [{
    "name": "Phase-9-Implementation-epic.md",
    "size": 48976,
    "semanticSummary": {
      "primaryPurpose": "Technical implementation planning",
      "keyPhrases": ["REST API migration", "multi-folder support", "MCP endpoints"],
      "contentType": "technical specification",
      "topics": ["architecture", "testing", "sprint planning"],
      "estimatedReadTime": "12 minutes",
      "complexityLevel": "Advanced",
      "hasCodeExamples": true,
      "hasDiagrams": false
    }
  }]
}
```

**Interface Impact**:
- 80% reduction in unnecessary document reads
- Enables semantic filtering before retrieval
- Supports relevance ranking

**Technical Requirements**:
- Key phrase extraction per document
- Document type classification
- Read time estimation algorithm
- Code/diagram detection

---

### 🎭 User Story 2.2: Semantic Document Filtering
**As Claude**, I need to **filter documents by semantic criteria** (topics, complexity, content type) **so that I can efficiently narrow down to exactly what I need**.

**Desired Capability**:
```typescript
// What I want to do:
list_documents({
  folder_path: "folder-mcp",
  semantic_filter: {
    topics: ["testing", "validation"],
    complexity: "intermediate",
    content_type: "tutorial"
  }
})

// Returns only documents matching ALL criteria
```

**Interface Impact**:
- Eliminates manual filtering loops
- Reduces false positive retrievals
- Enables precise document discovery

---

## Phase 3: Document Navigation Intelligence (Day 22 Morning)

### 🎭 User Story 3.1: Intelligent Document Structure
**As Claude**, when I call `get_document_outline`, **I need semantic hints about each section's content** so that **I can navigate directly to relevant parts without sequential reading**.

**Current Pain Point**:
```json
// What I see now (just structure):
{
  "outline": {
    "sections": [
      {"heading": "Sprint 7", "line": 885},
      {"heading": "Sprint 8", "line": 1091}
    ]
  }
}
// Which sprint talks about testing? I have to read all to find out!
```

**Desired Experience**:
```json
// What I need (semantic navigation):
{
  "outline": {
    "sections": [
      {
        "heading": "Sprint 7: Search Implementation",
        "line": 885,
        "semantics": {
          "topics": ["vector search", "model switching", "performance"],
          "keyPhrases": ["folder-specific search", "semantic isolation"],
          "hasCodeExamples": true,
          "subsectionCount": 5,
          "estimatedReadTime": "3 minutes"
        }
      }
    ]
  }
}
```

**Interface Impact**:
- Enables topic-based section jumping
- Reduces document traversal time by 70%
- Supports intelligent summarization

**Technical Requirements**:
- Section-level semantic extraction
- Hierarchical topic aggregation
- Code block detection
- Read time calculation

---

### 🎭 User Story 3.2: Cross-Reference Intelligence
**As Claude**, I need to **understand relationships between document sections** so that **I can follow logical flows and dependencies efficiently**.

**Desired Capability**:
```json
{
  "outline": {
    "sections": [{
      "heading": "Implementation",
      "semanticLinks": {
        "references": ["Testing Strategy", "Architecture Overview"],
        "referencedBy": ["Validation Criteria", "Sprint Planning"],
        "relatedTopics": {
          "testing": ["Sprint 4", "TMOAT Verification"],
          "architecture": ["System Design", "Phase 1"]
        }
      }
    }]
  }
}
```

**Interface Impact**:
- Enables intelligent document traversal
- Identifies knowledge dependencies
- Supports comprehensive understanding

---

## Phase 4: Search Intelligence Enhancement (Day 22 Afternoon)

### 🎭 User Story 4.1: Semantic Search Context
**As Claude**, when I search, **I need semantic context about why each result matches** so that **I can assess relevance without retrieving documents**.

**Current Experience**:
```json
// What I see now:
{
  "results": [
    {"documentId": "README.md", "relevance": 0.82}
  ]
}
// Why is this relevant? What part matches?
```

**Desired Experience**:
```json
// What I need:
{
  "results": [{
    "documentId": "README.md",
    "relevance": 0.82,
    "semanticMatch": {
      "matchedTopics": ["MCP protocol", "server implementation"],
      "matchedPhrases": ["Model Context Protocol", "folder operations"],
      "contextualRelevance": "High - Core documentation for MCP",
      "sectionMatches": ["Architecture Overview", "MCP Server Implementation"],
      "semanticReason": "Primary documentation for the searched protocol"
    }
  }]
}
```

**Interface Impact**:
- Eliminates false positive retrievals
- Enables confidence in search completeness
- Reduces document retrieval by 50%

---

## Phase 5: Hierarchical Navigation with Two-Endpoint Design (NEW)

### 🎭 User Story 5.1: Discovery-First Subfolder Navigation
**As Claude (AI agent)**, when I encounter a folder with thousands of documents, **I need to discover and explore subfolders with semantic previews** so that **I can navigate hierarchically without prior knowledge of the folder structure**.

**The LLM Problem**: How do I know which subfolder to navigate to if I don't know what subfolders exist?

**Solution**: Discovery-first navigation with two complementary endpoints:

### Two-Endpoint Strategy

#### 1. `explore` Endpoint - Navigation and Discovery
**Purpose**: Navigate folder hierarchy and discover available paths

```typescript
// Explore root folder
explore({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  subfolder_path?: undefined  // Optional: navigate to specific subfolder
})

// Response: Always shows available paths + documents at current level
{
  "current_path": "/",
  "available_subfolders": [
    {
      "name": "src", 
      "relative_path": "/src",
      "document_count": 89,
      "semanticPreview": {
        "topTopics": ["domain logic", "infrastructure", "interfaces"],
        "avgReadability": 65.2,
        "purpose": "TypeScript application code"
      }
    },
    {
      "name": "docs",
      "relative_path": "/docs", 
      "document_count": 34,
      "semanticPreview": {
        "topTopics": ["development plans", "architecture", "user guides"],
        "avgReadability": 78.4,
        "purpose": "Project documentation"
      }
    }
  ],
  "documents_at_level": [] // Only files directly at this level (not paginated)
}
```

#### 2. `list_documents` Endpoint - Document Retrieval
**Purpose**: Paginated document listing within a specific folder/subfolder

```typescript
// List documents in specific subfolder with pagination
list_documents({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  subfolder_path?: "/src/domain", // Optional: specific subfolder
  limit: 20,
  continuation_token?: "eyJ..." // Standard pagination
})

// Response: Paginated documents with semantic metadata
{
  "documents": [
    {
      "document_id": "error-handler.ts",
      "name": "error-handler.ts",
      "semanticData": {
        "keyPhrases": ["error handling patterns", "domain validation"],
        "topics": ["Error Management", "Domain Logic"],
        "avgReadability": 68.2
      }
    }
  ],
  "location_context": {
    "current_subfolder": "/src/domain",
    "purpose": "Business logic and domain models",
    "document_count_at_level": 23
  },
  "continuation": {
    "has_more": true,
    "token": "eyJ..."
  }
}
```

### LLM Navigation Patterns

**For Exploration/Browsing**:
1. `explore(folder_path)` → See all available subfolders with semantic previews
2. `explore(folder_path, subfolder_path)` → Navigate to specific subfolder
3. `list_documents(folder_path, subfolder_path)` → Get documents within that subfolder

**For Specific Search**:
1. `search(query, folder_path, scope?)` → Direct semantic search (existing endpoint)
2. Use search first when looking for specific content like "Q4 financial results"

### Implementation Strategy: Runtime Path Parsing + Schema Cleanup

**Key Architecture Decision**: Extract subfolder information from existing `file_path` column using runtime SQL queries, while cleaning up unused schema elements.

**Database Schema Changes** (Pre-production - No Backward Compatibility):
```sql
-- Remove unused caching table (was never properly utilized)
DROP TABLE IF EXISTS folder_semantic_summary;

-- Clean up any related indexes
DROP INDEX IF EXISTS idx_folder_summary_updated;
```

**Pre-Production Advantage**: Since we're pre-production, we can make breaking changes that improve the architecture without maintaining backward compatibility. We prioritize doing what's right over preserving legacy patterns.

**Runtime Aggregation Example**:
```sql
-- Extract subfolders and their semantic data
WITH path_analysis AS (
    SELECT 
        CASE 
            WHEN file_path LIKE '/Users/hanan/Projects/folder-mcp/%' 
            THEN SUBSTR(file_path, 35) -- Remove base folder path
            ELSE file_path 
        END as relative_path,
        d.id, d.file_path
    FROM documents d
    WHERE d.file_path LIKE '/Users/hanan/Projects/folder-mcp/%'
),
subfolder_extraction AS (
    SELECT 
        CASE 
            WHEN relative_path LIKE '%/%' 
            THEN '/' || SUBSTR(relative_path, 1, INSTR(relative_path, '/') - 1)
            ELSE '/'  -- Root level
        END as subfolder_path,
        COUNT(*) as document_count,
        id, file_path
    FROM path_analysis
    GROUP BY subfolder_path
)
SELECT 
    subfolder_path,
    document_count,
    json_group_array(
        json_object(
            'topic', json_extract(c.topics, '$[0]'),
            'readability', c.readability_score
        )
    ) as semantic_data
FROM subfolder_extraction sf
JOIN chunks c ON sf.id = (SELECT id FROM documents WHERE file_path = sf.file_path)
WHERE c.semantic_processed = 1
GROUP BY subfolder_path;
```

### Endpoint Parameter Standardization

**CRITICAL**: All endpoints must use consistent parameter naming:

```typescript
// OLD (inconsistent):
interface SearchRequest {
  folder: string;  // WRONG
}

// NEW (consistent):
interface SearchRequest {
  folder_path: string;        // Main folder path
  subfolder_path?: string;    // Optional subfolder navigation  
}

interface ExploreRequest {
  folder_path: string;        // Main folder path
  subfolder_path?: string;    // Optional subfolder navigation
}

interface ListDocumentsRequest {
  folder_path: string;        // Main folder path  
  subfolder_path?: string;    // Optional subfolder scope
  limit?: number;             // Pagination
  continuation_token?: string; // Pagination
}
```

### Interface Benefits for LLMs

- **Discovery-First**: Always see available paths before navigating
- **Zero Prior Knowledge**: Don't need to guess subfolder names
- **Semantic Guidance**: Understand subfolder purpose before diving in  
- **Consistent Navigation**: Same pattern works for any folder depth
- **Runtime Efficiency**: No schema changes, pure SQL aggregation
- **95% Cognitive Load Reduction**: Navigate 10-20 subfolders instead of 1000+ files

### Performance Expectations

- **explore endpoint**: ~150ms (runtime aggregation of subfolder metadata)
- **list_documents**: ~100ms (direct document query with pagination)
- **search with subfolder scope**: ~50% faster (reduced search space)

---

## 📋 Grand Finale: Blank-Context Subagent Test

### Test Scenario: Knowledge Discovery Mission

**Setup**:
```typescript
// Deploy subagent with ZERO prior knowledge
const subagent = new ClaudeSubagent({
  context: "blank",
  mission: "Understand the folder-mcp project architecture and testing strategy"
});
```

**Expected Journey**:

1. **Folder Discovery**:
   - Calls `list_folders`
   - Immediately sees "TypeScript Development", "MCP Protocol"
   - Understands this is a technical project without listing files

2. **Document Discovery**:
   - Calls `list_documents` with semantic filter for "architecture"
   - Finds relevant documents via key phrases
   - Selects 2-3 most relevant without reading all

3. **Targeted Navigation**:
   - Gets outline with semantic sections
   - Jumps directly to "Architecture Overview"
   - Finds "Testing Strategy" via semantic hints

4. **Validation Search**:
   - Searches for "agent testing"
   - Gets semantic context explaining matches
   - Confirms found all relevant content

### Survey Response Template

```markdown
## Interface Experience Survey

**Discovery Efficiency**: [1-5]
- How easily could you find available capabilities?
- Comment: [Specific feedback]

**Content Understanding**: [1-5]  
- How quickly could you grasp folder/document contents?
- Comment: [Specific feedback]

**Navigation Clarity**: [1-5]
- How intuitive was finding specific topics?
- Comment: [Specific feedback]

**Relevance Confidence**: [1-5]
- How certain were you of finding all relevant content?
- Comment: [Specific feedback]

**Cognitive Load**: [1-5]
- How much mental effort was required?
- Comment: [Specific feedback]

**Information Density**: [1-5]
- Was the right amount of information provided?
- Comment: [Specific feedback]

**Semantic Accuracy**: [1-5]
- Did semantic hints match actual content?
- Comment: [Specific feedback]

**Overall Experience**: [Very Confusing | Confusing | Neutral | Straightforward | Very Straightforward]

**Breakthrough Features**:
- What made the biggest positive difference?

**Improvement Suggestions**:
- What would make this even better for AI agents?
```

---

## 🏆 Industry Leadership Differentiators

### Why This Makes Us Leaders

1. **Agent-First Design**: Built for how AI actually processes information
2. **Semantic Layering**: Progressive detail disclosure (folder → document → section)
3. **Zero-Read Discovery**: Understand everything without reading anything
4. **Confidence Signals**: Know when you've found everything relevant
5. **Cognitive Efficiency**: Minimal mental overhead for maximum understanding

### Competitive Advantages

| Feature | Traditional MCP | Our Semantic MCP | Agent Benefit |
|---------|----------------|------------------|---------------|
| Folder Discovery | Name + count | Topics + themes + complexity | Instant understanding |
| Document Lists | Name + size | Purpose + key phrases + type | Targeted selection |
| **Subfolder Discovery** | **Flat file lists** | **Discovery-first exploration with previews** | **95% cognitive load reduction** |
| Outlines | Structure only | Semantic sections + relationships | Direct navigation |
| Search Results | Score only | Contextual reasons + section matches | Relevance confidence |
| **Navigation Strategy** | **Guess subfolder names** | **Discover available paths first** | **Zero prior knowledge required** |
| **Search Scoping** | **Full folder only** | **Subfolder-specific search** | **50% faster targeted results** |

### Success Metrics

**Quantitative**:
- 70% reduction in unnecessary document retrievals
- 80% reduction in exploration API calls  
- 90% success rate in finding relevant content first try
- <2 seconds to understand folder purpose
- <5 seconds to identify relevant documents

**Qualitative**:
- Subagent rates experience ≥4/5 on all metrics
- "Very Straightforward" overall rating
- Zero confusion points in discovery journey
- Positive breakthrough feature identification

---

## 📅 Implementation Priority Matrix

### High Priority (Must Have)
1. Folder semantic previews (topics, themes)
2. Document key phrases and purpose
3. Section-level semantic hints
4. Search result context

### Medium Priority (Should Have)
1. Semantic filtering for documents
2. Cross-reference intelligence
3. Complexity scoring
4. Read time estimates

### Low Priority (Nice to Have)
1. Language distribution
2. Diagram/code detection
3. Similarity scores between folders
4. Related topic suggestions

---

## 🧪 User Story: Document Deletion and Semantic Metadata Integrity

### 🎭 User Story 5.1: Semantic Cleanup on Document Removal
**As a user**, when I remove a document from a folder, **I need the system to automatically clean up all related semantic metadata** so that **outdated keywords and topics don't pollute future searches and folder summaries**.

**Scenario Setup**:
```typescript
// Initial state: Folder contains technical documents
// - README.md with topics: ["MCP Protocol", "TypeScript Development"] 
// - API_GUIDE.md with topics: ["REST API", "Authentication", "Rate Limiting"]
// - Folder summary shows: topTopics: ["MCP Protocol", "TypeScript Development", "REST API"]

// Action: User deletes API_GUIDE.md from folder
fs.unlinkSync('/path/to/folder/API_GUIDE.md');

// Expected system behavior:
// 1. File watcher detects deletion
// 2. System removes all chunks related to API_GUIDE.md
// 3. System recalculates folder semantic summary
// 4. Topics "REST API", "Authentication", "Rate Limiting" removed from folder summary
// 5. Only README.md topics remain: ["MCP Protocol", "TypeScript Development"]
```

**Acceptance Criteria**:

1. **Document Chunks Removal**:
   ```sql
   -- BEFORE deletion: chunks exist for API_GUIDE.md
   SELECT COUNT(*) FROM chunks WHERE document_id = (
     SELECT id FROM documents WHERE file_path LIKE '%API_GUIDE.md'
   ); 
   -- Result: 15 chunks
   
   -- AFTER deletion: no chunks remain
   SELECT COUNT(*) FROM chunks WHERE document_id = (
     SELECT id FROM documents WHERE file_path LIKE '%API_GUIDE.md'
   );
   -- Result: 0 chunks
   ```

2. **Document Record Cleanup**:
   ```sql
   -- Document record completely removed
   SELECT COUNT(*) FROM documents WHERE file_path LIKE '%API_GUIDE.md';
   -- Result: 0 documents
   ```

3. **Semantic Metadata Recalculation**:
   ```sql
   -- Folder summary updated to exclude deleted document's topics
   SELECT top_topics FROM folder_semantic_summary 
   WHERE folder_path = '/path/to/folder';
   -- BEFORE: ["MCP Protocol", "TypeScript Development", "REST API", "Authentication"]
   -- AFTER: ["MCP Protocol", "TypeScript Development"]
   ```

4. **Search Result Cleanup**:
   ```json
   // Search for deleted content returns no results
   search({
     query: "REST API authentication rate limiting",
     folder_path: "/path/to/folder"
   })
   // Result: No matches from API_GUIDE.md, only relevant matches from remaining docs
   ```

5. **Folder Semantic Preview Updates**:
   ```json
   // list_folders shows updated semantic preview
   {
     "folders": [{
       "path": "/path/to/folder",
       "semanticPreview": {
         "topTopics": ["MCP Protocol", "TypeScript Development"], // No "REST API"
         "totalDocuments": 1, // Decreased from 2
         "semanticCoverage": 100 // Recalculated for remaining document
       }
     }]
   }
   ```

6. **Document List Consistency**:
   ```json
   // list_documents no longer includes deleted file
   {
     "documents": [
       // Only README.md remains, API_GUIDE.md completely absent
       {
         "name": "README.md",
         "semanticSummary": {
           "topics": ["MCP Protocol", "TypeScript Development"]
           // No contamination from deleted file's topics
         }
       }
     ]
   }
   ```

**Performance Requirements**:
- **Detection Latency**: File deletion detected within 2 seconds via file watcher
- **Cleanup Completion**: All database cleanup completed within 5 seconds
- **Summary Recalculation**: Folder semantic summary updated within 10 seconds
- **Search Consistency**: Search results immediately exclude deleted content

**Error Handling Requirements**:
- **Partial Cleanup Recovery**: If cleanup fails partially, system completes on next folder access
- **Concurrent Access Safety**: Deletion doesn't break ongoing searches or indexing
- **Rollback Protection**: Failed cleanup doesn't corrupt remaining semantic data

**Edge Cases Covered**:
1. **Large Document Deletion**: Document with 500+ chunks cleans up completely
2. **Concurrent Deletion**: Multiple files deleted simultaneously 
3. **Last Document Removal**: Folder semantic summary shows empty state correctly
4. **Deletion During Indexing**: System handles deletion while processing is ongoing
5. **Duplicate Topic Cleanup**: Topics shared between documents only removed if no other docs contain them

**Test Implementation Strategy**:
```typescript
describe('Document Deletion Semantic Integrity', () => {
  test('Complete semantic cleanup on document removal', async () => {
    // 1. Add test documents with known semantic data
    // 2. Verify initial folder summary includes all topics
    // 3. Delete one document via filesystem
    // 4. Wait for file watcher trigger
    // 5. Query database to verify complete cleanup
    // 6. Test MCP endpoints show updated semantic data
    // 7. Verify search no longer returns deleted content
  });
});
```

**Interface Impact**:
- **Consistency**: AI agents never see stale semantic data from deleted files
- **Trust**: Reliable semantic summaries that accurately reflect current folder state  
- **Performance**: No degradation from orphaned metadata accumulation
- **Discovery**: Accurate topic-based navigation without false positives

---

## 🔬 Technical Architecture (Based on Research)

### Discovered Architecture

**ContentProcessingService Status**: ✅ EXISTS but COMPLETELY ORPHANED
- Location: `/src/domain/content/processing.ts`
- Never imported or used anywhere in codebase
- Contains all needed semantic extraction methods

### Integration Points Identified
1. **Primary**: `src/application/indexing/orchestrator.ts` after `chunkingService.chunkText()`
2. **Alternative**: `src/application/indexing/pipeline.ts` in `chunkingStage()` method
3. **Database**: SQLite schema in `/src/infrastructure/embeddings/sqlite-vec/schema.ts`

### Data Flow (Updated)
```
File Parsing → Chunking → SEMANTIC EXTRACTION (NEW) → Embeddings → Database
                              ↓
                    ContentProcessingService.enhanceContent()
                              ↓
                    Store semantic metadata with chunks
                              ↓
                    SQL Aggregation for folder summaries
                              ↓
                    MCP Endpoints return enriched data
```

### Database Schema Extensions

**Chunks Table Additions**:
```sql
ALTER TABLE chunks ADD COLUMN key_phrases TEXT;        -- JSON array
ALTER TABLE chunks ADD COLUMN topics TEXT;             -- JSON array  
ALTER TABLE chunks ADD COLUMN readability_score REAL;  -- 0-100
ALTER TABLE chunks ADD COLUMN semantic_processed INTEGER DEFAULT 0;
ALTER TABLE chunks ADD COLUMN semantic_timestamp INTEGER;
```

**New Folder Summary Table**:
```sql
CREATE TABLE folder_semantic_summary (
    folder_path TEXT PRIMARY KEY,
    top_topics TEXT,           -- JSON: [{topic, count}]
    top_key_phrases TEXT,       -- JSON: [{phrase, frequency}]
    avg_readability_score REAL,
    total_documents INTEGER,
    total_chunks INTEGER,
    last_updated INTEGER,
    calculation_version INTEGER DEFAULT 1
);
```

### Performance Targets (Refined)
- Semantic extraction: <100ms per chunk
- Indexing overhead: <15% increase
- Folder aggregation: <1s for 1000 documents
- Storage increase: ~20% per chunk
- MCP response: <200ms with semantic data

### Resilience Strategy
- Try-catch around semantic extraction
- Continue indexing if extraction fails
- Mark chunks with semantic_processed flag
- Folder summaries exclude failed chunks
- Graceful degradation in MCP responses

---

## 🛑 Human Safety Stops

### Safety Stop Structure
Each stop includes:
1. **What Was Changed** - Detailed explanation of modifications
2. **Testing Performed** - Actual commands run and results verified
3. **Status Report** - Current state with concrete test evidence  
4. **Human Decision Point** - Continue/Adjust/Rollback options

**CRITICAL**: Every safety stop MUST include actual test results, not assumptions!

### Safety Stop 1: Discovery Complete (30 mins)
**After**: Phase 1 initial analysis
**Testing Required**:
- Verify ContentProcessingService exists and exports expected methods
- Check database schema current state
- Test integration point accessibility
**Report**: 
- ContentProcessingService capabilities discovered
- Integration points identified
- Database schema changes planned
- Risk assessment complete

### Safety Stop 2: Database Ready (1.5 hours)
**After**: Database schema extension
**Testing Required**:
```bash
# Verify schema changes
sqlite3 ~/.folder-mcp/folder-mcp/embeddings.db ".schema chunks"
sqlite3 ~/.folder-mcp/folder-mcp/embeddings.db ".schema folder_semantic_summary"
# Test insert with semantic data
sqlite3 ~/.folder-mcp/folder-mcp/embeddings.db "INSERT INTO chunks ..."
```
**Report**:
- Tables modified with semantic columns
- Migration success/rollback status
- Performance impact measured
- Test queries validated

### Safety Stop 3: Pipeline Connected (3.5 hours)
**After**: ContentProcessingService integration
**Testing Required**:
```bash
# Test indexing with semantic extraction
node dist/src/daemon/index.js --test-index
# Query database for semantic data
sqlite3 ~/.folder-mcp/folder-mcp/embeddings.db "SELECT key_phrases, topics FROM chunks LIMIT 5"
# Test error resilience
node tmp/test-semantic-errors.js
```
**Report**:
- Files modified and line counts
- Semantic extraction test results (with actual database queries)
- Error handling validation (with forced failure tests)
- System health metrics

### Safety Stop 4: First Endpoint Enhanced (4.5 hours)
**After**: First MCP endpoint enhancement
**Testing Required**:
```bash
# Test MCP endpoints directly
mcp__folder-mcp__list_folders
mcp__folder-mcp__list_documents --folder_path "/path"
mcp__folder-mcp__search --query "test" --folder_path "/path"
# Verify semantic data in responses
```
**Report**:
- Endpoint response before/after (actual JSON comparisons)
- Semantic data quality check (key phrases present, topics relevant)
- Backward compatibility status
- Performance metrics (response times)

### Safety Stop 5: Subfolder Implementation Complete (6.5 hours)
**After**: Subfolder support fully implemented
**Testing Required**:
```bash
# Test subfolder navigation
mcp__folder-mcp__list_documents --folder_path "/path" --path "/src"
mcp__folder-mcp__list_documents --folder_path "/path" --include_subfolders true
mcp__folder-mcp__search --query "test" --folder_path "/path" --scope "/src"
# Verify semantic data includes subfolder context
```
**Report**:
- Subfolder navigation working correctly
- Runtime aggregation performance measured
- Database schema updated successfully
- Search scoping functional

### Safety Stop 6: Pre-Subagent Test (8.5 hours)
**After**: All implementations complete including subfolder support
**Testing Required**:
```bash
# Full end-to-end test
# 1. Clear databases
rm -rf ~/.folder-mcp/*/
# 2. Index fresh
folder-mcp --index /test/path
# 3. Test all endpoints
# 4. Verify semantic data throughout
```
**Report**:
- Complete implementation checklist (all tests passing)
- Known issues and workarounds (documented with test cases)
- Performance targets status (measured response times)
- Ready for final validation

### Safety Stop 7: Sprint Complete (9.5 hours)
**After**: Blank-context subagent test with subfolder navigation
**Report**:
- Survey scores and feedback
- Success criteria results
- Final statistics
- Sprint approval decision

---

## 📋 Implementation Phases (Detailed)

### Phase 1: Discovery & Analysis (30 minutes)
- [x] Locate ContentProcessingService 
- [x] Analyze database schema
- [x] Identify integration points
- [x] **SAFETY STOP 1**

### Phase 2: Database Migration (1 hour)
- [ ] Extend chunks table with semantic columns
- [ ] Create folder_semantic_summary table
- [ ] Test migration and rollback scripts
- [ ] **SAFETY STOP 2**

### Phase 3: Pipeline Integration (2 hours)
- [ ] Import ContentProcessingService
- [ ] Wire into indexing orchestrator
- [ ] Implement error resilience
- [ ] Store semantic data with chunks
- [ ] Build folder aggregation queries
- [ ] **SAFETY STOP 3**

### Phase 4: MCP Enhancement (2 hours) ✅ COMPLETED
- [x] Enhance list_folders endpoint - Added semantic previews with topics, readability, document counts
- [x] **SAFETY STOP 4** (after first endpoint) - TypeScript compilation validated
- [x] Enhance list_documents endpoint - Added key phrases and semantic metadata per document
- [x] Enhance get_document_outline endpoint - Added semantic navigation hints with complexity analysis
- [x] Add optional semantic parameters - Enhanced type definitions for backward compatibility
- [x] Fix TypeScript compilation errors - Updated ListFoldersResponse type and parameter annotations

### Phase 5: Subfolder Support with Semantic Navigation (2 hours)
- [ ] Database schema enhancements for subfolder tracking
- [ ] Add subfolder_path and depth columns to documents table  
- [ ] Remove unused folder_semantic_summary table (pure runtime approach)
- [ ] Update indexing pipeline to extract subfolder paths
- [ ] Enhance list_documents endpoint with subfolder navigation
- [ ] Add runtime subfolder semantic aggregation queries
- [ ] Update search endpoint with scope parameter
- [ ] Test subfolder navigation with folder-mcp project structure
- [ ] **SAFETY STOP 5**

### Phase 6: Perfecting Endpoints for LLM Clarity and Efficiency (2 hours)  
**Mission**: Polish and perfect the endpoint system to be maximally intuitive for LLM consumption, eliminating any friction or confusion in the AI agent experience.

**Pre-Production Philosophy**: We make breaking changes freely to achieve the best possible LLM experience. No backward compatibility constraints - we do what's right for the architecture and user experience.

- [ ] **Parameter Consistency Audit** (30 mins)
  - [ ] Update all endpoints to use `folder_path` and `subfolder_path` naming
  - [ ] Ensure consistent response structure patterns across endpoints
  - [ ] Validate that all optional parameters have clear defaults

- [ ] **LLM Experience Testing** (45 mins)
  - [ ] **SAFETY STOP 6**: Complete explore endpoint implementation
  - [ ] Deploy blank-context subagent with ZERO folder-mcp knowledge
  - [ ] Test discovery flow: explore → navigate → list_documents → search
  - [ ] Measure cognitive friction points and response clarity
  - [ ] **SAFETY STOP 7**: Validate all flows work intuitively

- [ ] **Response Optimization** (30 mins)
  - [ ] Optimize semantic preview quality (most useful topics/phrases)
  - [ ] Ensure error messages guide LLMs to correct usage
  - [ ] Add response hints for next logical actions

- [ ] **Documentation for LLMs** (15 mins)
  - [ ] Create endpoint usage examples from LLM perspective
  - [ ] Document decision trees: when to explore vs search vs list
  - [ ] Validate that tool descriptions are LLM-optimized

---

## ✅ Definition of Done

Sprint 10 is complete when:

1. **Blank-context subagent** successfully completes discovery mission using explore → list_documents flow
2. **Survey scores** ≥4/5 on all metrics including discovery-first navigation clarity  
3. **Overall rating** is "Very Straightforward" for hierarchical exploration and document retrieval
4. **Performance targets** met (explore <150ms, list_documents <100ms, scoped search 50% faster)
5. **Parameter consistency** validated (all endpoints use folder_path/subfolder_path naming)
6. **Discovery flow** functional (LLMs can explore subfolders without prior knowledge)
7. **Runtime aggregation** working (no schema changes, pure SQL path parsing)
8. **Endpoint clarity** validated (LLMs understand when to explore vs search vs list)

---

## 🚀 Post-Sprint Vision

This semantic enhancement positions folder-mcp as the industry standard for AI-agent knowledge base interfaces. Future possibilities:

- **Semantic Learning**: System learns from agent interactions
- **Predictive Suggestions**: Anticipate what agents need next
- **Cross-Folder Intelligence**: Understand relationships between knowledge bases
- **Agent Personality Adaptation**: Customize responses for different AI models

**The Ultimate Goal**: Make folder-mcp so intuitive for AI agents that it becomes the preferred interface for all AI-powered knowledge work.