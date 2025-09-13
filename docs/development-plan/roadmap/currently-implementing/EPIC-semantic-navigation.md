# EPIC: Semantic Navigation for LLM Agents

**Epic Type**: Core Feature Enhancement  
**Priority**: Critical - Makes the system usable for LLM agents  
**Total Duration**: 7 Sprints (~22-27 hours)  
**Pre-production**: YES - No backwards compatibility needed  
**Principle**: FAIL FAST - No silent failures or empty fallbacks

## 🎯 Epic Vision: LLM-Native Navigation

Transform folder-mcp from a basic file server into an intelligent knowledge navigator that LLMs can explore semantically. Every endpoint returns rich semantic metadata enabling agents to make informed decisions without wasting context.

## Current State (Post Lazy-Load Sprint)

### ✅ What's Working
- **Lazy loading implemented**: Search returns metadata only, not content
- **Batch retrieval ready**: get_chunks_content endpoint functional
- **Type safety fixed**: String chunk IDs, snake_case naming
- **99.17% token reduction**: Achieved in search endpoint
- **Database schema clean**: No dead extraction_params code

### ❌ Critical Gaps
- **No semantic data in navigation**: list_folders, list_documents return empty semantic fields
- **No intelligent previews**: Can't tell what's in a folder without opening it
- **No document summaries**: Can't understand document purpose without reading it
- **No chunk metadata**: Can't identify relevant sections without fetching content
- **Python embeddings broken**: MPS tensor errors preventing quality testing

## Success Criteria

### Quality Gates (Must Pass Before Production)
1. **Semantic Accuracy**: Keywords match document content (90%+ precision)
2. **Topic Relevance**: Topics accurately represent folder/document themes
3. **Readability Scores**: Correlate with actual text complexity
4. **Search Relevance**: Top results consistently match query intent
5. **Performance**: All endpoints respond in <200ms

### Curated Model Excellence
Our curated models are specifically chosen for quality extraction:
- **BGE-M3**: Comprehensive multilingual coverage (100+ languages)
- **paraphrase-multilingual-MiniLM-L12-v2**: Fast and resource-friendly
- **multilingual-e5-large**: Strong multilingual performance
- **Arctic Embed 2.0**: Excellent European language support
All models are pre-validated for semantic extraction quality.

### Validation Methodology
- **A2E Testing**: Agent-to-Endpoint validation using MCP tools directly
- **Known Content Tests**: Search for content we know exists
- **Semantic Coherence**: Topics/keywords make logical sense
- **Human Review**: Safety stop after each sprint for quality check

## Sprint Breakdown

### Sprint 1: Perfect list_folders Endpoint (4-5 hours)
**Goal**: Folders show semantic previews of their contents through on-demand aggregation

**Key Innovation: On-Demand Semantic Aggregation**
No caching needed! We compute folder semantics in real-time by aggregating existing document metadata:

```typescript
async listFolders(parentPath: string) {
  const subfolders = await this.getDirectSubfolders(parentPath);
  
  return Promise.all(subfolders.map(async folder => {
    // Fast aggregation query on existing document semantics
    const docs = await db.query(`
      SELECT topics, key_phrases, readability_score
      FROM documents 
      WHERE file_path LIKE ? || '/%'
      AND file_path NOT LIKE ? || '/%/%'  -- Direct children only
    `, [folder.path, folder.path]);
    
    // Simple frequency counting - no "clever" grouping
    const topicFrequency = new Map<string, number>();
    docs.forEach(doc => {
      JSON.parse(doc.topics).forEach(topic => {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      });
    });
    
    // Return top topics by frequency - let LLMs interpret patterns
    const topTopics = Array.from(topicFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, freq]) => topic);
    
    return {
      name: folder.name,
      path: folder.path,
      document_count: docs.length,
      semantic_preview: {
        top_topics: topTopics,  // Raw topics, no artificial grouping
        avg_readability: calculateAverage(docs.map(d => d.readability_score))
      }
    };
  }));
}
```

**Target Response**:
```typescript
{
  name: "policies",
  path: "/folder/policies", 
  document_count: 5,
  semantic_preview: {
    top_topics: ["remote work", "employee benefits", "vacation policy", "code of conduct", "work from home"],
    avg_readability: 0.72
    // No "themes" or "content_types" - let LLMs understand from raw data
  }
}
```

**Why This Works**:
- **Fast**: <15ms for 100 docs (just counting existing data)
- **Fresh**: Always current, no stale cache
- **Honest**: Raw frequency data, no fake "semantic" grouping
- **Simple**: Just SQL aggregation and counting

**Performance Expectations**:
| Folder Size | Response Time | Why It's Fast |
|------------|---------------|---------------|
| 10 docs | ~5ms | Minimal data to aggregate |
| 100 docs | ~15ms | Simple counting operation |
| 1000 docs | ~100ms | Still acceptable, larger dataset |

**Validation**:
- Topics represent actual high-frequency terms from documents
- Aggregation completes in <100ms for typical folders
- No cache invalidation issues
- A2E test: Navigate to folders based on semantic hints

**Human Safety Stop**: Review semantic quality, verify topics match content

---

### Sprint 2: Perfect list_documents Endpoint (3-4 hours)
**Goal**: Documents show purpose and key concepts without reading

**Implementation**:
```typescript
// Current (requires reading to understand)
{
  document_id: "remote_work_policy.md",
  name: "Remote Work Policy",
  size: 4096,
  semantic_summary: null  // ❌ Must read to understand
}

// Target (instantly understandable)
{
  document_id: "remote_work_policy.md",
  name: "Remote Work Policy",
  size: 4096,
  semantic_summary: {
    primary_purpose: "Define remote work eligibility and requirements",
    key_concepts: ["3 days per week", "core hours 9am-5pm", "VPN required"],
    main_topics: ["eligibility criteria", "equipment policy", "communication expectations"],
    target_audience: "all employees",
    document_type: "policy",
    readability_score: 0.68
  }
}
```

**Validation**:
- Key concepts are actual quotes/facts from document
- Purpose accurately summarizes document intent
- Topics cover main sections
- A2E test: Find specific policies without opening documents

**Human Safety Stop**: Verify summaries are accurate and useful

---

### Sprint 3: Perfect get_document_outline Endpoint (3-4 hours)
**Goal**: Understand document structure and locate relevant chunks

**Implementation**:
```typescript
// Current (no way to navigate chunks)
{
  chunks: [
    {
      chunk_id: "chunk_123",
      heading: "Section 1",
      semantics: null  // ❌ No idea what's in this chunk
    }
  ]
}

// Target (semantic chunk navigation)
{
  chunks: [
    {
      chunk_id: "chunk_123",
      heading: "Eligibility Requirements",
      chunk_index: 0,
      semantics: {
        main_points: ["minimum 6 months tenure", "manager approval required"],
        topics: ["eligibility", "approval process"],
        key_phrases: ["performance reviews", "tenure requirements"],
        has_examples: true,
        has_data: false,
        readability_score: 0.71
      }
    }
  ]
}
```

**Validation**:
- Main points extracted from actual chunk content
- Chunks retrievable via get_chunks_content
- Semantic hints guide to relevant sections
- A2E test: Navigate to specific sections using semantic hints

**Human Safety Stop**: Review chunk-level semantic accuracy

---

### Sprint 4: Perfect explore Endpoint (3-4 hours)
**Goal**: Hierarchical semantic exploration with breadcrumbs

**Implementation Using On-Demand Aggregation**:
```typescript
async explore(currentPath: string) {
  // Build breadcrumbs with semantic hints from aggregated data
  const breadcrumbs = await this.buildBreadcrumbs(currentPath);
  
  // Get subfolders with their semantic previews (same as list_folders)
  const subfolders = await Promise.all(
    getDirectSubfolders(currentPath).map(async folder => {
      // Reuse the same aggregation logic from Sprint 1
      const docs = await db.query(`
        SELECT topics FROM documents 
        WHERE file_path LIKE ? || '/%'
        AND file_path NOT LIKE ? || '/%/%'
      `, [folder.path, folder.path]);
      
      const topicFreq = countTopicFrequencies(docs);
      const topTopics = getTopN(topicFreq, 5);
      
      return {
        name: folder.name,
        semantic_preview: {
          topics: topTopics,
          document_count: docs.length
        }
      };
    })
  );
  
  return {
    current_path: currentPath,
    breadcrumbs,  // Each with aggregated semantic hint
    subfolders    // Each with on-demand computed topics
    // Note: "related_folders" removed - requires embeddings comparison
  };
}

// Target response
{
  current_path: "/knowledge-base/policies/hr",
  breadcrumbs: [
    { name: "knowledge-base", semantic_hint: "top topics from aggregation" },
    { name: "policies", semantic_hint: "top topics from aggregation" },
    { name: "hr", semantic_hint: "top topics from aggregation" }
  ],
  subfolders: [
    {
      name: "benefits",
      semantic_preview: {
        topics: ["health insurance", "401k", "PTO", "dental", "vision"],
        document_count: 8
      }
    }
  ]
}
```

**Validation**:
- Breadcrumbs provide context at each level from aggregated topics
- Subfolders show semantic previews using same aggregation as Sprint 1
- Performance <100ms for typical hierarchies
- A2E test: Navigate using semantic breadcrumbs

**Human Safety Stop**: Validate navigation intelligence

---

### Sprint 5: Fix and Perfect search Endpoint (4-5 hours)
**Goal**: Intelligent search with semantic ranking and explanations

**Implementation**:
```typescript
// Target (explainable search)
{
  results: [
    {
      chunk_id: "chunk_456",
      relevance_score: 0.92,
      file_path: "/policies/remote_work.md",
      semantic_context: {
        why_relevant: "Exact match on 'VPN requirements' in security section",
        matched_concepts: ["VPN", "security", "remote access"],
        surrounding_topics: ["authentication", "network security"],
        importance: "critical policy requirement"
      }
    }
  ],
  search_insights: {
    query_interpretation: "Looking for VPN setup requirements",
    expanded_terms: ["virtual private network", "remote access"],
    filtered_noise: ["general IT policies"],
    confidence: 0.88
  }
}
```

**Fix Python Embeddings First**:
- Resolve MPS tensor copy error
- Test with multiple embedding models
- Validate embedding quality

**Validation**:
- Search explanations match actual relevance
- Quality models produce accurate results (using our curated models)
- Semantic search outperforms keyword search
- A2E test: Complex queries return relevant results

**Human Safety Stop**: Extensive search quality validation

---

### Sprint 5.5: Filename-Aware Search (2-3 hours)
**Goal**: Enable natural handling of specific file requests vs semantic queries

**The Problem**:
When users say "Q4 2025 budget excel V2", they want THAT specific file, not semantically similar files. Without filename matching:
- "budget_q4_2025_v3.xlsx" might rank higher (newer, similar content)
- "budget_q3_2025_v2.xlsx" might rank higher (same version number)
- The exact file they want ranks 4th or 5th - frustrating!

**Implementation Strategy**:
```typescript
// During indexing - Store filename as special chunk
async indexDocument(filePath: string, content: string) {
  const fileName = path.basename(filePath);
  
  // 1. Create filename "chunk" with special index -1
  const filenameTokens = tokenizeFilename(fileName);
  // "budget_q4_2025_v2.xlsx" → "budget q4 2025 v2 xlsx"
  
  // 2. Generate embedding for filename
  const filenameEmbedding = await this.embeddingService.embed(filenameTokens);
  
  // 3. Store as chunk with index -1 (reuses existing infrastructure!)
  await this.storeChunk({
    documentId: docId,
    chunkIndex: -1,  // Special marker for filename
    content: filenameTokens,
    embedding: filenameEmbedding,
    keyPhrases: extractKeyTerms(filenameTokens),
    topics: ["filename_metadata"]
  });
  
  // 4. Continue with normal content chunking...
}

// During search - Hybrid scoring with filename boost
async search(query: string) {
  const queryEmbedding = await this.embed(query);
  const results = await this.vectorSearch(queryEmbedding);
  
  return results.map(result => {
    if (result.chunkIndex === -1) {
      // This is a filename chunk
      if (result.similarity > 0.9) {
        // Strong filename match - boost significantly
        result.finalScore = 0.4 * (result.similarity * 1.5) + 0.6 * result.contentScore;
        result.matchType = 'filename_exact';
      } else if (result.similarity > 0.7) {
        // Partial filename match
        result.finalScore = 0.3 * result.similarity + 0.7 * result.contentScore;
        result.matchType = 'filename_partial';
      }
    } else {
      // Regular content match
      result.matchType = 'content_only';
    }
    return result;
  });
}
```

**Enhanced Search Response**:
```typescript
{
  results: [
    {
      chunk_id: "chunk_-1_doc_123",  // Filename chunk
      file_path: "/finance/budget_q4_2025_v2.xlsx",
      relevance_score: 0.98,
      semantic_context: {
        why_relevant: "Exact filename match for 'Q4 2025 budget excel V2'",
        match_type: "filename_exact",
        filename_similarity: 0.98,
        content_similarity: 0.73,
        matched_tokens: ["Q4", "2025", "budget", "V2", "excel"]
      }
    },
    {
      chunk_id: "chunk_456",
      file_path: "/finance/budget_q4_2025_v3.xlsx",
      relevance_score: 0.76,
      semantic_context: {
        why_relevant: "Similar filename and content",
        match_type: "filename_partial",
        filename_similarity: 0.82,
        content_similarity: 0.85
      }
    }
  ],
  search_insights: {
    query_interpretation: "Looking for specific file: Q4 2025 budget excel V2",
    search_strategy: "filename_boost_applied",
    exact_match_found: true
  }
}
```

**Why This is Brilliant**:
1. **Reuses existing infrastructure** - Filename embeddings are just chunks with index -1
2. **No schema changes** - Works with current database structure
3. **Unified search** - One vector search finds both filename and content matches
4. **Natural scoring** - High filename similarity automatically surfaces
5. **Explainable results** - LLMs can say "I found the exact file you named"

**Validation**:
- Test: Query "budget Q4 2025 v2" returns "budget_q4_2025_v2.xlsx" as #1
- Test: Query "latest budget" returns files with "latest" or recent dates
- Test: Version markers (v2, final, draft, copy) properly matched
- Test: Pure semantic queries still work without degradation
- A2E test: LLMs can distinguish "found exact file" vs "found similar files"

**Human Safety Stop**: Verify filename search accuracy and user experience

---

### Sprint 6: Integration Testing & Validation (3-4 hours)
**Goal**: Ensure all endpoints work together seamlessly

**Test Scenarios**:
1. **Discovery Flow**: list_folders → list_documents → get_outline → get_chunks
2. **Search Flow**: search → analyze results → get relevant chunks
3. **Filename Search Flow**: Query specific file → get exact match → verify content
4. **Exploration Flow**: explore → navigate breadcrumbs → discover related
5. **Cross-Endpoint**: Search results align with folder/document semantics

**Performance Validation**:
- All endpoints <200ms response time
- Semantic extraction <1s per document
- Batch operations efficient

**Quality Validation**:
- Semantic coherence across endpoints
- No empty/null semantic fields
- Consistent quality metrics

**Final Human Review**: Complete system walkthrough

## Implementation Principles

### FAIL FAST Philosophy
```typescript
// ❌ WRONG - Silent failure
if (!semanticData) {
  return { semantic_preview: null };  // Hide the problem
}

// ✅ RIGHT - Fail fast
if (!semanticData) {
  throw new Error('Semantic extraction failed - fix the root cause');
}
```

### No Backwards Compatibility
- Delete old code completely
- Change APIs freely
- Break things to make them right
- Pre-production = freedom to perfect

### Semantic Quality Standards
1. **Keywords**: Actual important terms from content
2. **Topics**: Meaningful categorization
3. **Summaries**: Accurate and concise
4. **Relationships**: Based on actual similarity
5. **Explanations**: Clear and verifiable

## Testing Strategy

### A2E (Agent-to-Endpoint) Testing
```typescript
// Example A2E Test for list_folders
1. Read: /tests/fixtures/test-knowledge-base/Policies/
2. Call: list_folders(folder_path="/test-knowledge-base")
3. Verify: Policies folder shows ["remote work", "employee benefits"] topics
4. Validate: Topics match actual folder contents
```

### Quality Metrics
- **Precision**: Do extracted keywords appear in documents?
- **Recall**: Are important concepts captured?
- **Coherence**: Do topics make logical sense together?
- **Utility**: Can an LLM navigate using only semantic hints?

## Risk Mitigation

### Technical Risks
1. **Python Embeddings Broken**: Fix MPS compatibility first
2. **Semantic Quality**: Use our curated models (BGE-M3 for best quality, paraphrase-multilingual-MiniLM-L12-v2 for speed)
3. **Performance**: On-demand aggregation fast enough (<100ms) - no caching needed
4. **Storage**: Semantic data adds ~20% to database size

### Quality Risks
1. **Poor Extraction**: Validate with known documents
2. **Irrelevant Topics**: Human review after each sprint
3. **Missing Context**: Ensure comprehensive extraction
4. **Inconsistency**: Standardize extraction methods

## Definition of Done

### Per Sprint
- [ ] All tests pass (unit, integration, A2E)
- [ ] No empty/null semantic fields
- [ ] Response time <200ms
- [ ] Human review completed
- [ ] Documentation updated

### Epic Complete
- [ ] All 6 endpoints semantically enhanced
- [ ] Python embeddings working with quality models
- [ ] Full A2E test suite passing
- [ ] Performance benchmarks met
- [ ] Human validation of semantic quality
- [ ] Zero backwards compatibility debt

## Expected Outcomes

### For LLM Agents
- **75% reduction** in exploratory reads
- **90% accuracy** in finding relevant content
- **Instant understanding** of folder structures
- **Semantic navigation** without content fetching
- **Explainable** search results

### For Users
- **Intelligent** knowledge base
- **Fast** discovery of information
- **Accurate** search results
- **Clear** document organization
- **Trustworthy** semantic metadata

## Next Sprint Start

**Sprint 1: Perfect list_folders Endpoint**

Begin by fixing Python embeddings, then implement semantic extraction for folders. Each folder should tell its story through topics and themes, enabling LLMs to navigate intelligently without opening every document.

---

*This epic represents the transformation from a file server to an intelligent knowledge navigator. Each sprint perfects one endpoint, with human review ensuring quality at every step.*