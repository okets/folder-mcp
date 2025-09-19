# EPIC: Semantic Navigation for LLM Agents

**Epic Type**: Core Feature Enhancement  
**Priority**: Critical - Makes the system usable for LLM agents  
**Total Duration**: 7 Sprints (~22-27 hours)  
**Pre-production**: YES - No backwards compatibility needed  
**Principle**: FAIL FAST - No silent failures or empty fallbacks

## 🎯 Epic Vision: LLM-Native Navigation

Transform folder-mcp from a basic file server into an intelligent knowledge navigator that LLMs can explore semantically. Every endpoint returns rich semantic metadata enabling agents to make informed decisions without wasting context.

## Current State (Post Sprint 0 Document-Level Aggregation Completion)

### ✅ Outstanding Semantic Foundation Achieved
- **Semantic extraction COMPLETE**: KeyBERT, readability, and enhanced topic clustering delivering production-quality results
- **Research-validated techniques**: BERTopic, hybrid readability, and model-specific optimizations working
- **Quality transformation achieved**:
  - Key phrases: >80% multiword phrases (vs previous 11% single words)
  - Topics: >90% domain-specific categories (vs previous 29% generic)
  - Readability: Realistic 40-60 scores (vs previous 3-11 broken scores)
- **Model excellence**: All 5 curated models (BGE-M3, E5-Large, MiniLM, E5-ONNX variants) delivering consistent quality
- **E5 indexing optimizations**: Passage prefixes and L2 normalization implemented
- **Configuration-driven capabilities**: Model-specific optimizations in curated-models.json
- **Performance maintained**: <2x processing time despite major quality improvements

### ✅ Document-Level Aggregation COMPLETE (Sprint 0)
- **Document semantic storage**: Every document has pre-computed `semantic_summary` in database
- **Production-quality aggregation**: 93%+ extraction quality across all 5 curated models
- **Real-time processing**: Document-level aggregation happens automatically during indexing
- **Dual-path enhancement**: Both Python (KeyBERT) and ONNX (clustering) enhancement paths working
- **Quality tracking**: Comprehensive extraction confidence, diversity, and richness metrics stored
- **Fail-loud implementation**: All semantic processing failures tracked and reported

### ✅ Core Infrastructure Ready
- **Lazy loading implemented**: Search returns metadata only, not content
- **Batch retrieval ready**: get_chunks_content endpoint functional
- **Type safety fixed**: String chunk IDs, snake_case naming
- **99.17% token reduction**: Achieved in search endpoint
- **Database schema optimized**: Rich semantic data storage with excellent extraction quality

### 🎯 Navigation Enhancement Opportunities
- **Folder-level aggregation NEEDED**: Combine document semantic summaries into folder-level previews
- **Document-level access READY**: Documents have pre-computed semantic metadata for immediate access
- **Enhanced search**: Search can now use semantic ranking with meaningful keywords/topics from document summaries
- **Hybrid search potential**: Domain-specific term boosting can build on quality semantic base stored in database

## Success Criteria

### Semantic Foundation Quality (ACHIEVED ✅)
**Baseline semantic quality established through completed extraction epic and Sprint 0:**
1. **Semantic Accuracy**: Keywords match document content (>90% precision achieved)
2. **Topic Relevance**: Topics accurately represent folder/document themes (>90% domain-specific)
3. **Readability Scores**: Correlate with actual text complexity (40-60 range achieved)
4. **Multiword Key Phrases**: >80% meaningful phrase extraction (vs previous single words)
5. **Model Consistency**: All 5 curated models delivering consistent quality
6. **Document-Level Aggregation**: COMPLETE - Every document has semantic_summary in database (Sprint 0 ✅)

### Navigation Enhancement Goals (TO BE ACHIEVED)
1. **Folder-Level Aggregation**: list_folders aggregates document semantic summaries into folder previews
2. **Document-Level Access**: list_documents directly accesses Sprint 0's pre-computed semantic data
3. **Hierarchical Navigation**: explore endpoint builds breadcrumbs from document semantic summaries
4. **Enhanced Search**: Search leverages Sprint 0's quality semantic data stored in database
5. **Performance**: All navigation endpoints respond in <200ms using pre-computed semantic data

### Curated Model Excellence (ACHIEVED ✅)
All curated models validated and optimized for production-quality semantic extraction:
- **BGE-M3**: Multi-functionality (dense/sparse/ColBERT) + multilingual coverage ✅
- **paraphrase-multilingual-MiniLM-L12-v2**: Fast processing + quality phrases ✅
- **multilingual-e5-large**: Strong performance + proper prefixes/normalization ✅
- **multilingual-e5-small**: Efficient processing + quality extraction ✅
- **E5-ONNX variants**: CPU optimization with maintained quality ✅

### Validation Methodology
- **A2E Testing**: Agent-to-Endpoint validation using MCP tools directly
- **Quality Content Tests**: Leverage existing high-quality semantic extraction for navigation testing
- **Semantic Enhancement Verification**: Ensure navigation builds meaningfully on quality extraction data
- **Multiword Phrase Validation**: Verify meaningful phrase aggregation vs single-word fallbacks
- **Domain-Specific Topic Testing**: Ensure topics are specific and useful for LLM navigation
- **Realistic Readability Confirmation**: Validate readability scores guide complexity understanding
- **Human Review**: Safety stop after each sprint to verify navigation intelligence improvements

## Aggregation Hierarchy (Post-Sprint 0)

Understanding the three levels of semantic aggregation in folder-mcp:

### Level 1: Chunk → Document Aggregation ✅ COMPLETED (Sprint 0)
**Status**: Production-ready, happens automatically during indexing
**Data Flow**: Raw chunks → document `semantic_summary` field
**Storage**: Database `documents.semantic_summary` (JSON), plus extracted metrics
**Quality**: 93%+ extraction confidence across all 5 curated models

**What was achieved**:
- Every document now has pre-computed semantic metadata stored in database
- Both Python (KeyBERT) and ONNX (clustering) enhancement paths working
- Fail-loud error tracking and quality indicators
- Real-time processing during indexing with minimal performance overhead

### Level 2: Document → Folder Aggregation 🎯 TO BE IMPLEMENTED (Sprint 1)
**Status**: Primary goal of current Epic
**Data Flow**: Multiple document `semantic_summaries` → folder semantic preview
**Processing**: On-demand aggregation when list_folders() is called
**Performance Target**: <100ms for typical folders (5-50 documents)

**Implementation Strategy**:
```sql
-- Query document-level semantics for folder
SELECT semantic_summary, primary_theme, topic_diversity_score
FROM documents
WHERE file_path LIKE '/folder-path/%'
```
Then aggregate the JSON semantic data from multiple documents into folder-level topics and themes.

### Level 3: Folder → Hierarchy Aggregation 🎯 TO BE IMPLEMENTED (Sprint 4)
**Status**: Advanced navigation for explore endpoint
**Data Flow**: Multiple folder semantic previews → hierarchical breadcrumbs
**Processing**: On-demand aggregation for navigation and breadcrumb context

**Key Distinction**:
- **Sprint 0**: Solved the hardest problem (chunk→document aggregation with quality)
- **Sprint 1-4**: Leverage Sprint 0's foundation for navigation intelligence

## Sprint Breakdown

### Sprint 1: Perfect list_folders Endpoint (4-5 hours)
**Goal**: Folders show rich semantic previews by aggregating document-level semantic summaries from Sprint 0

**Key Innovation: Folder-Level Aggregation from Document Semantic Summaries**
Building on Sprint 0's document-level semantic aggregation, we now aggregate document semantic summaries into folder-level previews:

```typescript
async listFolders(parentPath: string) {
  const subfolders = await this.getDirectSubfolders(parentPath);

  return Promise.all(subfolders.map(async folder => {
    // Query document semantic summaries (Sprint 0 data)
    const docs = await db.query(`
      SELECT semantic_summary, primary_theme,
             avg_readability_score, topic_diversity_score,
             phrase_richness_score
      FROM documents
      WHERE file_path LIKE ? || '/%'
      AND file_path NOT LIKE ? || '/%/%'  -- Direct children only
    `, [folder.path, folder.path]);

    // Aggregate from document-level semantic summaries
    const folderTopics = new Map<string, number>();
    const folderPhrases = new Map<string, number>();

    docs.forEach(doc => {
      if (doc.semantic_summary) {
        const semanticData = JSON.parse(doc.semantic_summary);

        // Aggregate topics from document top_topics
        semanticData.top_topics?.forEach(topic => {
          folderTopics.set(topic, (folderTopics.get(topic) || 0) + 1);
        });

        // Aggregate phrases from document top_phrases
        semanticData.top_phrases?.forEach(phrase => {
          folderPhrases.set(phrase, (folderPhrases.get(phrase) || 0) + 1);
        });
      }
    });

    // Get top topics/phrases by frequency across documents
    const topTopics = Array.from(folderTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, freq]) => topic);

    const topPhrases = Array.from(folderPhrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([phrase, freq]) => phrase);

    return {
      name: folder.name,
      path: folder.path,
      document_count: docs.length,
      semantic_preview: {
        top_topics: topTopics,  // Aggregated from document semantic summaries
        key_themes: topPhrases, // Aggregated from document semantic summaries
        avg_readability: calculateAverage(docs.map(d => d.avg_readability_score || 0)),
        avg_topic_diversity: calculateAverage(docs.map(d => d.topic_diversity_score || 0)),
        avg_phrase_richness: calculateAverage(docs.map(d => d.phrase_richness_score || 0))
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
    top_topics: ["remote work eligibility", "employee benefits package", "vacation request procedures", "conduct expectations", "work from home requirements"],
    key_themes: ["hybrid work model", "compliance procedures", "employee resources"],
    avg_readability: 47.2,  // From Sprint 0 document metrics
    avg_topic_diversity: 0.78,  // From Sprint 0 document diversity scores
    avg_phrase_richness: 0.89   // From Sprint 0 phrase richness scores
  }
}
```

**Why This Works Better with Sprint 0 Foundation**:
- **Quality**: Built on Sprint 0's 93%+ extraction confidence and meaningful multiword topics
- **Fast**: <15ms for 100 docs (aggregating pre-computed document semantic summaries)
- **Reliable**: Uses persistent database storage, not on-demand chunk processing
- **Meaningful**: Domain-specific topics from research-validated document aggregation

**Performance Expectations**:
| Folder Size | Response Time | Why It's Fast |
|------------|---------------|---------------|
| 10 docs | ~5ms | Aggregate from 10 pre-computed semantic summaries |
| 100 docs | ~15ms | Parse 100 JSON semantic summaries and count frequencies |
| 1000 docs | ~100ms | Still acceptable, leveraging Sprint 0's database storage |

**Validation**:
- Topics are meaningful multiword phrases from Sprint 0's quality extraction (>80% multiword)
- Domain-specific categories from Sprint 0's 93%+ extraction confidence
- Folder aggregation completes in <100ms by using pre-computed document semantic summaries
- Quality metrics reflect Sprint 0's realistic scoring (readability ~50 for technical docs)
- A2E test: Navigate to folders based on aggregated document semantic previews

**Human Safety Stop**: Verify semantic aggregation produces meaningful folder summaries that help LLM navigation

---

### Sprint 2: Perfect list_documents Endpoint (3-4 hours)
**Goal**: Documents show rich semantic summaries directly from Sprint 0's pre-computed data

**Implementation** (Direct Database Retrieval - No Aggregation Needed):
```typescript
async listDocuments(folderPath: string) {
  // Direct retrieval from Sprint 0's document-level aggregation
  const documents = await db.query(`
    SELECT file_path, semantic_summary, primary_theme,
           avg_readability_score, topic_diversity_score,
           phrase_richness_score, extraction_method,
           extraction_failed, file_size, mime_type
    FROM documents
    WHERE file_path LIKE ? || '/%'
    AND file_path NOT LIKE ? || '/%/%'  -- Direct children only
  `, [folderPath, folderPath]);

  return documents.map(doc => {
    const semanticData = doc.semantic_summary ? JSON.parse(doc.semantic_summary) : null;

    return {
      document_id: path.basename(doc.file_path),
      name: extractDocumentTitle(doc.file_path),
      size: doc.file_size,
      semantic_summary: semanticData ? {
        primary_purpose: doc.primary_theme,  // From Sprint 0
        key_concepts: semanticData.top_phrases?.slice(0, 4) || [],
        main_topics: semanticData.top_topics?.slice(0, 4) || [],
        readability_score: doc.avg_readability_score,  // From Sprint 0
        quality_indicators: {
          extraction_confidence: semanticData.quality?.extraction_confidence || 0,
          phrase_richness: doc.phrase_richness_score || 0,  // From Sprint 0
          topic_diversity: doc.topic_diversity_score || 0,  // From Sprint 0
          extraction_method: doc.extraction_method  // From Sprint 0
        }
      } : null
    };
  });
}

// Target Response (Using Sprint 0 Data):
{
  document_id: "remote_work_policy.md",
  name: "Remote Work Policy",
  size: 4096,
  semantic_summary: {
    primary_purpose: "remote work eligibility and requirements",  // From primary_theme
    key_concepts: ["three days per week minimum", "core business hours", "VPN security requirements", "performance evaluation"],
    main_topics: ["eligibility requirements", "equipment provisioning", "communication protocols", "security compliance"],
    readability_score: 47.2,  // From avg_readability_score
    quality_indicators: {
      extraction_confidence: 0.94,  // From semantic_summary.quality
      phrase_richness: 0.87,        // From phrase_richness_score
      topic_diversity: 0.78,        // From topic_diversity_score
      extraction_method: "python_rich"  // From extraction_method
    }
  }
}
```

**Validation**:
- Key concepts are meaningful multiword phrases from Sprint 0's >80% multiword extraction
- Purpose accurately derived from Sprint 0's primary_theme field
- Topics represent main document sections from Sprint 0's domain-specific extraction (>90%)
- Readability scores are realistic from Sprint 0's hybrid readability system (~50 for technical docs)
- Quality indicators reflect Sprint 0's 93%+ extraction confidence
- Direct database access means <5ms response time per document
- A2E test: Find and understand specific policies using pre-computed semantic summaries

**Human Safety Stop**: Verify document summaries are accurate, meaningful, and help LLM decision-making

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
**Goal**: Hierarchical semantic exploration with breadcrumbs using document semantic summaries

**Implementation Using Document-Level Semantic Aggregation**:
```typescript
async explore(currentPath: string) {
  // Build breadcrumbs with semantic hints from document semantic summaries
  const breadcrumbs = await this.buildBreadcrumbs(currentPath);

  // Get subfolders with their semantic previews (reuse Sprint 1 logic)
  const subfolders = await Promise.all(
    getDirectSubfolders(currentPath).map(async folder => {
      // Query document semantic summaries (Sprint 0 data)
      const docs = await db.query(`
        SELECT semantic_summary, primary_theme FROM documents
        WHERE file_path LIKE ? || '/%'
        AND file_path NOT LIKE ? || '/%/%'
      `, [folder.path, folder.path]);

      // Aggregate topics from document semantic summaries
      const topicFreq = new Map<string, number>();
      docs.forEach(doc => {
        if (doc.semantic_summary) {
          const semanticData = JSON.parse(doc.semantic_summary);
          semanticData.top_topics?.forEach(topic => {
            topicFreq.set(topic, (topicFreq.get(topic) || 0) + 1);
          });
        }
      });

      const topTopics = Array.from(topicFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, freq]) => topic);

      return {
        name: folder.name,
        semantic_preview: {
          topics: topTopics,  // From document semantic summaries
          document_count: docs.length
        }
      };
    })
  );

  return {
    current_path: currentPath,
    breadcrumbs,  // Each with aggregated semantic hint from document summaries
    subfolders    // Each using Sprint 0's document-level semantic data
  };
}

async buildBreadcrumbs(currentPath: string) {
  const pathParts = currentPath.split('/').filter(Boolean);
  const breadcrumbs = [];

  for (let i = 0; i < pathParts.length; i++) {
    const breadcrumbPath = '/' + pathParts.slice(0, i + 1).join('/');

    // Get semantic hint by aggregating document semantic summaries in this path
    const docs = await db.query(`
      SELECT semantic_summary FROM documents
      WHERE file_path LIKE ? || '/%'
    `, [breadcrumbPath]);

    const topicFreq = new Map<string, number>();
    docs.forEach(doc => {
      if (doc.semantic_summary) {
        const semanticData = JSON.parse(doc.semantic_summary);
        semanticData.top_topics?.slice(0, 3).forEach(topic => {
          topicFreq.set(topic, (topicFreq.get(topic) || 0) + 1);
        });
      }
    });

    const topTopics = Array.from(topicFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, freq]) => topic);

    breadcrumbs.push({
      name: pathParts[i],
      path: breadcrumbPath,
      semantic_hint: topTopics.join(', ') || 'documents'
    });
  }

  return breadcrumbs;
}

// Target response (Using Sprint 0 Document Semantic Summaries)
{
  current_path: "/knowledge-base/policies/hr",
  breadcrumbs: [
    { name: "knowledge-base", path: "/knowledge-base", semantic_hint: "documentation, policies, procedures" },
    { name: "policies", path: "/knowledge-base/policies", semantic_hint: "employee guidelines, compliance, procedures" },
    { name: "hr", path: "/knowledge-base/policies/hr", semantic_hint: "benefits, employment, performance" }
  ],
  subfolders: [
    {
      name: "benefits",
      semantic_preview: {
        topics: ["health insurance", "401k", "PTO", "dental coverage", "vision benefits"],  // From document semantic summaries
        document_count: 8
      }
    }
  ]
}
```

**Validation**:
- Breadcrumbs provide context at each level from Sprint 0's document semantic summaries
- Subfolders show semantic previews using Sprint 1's document aggregation logic
- Performance <100ms for typical hierarchies using pre-computed semantic data
- A2E test: Navigate using semantic breadcrumbs derived from document summaries

**Human Safety Stop**: Validate navigation intelligence

---

### Sprint 5: Perfect search Endpoint with Enhanced Semantic Ranking (4-5 hours)
**Goal**: Leverage quality semantic extraction for intelligent search with E5 optimization and meaningful result explanations

**Critical E5 Implementation**:
```typescript
// E5 query optimization (matches Sprint 3 passage prefixes)
async function generateQueryEmbedding(query: string, modelCapabilities: ModelCapabilities) {
    let processedQuery = query;

    // Apply E5 query prefix to match indexing-side passage prefixes
    if (modelCapabilities.requiresPrefix && modelCapabilities.prefixFormat?.query) {
        processedQuery = modelCapabilities.prefixFormat.query.replace('{text}', query);
        // Result: "query: how to use TMOAT for testing"
    }

    const embedding = await embeddingService.generate(processedQuery);

    // Apply L2 normalization to match indexing-side normalization
    if (modelCapabilities.requiresNormalization) {
        return normalizeVector(embedding, modelCapabilities.normalizationType);
    }

    return embedding;
}
```

**Target Search Response**:
```typescript
{
  results: [
    {
      chunk_id: "chunk_456",
      relevance_score: 0.92,
      file_path: "/policies/remote_work.md",
      semantic_context: {
        why_relevant: "Strong E5 similarity match with query optimization",
        matched_concepts: ["VPN", "security", "remote access"],
        optimization_applied: "E5 query prefix + L2 normalization",
        search_strategy: "semantic_optimized"
      }
    }
  ],
  search_insights: {
    query_interpretation: "Looking for VPN setup requirements",
    model_optimization: "E5 query prefix applied",
    confidence: 0.94  // Higher confidence with proper E5 optimization
  }
}
```

**Critical Requirements**:
- **E5 Query Prefixes**: MUST implement "query:" prefix for E5 models
- **L2 Normalization**: Query embeddings need same normalization as passages
- **Consistency Validation**: Ensure search and indexing optimizations match

**Validation**:
- E5 query optimization improves relevance scores significantly
- Search explanations reflect optimization benefits
- A2E test: E5-optimized queries return better results than non-optimized

**Human Safety Stop**: Validate E5 consistency and search quality improvement

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

### Sprint 5.7: Tokenization-Aware Hybrid Search (3-4 hours)
**Goal**: Boost search accuracy for domain-specific terms that don't tokenize well

**The Problem**:
Some terms critical to your domain (like "TMOAT", "BGE-M3", "multilingual-e5-large") get poorly tokenized by language models because they weren't in the training data. This causes semantic search to miss them even when they appear in documents.

**Solution: SQL-Based Keyword Boosting**:
```typescript
async function hybridSearch(query: string, semanticResults: SearchResult[]) {
    // 1. Analyze query for poor-tokenizing terms
    const poorTokenizers = await detectPoorTokenizingTerms(query);
    // Returns: ["TMOAT", "BGE-M3"] for query "How to use TMOAT with BGE-M3 model"

    if (poorTokenizers.length === 0) {
        return semanticResults; // No keyword boosting needed
    }

    // 2. SQL-based exact keyword matching
    const keywordMatches = await db.query(`
        SELECT chunk_id, file_path, content,
               COUNT(*) as keyword_frequency
        FROM chunks
        WHERE ${poorTokenizers.map(term => `content LIKE '%${term}%'`).join(' OR ')}
        GROUP BY chunk_id
        ORDER BY keyword_frequency DESC
    `);

    // 3. Boost semantic results that also have keyword matches
    const boostedResults = semanticResults.map(result => {
        const keywordMatch = keywordMatches.find(km => km.chunk_id === result.chunk_id);
        if (keywordMatch) {
            return {
                ...result,
                relevance_score: result.relevance_score * 1.3, // 30% boost
                search_strategy: 'hybrid_boosted',
                keyword_matches: poorTokenizers.filter(term =>
                    keywordMatch.content.includes(term)
                ),
                boost_applied: true
            };
        }
        return result;
    });

    // 4. Add pure keyword matches that weren't in semantic results
    const pureKeywordResults = keywordMatches
        .filter(km => !semanticResults.some(sr => sr.chunk_id === km.chunk_id))
        .map(km => ({
            chunk_id: km.chunk_id,
            file_path: km.file_path,
            relevance_score: 0.75, // High but not perfect score
            search_strategy: 'keyword_only',
            keyword_matches: poorTokenizers.filter(term => km.content.includes(term)),
            boost_applied: false
        }));

    return [...boostedResults, ...pureKeywordResults]
        .sort((a, b) => b.relevance_score - a.relevance_score);
}

async function detectPoorTokenizingTerms(query: string): Promise<string[]> {
    const terms = query.split(/\s+/);
    const poorTokenizers = [];

    for (const term of terms) {
        // Check if term is likely to tokenize poorly
        if (
            term.length > 3 &&
            (
                /^[A-Z]+(-[A-Z0-9]+)*$/.test(term) ||  // ALL_CAPS or BGE-M3
                /^[a-z]+-[a-z0-9-]+$/.test(term) ||   // kebab-case like multilingual-e5-large
                /^[A-Z][a-z]*[A-Z]/.test(term) ||     // CamelCase
                term.includes('_') ||                  // snake_case
                /^[a-z]+\d+/.test(term)               // alpha-numeric like e5-large
            )
        ) {
            poorTokenizers.push(term);
        }
    }

    return poorTokenizers;
}
```

**Enhanced Search Response with Hybrid Boosting**:
```typescript
{
  results: [
    {
      chunk_id: "chunk_789",
      file_path: "/docs/testing/TMOAT-guide.md",
      relevance_score: 0.89, // Boosted from 0.68 due to exact "TMOAT" match
      semantic_context: {
        why_relevant: "Semantic match + exact keyword boost",
        search_strategy: "hybrid_boosted",
        keyword_matches: ["TMOAT"],
        boost_applied: true,
        original_score: 0.68,
        boost_reason: "Exact match for domain-specific term"
      }
    },
    {
      chunk_id: "chunk_456",
      file_path: "/docs/models/BGE-M3-setup.md",
      relevance_score: 0.75,
      semantic_context: {
        why_relevant: "Keyword-only match for BGE-M3",
        search_strategy: "keyword_only",
        keyword_matches: ["BGE-M3"],
        boost_applied: false,
        boost_reason: "Found via SQL exact match"
      }
    }
  ],
  search_insights: {
    query_interpretation: "Looking for TMOAT testing with BGE-M3 model",
    search_strategy: "hybrid_semantic_plus_keyword_boost",
    poor_tokenizers_detected: ["TMOAT", "BGE-M3"],
    boost_strategy: "SQL exact matching for domain terms"
  }
}
```

**Performance Benefits**:
- **Domain Accuracy**: Find "TMOAT", "BGE-M3", "multilingual-e5-large" reliably
- **Hybrid Intelligence**: Combines semantic understanding with exact matching
- **Fast SQL**: Keyword matching adds <10ms to search time
- **Configurable**: Easy to add new domain-specific terms

**Validation**:
- Test: Query "TMOAT testing approach" finds TMOAT documentation
- Test: Query "BGE-M3 model setup" finds BGE-M3 specific files
- Test: Query "multilingual-e5-large optimization" finds E5 configuration
- Test: Regular semantic queries still work without degradation
- A2E test: Domain-specific searches return authoritative results

**Human Safety Stop**: Verify keyword boosting improves domain-specific search accuracy

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
1. **Aggregation Performance**: On-demand aggregation must stay <100ms for good UX
2. **Semantic Quality**: Continue using our curated models (BGE-M3 for best quality, paraphrase-multilingual-MiniLM-L12-v2 for speed)
3. **Database Load**: Multiple endpoint calls could create DB pressure - monitor query patterns
4. **Storage**: Semantic data adds ~20% to database size

### Quality Risks
1. **Poor Navigation UX**: Validate semantic hints actually help LLMs navigate
2. **Irrelevant Topics**: Human review after each sprint
3. **Missing Context**: Ensure comprehensive semantic aggregation
4. **Inconsistency**: Standardize semantic metadata across endpoints

## Definition of Done

### Per Sprint
- [ ] All tests pass (unit, integration, A2E)
- [ ] No empty/null semantic fields
- [ ] Response time <200ms
- [ ] Human review completed
- [ ] Documentation updated

### Epic Complete
- [ ] All 6 endpoints semantically enhanced using Sprint 0's document semantic summaries
- [ ] E5 query optimization implemented for consistent search quality
- [ ] Hybrid search working for domain-specific terms
- [ ] Full A2E test suite passing using pre-computed semantic data
- [ ] Performance benchmarks met (<200ms using database queries)
- [ ] Human validation of folder-level aggregation quality
- [ ] Zero backwards compatibility debt

## Expected Outcomes

### For LLM Agents
- **75% reduction** in exploratory reads through folder-level semantic previews built from Sprint 0 data
- **95% accuracy** in finding relevant content using Sprint 0's 93%+ extraction confidence
- **Instant understanding** of folder structures via aggregation of Sprint 0's document semantic summaries
- **Intelligent navigation** using Sprint 0's multiword phrases and domain-specific topics
- **Explainable search results** with Sprint 0's quality confidence indicators
- **Semantic coherence** across all navigation endpoints using consistent document semantic data

### For Users
- **Production-quality** knowledge base with Sprint 0's pre-computed semantic metadata
- **Fast discovery** through folder-level aggregation of document semantic summaries
- **Highly accurate** search results leveraging Sprint 0's database-stored semantic data
- **Clear document organization** with Sprint 0's realistic complexity indicators
- **Trustworthy semantic metadata** from Sprint 0's research-validated extraction techniques
- **Consistent experience** across all 5 curated embedding models with stored semantic summaries

## Next Sprint Start

**Sprint 1: Perfect list_folders Endpoint**

Build rich semantic navigation for folders by aggregating Sprint 0's document-level semantic summaries. Each folder now showcases meaningful multiword phrases and domain-specific topics from pre-computed document semantic data - enabling LLMs to navigate intelligently using Sprint 0's high-quality semantic foundation.

---

*This epic represents the transformation from basic file access to intelligent semantic navigation, building on Sprint 0's document-level aggregation foundation. Each sprint enhances navigation endpoints with folder-level aggregation of Sprint 0's meaningful semantic intelligence, supported by >90% domain-specific topics and >80% multiword phrase extraction quality stored in the database.*