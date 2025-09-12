# Sprint: MVP - Unified Lazy-Load & Optimal Endpoints

**Sprint Type**: MVP Completion - Search & Discovery Optimization  
**Priority**: Critical - Completes the MVP with solid indexing and querying  
**Estimated Duration**: 4-5 hours  
**Breaking Changes**: Yes - But pre-production, so we do what's right  
**Risk Level**: Low - Content field remains, only query behavior changes

## 🎯 Sprint Vision: Complete the MVP

This sprint brings everything together - lazy-loaded content with optimal endpoint design for LLMs. When complete, we have:
- **Solid Indexing**: Already working with semantic metadata
- **Solid Querying**: Lean, efficient, LLM-optimized endpoints
- **Minimal Context Usage**: 75% reduction in LLM token consumption
- **Intuitive Navigation**: Natural ls-style folder exploration

## Problem Statement

Current issues:
1. Search returns full content in `preview` field, wasting context
2. No way to fetch specific chunks on-demand
3. Endpoint naming inconsistent and confusing
4. Folder navigation shows ALL files recursively (overwhelming)
5. Dead coordinate extraction code adds confusion

Solution: Lazy-load content with semantically-rich, lean responses that let LLMs navigate by meaning.

## Part 1: Core Lazy-Loading Implementation (2 hours)

### Phase 1.1: Remove Dead Coordinate Code (30 mins)
**Purpose**: Clean up unused extraction params system

1. **Remove from schema.ts:**
   - Delete `extraction_params TEXT NOT NULL` from CHUNKS_TABLE (line 56)
   - Keep all semantic fields (key_phrases, topics, readability_score)

2. **Delete extraction infrastructure:**
   ```
   /src/domain/extraction/  (entire folder - ~600 lines)
   ```

3. **Simplify chunking services:**
   - Remove coordinate tracking from `pdf-chunking.ts`
   - Remove extraction param generation from all chunking
   - Keep only essential chunking logic

### Phase 1.2: Modify Search Query (30 mins)
**Purpose**: Return semantic metadata instead of content

1. **Update QUERIES.similaritySearch in schema.ts:**
   ```sql
   -- Remove c.content from SELECT
   -- Keep all semantic fields
   SELECT 
       c.id as chunk_id,
       c.chunk_index,
       d.file_path,
       d.mime_type,
       c.start_offset,
       c.end_offset,
       c.token_count,
       c.key_phrases,      -- Keep semantic data
       c.topics,           -- Keep semantic data
       c.readability_score, -- Keep semantic data
       0.5 as distance
   FROM chunks c
   JOIN documents d ON c.document_id = d.id
   ```

2. **Update sqlite-vec-storage.ts search method:**
   ```typescript
   const chunk: TextChunk = {
       content: '',  // Empty placeholder
       startPosition: row.start_offset || 0,
       endPosition: row.end_offset || 0,
       tokenCount: row.token_count || 0,
       // Add semantic metadata
       semanticMetadata: {
           keyPhrases: JSON.parse(row.key_phrases || '[]'),
           topics: JSON.parse(row.topics || '[]'),
           readabilityScore: row.readability_score || 0
       }
   }
   ```

### Phase 1.3: Create Batch Content Retrieval (30 mins)
**Purpose**: Efficient on-demand chunk fetching

1. **Add query to schema.ts:**
   ```sql
   getChunksContent: `
       SELECT 
           c.id as chunk_id,
           c.content,
           c.chunk_index,
           d.file_path,
           c.key_phrases,
           c.topics
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
       WHERE c.id IN (/*PLACEHOLDER*/)
   `
   ```

2. **Add method to sqlite-vec-storage.ts:**
   ```typescript
   async getChunksContent(chunkIds: number[]): Promise<Map<number, ChunkContent>> {
       if (chunkIds.length === 0) return new Map();
       
       const placeholders = chunkIds.map(() => '?').join(',');
       const query = QUERIES.getChunksContent.replace('/*PLACEHOLDER*/', placeholders);
       
       const db = this.dbManager.getDatabase();
       const stmt = db.prepare(query);
       const results = stmt.all(...chunkIds) as any[];
       
       const contentMap = new Map<number, ChunkContent>();
       for (const row of results) {
           contentMap.set(row.chunk_id, {
               content: row.content,
               filePath: row.file_path,
               semanticMetadata: {
                   keyPhrases: JSON.parse(row.key_phrases || '[]'),
                   topics: JSON.parse(row.topics || '[]')
               }
           });
       }
       return contentMap;
   }
   ```

### Phase 1.4: Database Migration (30 mins)
**Purpose**: Remove extraction_params column if it exists

```sql
-- Check and remove extraction_params
PRAGMA table_info(chunks);

-- If exists, migrate:
CREATE TABLE chunks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    token_count INTEGER,
    key_phrases TEXT,
    topics TEXT,
    readability_score REAL,
    semantic_processed INTEGER DEFAULT 0,
    semantic_timestamp INTEGER,
    UNIQUE(document_id, chunk_index)
);

INSERT INTO chunks_new SELECT 
    id, document_id, chunk_index, content, 
    start_offset, end_offset, token_count,
    key_phrases, topics, readability_score,
    semantic_processed, semantic_timestamp
FROM chunks;

DROP TABLE chunks;
ALTER TABLE chunks_new RENAME TO chunks;
```

## Part 2: Optimal MCP Endpoint Design (2 hours)

### Phase 2.1: Update Search Endpoint with Pagination (30 mins)
**Purpose**: Return lean results with semantic context and pagination support

1. **Update SearchResult interface in types.ts:**
   ```typescript
   export interface SearchResult {
       chunk_id: number;           // For retrieval
       relevance_score: number;
       file_path: string;
       semanticContext: {
           matchedTopics: string[];
           keyPhrases: string[];
           readabilityScore: number;
           chunkIndex: number;
       };
       content_available: boolean; // Always true for now
   }
   
   export interface SearchRequest {
       query: string;
       folder_path?: string;
       limit?: number;            // Default: 20
       continuation_token?: string; // For pagination
   }
   
   export interface SearchResponse extends StandardResponse {
       results: SearchResult[];
       continuation: {
           has_more: boolean;
           token?: string;         // Present if has_more is true
       };
   }
   ```

2. **Update search endpoint response:**
   ```typescript
   const searchResult: SearchResult = {
       chunk_id: result.chunkId,
       relevance_score: result.similarity,
       file_path: result.filePath,
       semanticContext: {
           matchedTopics: result.semanticMetadata?.topics || [],
           keyPhrases: result.semanticMetadata?.keyPhrases || [],
           readabilityScore: result.semanticMetadata?.readabilityScore || 0,
           chunkIndex: result.chunkIndex
       },
       content_available: true
   };
   ```

### Phase 2.2: Add get_chunks_content Endpoint (30 mins)
**Purpose**: Batch retrieval of chunk content

```typescript
// Add to IMCPEndpoints interface
getChunksContent(request: GetChunksContentRequest): Promise<GetChunksContentResponse>;

// Request/Response types
export interface GetChunksContentRequest {
    chunk_ids: number[];
}

export interface GetChunksContentResponse extends StandardResponse {
    chunks: Record<number, ChunkContent>;
}

export interface ChunkContent {
    content: string;
    file_path: string;
    semantic_metadata?: {
        keyPhrases: string[];
        topics: string[];
    };
}

// Implementation
async getChunksContent(request: GetChunksContentRequest): Promise<GetChunksContentResponse> {
    const { chunk_ids } = request;
    
    if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
        return {
            chunks: {},
            status: { code: 'error', message: 'chunk_ids must be a non-empty array' }
        };
    }
    
    // Use the storage method we created
    const contentMap = await this.vectorSearchService.getChunksContent(chunk_ids);
    
    // Convert Map to object for JSON response
    const chunks: Record<number, ChunkContent> = {};
    contentMap.forEach((content, id) => {
        chunks[id] = content;
    });
    
    return {
        chunks,
        status: { 
            code: 'success', 
            message: `Retrieved ${contentMap.size} of ${chunk_ids.length} chunks` 
        }
    };
}
```

### Phase 2.3: Update getFolderInfo for ls-style Navigation with Pagination (30 mins)
**Purpose**: Show only direct children with pagination support

```typescript
export interface GetFolderInfoRequest {
    folder_path?: string;
    limit?: number;              // Default: 50 (for documents)
    continuation_token?: string;  // For paginating documents
}

async getFolderInfo(request: GetFolderInfoRequest): Promise<GetFolderInfoResponse> {
    const folderPath = request.folder_path || this.folderPath;
    const limit = request.limit || 50;
    const offset = this.parseContinuationToken(request.continuation_token);
    
    // Get direct subfolders
    const subfolders = await this.getDirectSubfolders(folderPath);
    
    // Get direct files with pagination
    const allDirectFiles = await this.getDirectFiles(folderPath);
    const paginatedFiles = allDirectFiles.slice(offset, offset + limit);
    const hasMore = (offset + limit) < allDirectFiles.length;
    
    return {
        current_path: folderPath,
        subfolders: subfolders.map(sf => ({
            name: sf.name,
            path: sf.path,
            document_count: sf.totalDocs,
            semanticPreview: {
                topTopics: sf.topics,
                avgReadability: sf.readability
            }
        })),
        documents: paginatedFiles.map(file => ({
            document_id: file.id,
            name: file.name,
            size: file.size,
            semanticSummary: {
                primaryPurpose: file.purpose,
                keyPhrases: file.keyPhrases,
                topics: file.topics
            }
        })),
        stats: {
            direct_subfolders: subfolders.length,
            direct_documents: allDirectFiles.length,  // Total count
            total_documents_recursive: await this.getTotalDocCount(folderPath)
        },
        continuation: {
            has_more: hasMore,
            token: hasMore ? this.generateContinuationToken(offset + limit) : undefined
        },
        status: { code: 'success' }
    };
}

// Helper: Get only direct files (no recursion)
private async getDirectFiles(folderPath: string): Promise<any[]> {
    const query = `
        SELECT * FROM documents
        WHERE file_path LIKE ? || '/%'
        AND file_path NOT LIKE ? || '/%/%'
    `;
    return this.db.all(query, folderPath, folderPath);
}
```

### Phase 2.4: Update Document Outline (30 mins)
**Purpose**: Return chunk_ids for targeted retrieval

```typescript
export interface DocumentOutlineResponse {
    chunks: DocumentChunk[];  // Not sections
    document_metadata: DocumentMetadata;
}

export interface DocumentChunk {
    chunk_id: number;          // For retrieval
    heading: string | null;    // May be null
    level: number;             // Nesting level
    semantics: {
        topics: string[];
        keyPhrases: string[];
        readabilityScore: number;
        hasCodeExamples?: boolean;
    };
}

// In getDocumentOutline endpoint
const chunks = await this.getDocumentChunks(documentId);
return {
    chunks: chunks.map(chunk => ({
        chunk_id: chunk.id,
        heading: this.extractHeading(chunk), // Best effort
        level: 1, // Could be enhanced
        semantics: {
            topics: chunk.topics || [],
            keyPhrases: chunk.keyPhrases || [],
            readabilityScore: chunk.readabilityScore || 0
        }
    })),
    document_metadata: await this.getDocumentMetadata(documentId)
};
```

## Part 3: Testing & Validation (1 hour)

### Test Scenarios

1. **Search Flow Test with Pagination:**
   ```typescript
   // Step 1: Search returns first page of lean results
   const page1 = await search({ 
       query: "authentication",
       limit: 10 
   });
   assert(page1.results[0].chunk_id !== undefined);
   assert(page1.results[0].semanticContext !== undefined);
   assert(!page1.results[0].content); // No content field
   assert(page1.continuation.has_more === true);
   
   // Step 2: Get next page if needed
   const page2 = await search({ 
       query: "authentication",
       limit: 10,
       continuation_token: page1.continuation.token
   });
   
   // Step 3: Fetch specific chunks from combined results
   const selectedIds = [...page1.results, ...page2.results]
       .filter(r => r.relevance_score > 0.8)
       .map(r => r.chunk_id)
       .slice(0, 5);
   
   const chunks = await getChunksContent({ 
       chunk_ids: selectedIds 
   });
   assert(chunks[selectedIds[0]].content !== undefined);
   ```

2. **Navigation Flow Test:**
   ```typescript
   // Step 1: Get folder info (ls-style)
   const info = await getFolderInfo({ folder_path: "/project" });
   assert(info.subfolders.length > 0);
   assert(info.documents.length >= 0); // Only direct files
   
   // Step 2: Navigate to subfolder
   const subInfo = await getFolderInfo({ 
       folder_path: "/project/" + info.subfolders[0].name 
   });
   ```

3. **Document Outline Test:**
   ```typescript
   // Get outline with chunk_ids
   const outline = await getDocumentOutline({ document_id: "test.md" });
   assert(outline.chunks[0].chunk_id !== undefined);
   
   // Fetch specific chunk
   const content = await getChunksContent({ 
       chunk_ids: [outline.chunks[0].chunk_id] 
   });
   ```

## Success Criteria

### Must Have ✅
- [ ] Search returns results without content field
- [ ] get_chunks_content retrieves multiple chunks in one call
- [ ] getFolderInfo shows only direct children (ls-style)
- [ ] Document outline includes chunk_ids
- [ ] All semantic metadata preserved in responses
- [ ] Dead coordinate code removed

### Metrics
- **Context Reduction**: 75% less tokens in search results
- **Navigation Efficiency**: Never see more than 20-30 items at once
- **Response Time**: All endpoints < 200ms
- **Code Reduction**: ~1000 lines of dead code removed

## LLM Usage Patterns After Implementation

### Pattern 1: Targeted Search
```typescript
// Total context: ~4,500 chars (vs 15,000 before)
search() → analyze semantics → get_chunks_content(top 3)
```

### Pattern 2: Folder Exploration
```typescript
// Total context: ~5,000 chars (vs 20,000 before)
getFolderInfo() → navigate → search within → get_chunks_content()
```

### Pattern 3: Document Analysis
```typescript
// Total context: ~3,000 chars (vs 10,000 before)
getDocumentOutline() → identify relevant chunks → get_chunks_content(specific)
```

## Timeline

- **Hour 1**: Remove dead code, modify search query
- **Hour 2**: Create batch retrieval, update database
- **Hour 3**: Update MCP endpoints (search, outline, folder info)
- **Hour 4**: Add get_chunks_content endpoint
- **Hour 5**: Testing and validation

## 🎉 MVP Complete!

When this sprint ends, we have:
- **Solid Indexing**: Semantic metadata extraction working
- **Solid Querying**: Lean, efficient endpoints optimized for LLMs
- **Production Ready**: Clean codebase, no dead code
- **LLM-Native**: Designed for how AI agents actually think

The system is ready for real-world usage with excellent performance and minimal context consumption!