# Sprint 1: Perfect list_folders Endpoint

**Epic**: Semantic Navigation for LLM Agents
**Sprint Duration**: 4-5 hours
**Goal**: Folders show semantic previews of their contents through on-demand aggregation

## Sprint Overview

Transform the list_folders endpoint from basic directory listing to intelligent semantic navigation. Enable LLMs to understand folder contents without opening documents by providing meaningful semantic previews computed in real-time.

## Key Innovation: On-Demand Semantic Aggregation

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

## Target Response Structure

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

## Implementation Plan

### Phase 1: Foundation Analysis (30 minutes)

**Objectives:**
- Understand current list_folders implementation
- Verify semantic data availability
- Assess test fixture quality

**Tasks:**
1. Examine current `list_folders` endpoint in MCP interfaces
2. Check documents table schema for semantic fields:
   - `topics` (JSON array)
   - `key_phrases` (JSON array)
   - `readability_score` (float)
3. Verify test fixtures have semantic data populated
4. Review existing database query patterns

**Deliverables:**
- Current implementation assessment
- Database schema validation
- Test data quality report

### Phase 2: Database Layer Implementation (45 minutes)

**Objectives:**
- Create efficient aggregation queries
- Build reusable semantic aggregation service
- Ensure optimal performance

**Tasks:**
1. Create aggregation service class:
   ```typescript
   class SemanticAggregationService {
     async aggregateFolderSemantics(folderPath: string): Promise<SemanticPreview>
     private countTopicFrequencies(documents: Document[]): Map<string, number>
     private calculateAverageReadability(documents: Document[]): number
   }
   ```
2. Implement direct children query with performance monitoring
3. Add topic frequency counting logic
4. Implement readability score averaging
5. Add error handling for missing semantic data

**Deliverables:**
- SemanticAggregationService implementation
- Optimized database queries
- Performance benchmarks

### 🚨 HUMAN SAFETY STOP #1: Validate Semantic Aggregation Logic

**STOP HERE for human validation before proceeding to Phase 3**

**Validation Tasks:**
1. Create test script to demonstrate aggregation results with mock data
2. Show topic frequency counting and readability averaging logic
3. Verify aggregation algorithms work correctly
4. Confirm performance approach meets targets

**Expected Human Review:**
- Does the aggregation logic make sense?
- Are the algorithms correctly implemented?
- Is the performance approach sound?

**Status**: ✅ COMPLETED - Logic validated with mock data

### 🚨 HUMAN SAFETY STOP #2: Validate Real Database Integration

**STOP HERE for human validation after real database integration**

**Validation Tasks:**
1. Connect to actual `.folder-mcp/embeddings.db` database
2. Query real semantic data from chunks table
3. Test aggregation with actual indexed documents
4. Measure performance with real data
5. Validate actual semantic quality

**Expected Human Review:**
- Do real topics from database make logical sense?
- Are actual readability scores reasonable?
- Does real performance meet <100ms target?
- Is the semantic preview quality good enough for LLM navigation?

**Status**: 🛑 **BLOCKED** - Critical semantic data quality issues discovered

**Blocking Issue**: Semantic extraction pipeline produces unusable data:
- Generic topics ("general", "technology") instead of domain-specific terms
- Random key phrases ("cathy", "wesley") instead of meaningful concepts
- Severely miscalibrated readability scores (71% scored as "very difficult")
- No differentiation between folder domains

**Evidence**: See `SEMANTIC-DATA-QUALITY-ISSUES-REPORT.md` for full technical analysis

**Resolution Required**: Fix semantic extraction pipeline before continuing Sprint 1

### Phase 3: Domain Service Integration (60 minutes)

**Objectives:**
- Integrate aggregation with folder service
- Handle edge cases gracefully
- Maintain clean architecture boundaries

**Tasks:**
1. Modify folder domain service to include semantic previews
2. Add semantic preview generation to folder entities
3. Handle edge cases:
   - Empty folders (no documents)
   - Folders with missing semantic data
   - Large folders (performance considerations)
4. Add validation for semantic data quality
5. Implement fail-fast error handling

**Deliverables:**
- Enhanced folder domain service
- Edge case handling
- Semantic data validation

### Phase 4: MCP Endpoint Enhancement (45 minutes)

**Objectives:**
- Update list_folders endpoint with semantic previews
- Maintain API compatibility where possible
- Update response types

**Tasks:**
1. Modify `list_folders` MCP endpoint to include semantic_preview
2. Update TypeScript interfaces for enhanced response
3. Add response validation and schema updates
4. Update MCP tool registration with new response format
5. Ensure backwards compatibility considerations

**Deliverables:**
- Enhanced list_folders endpoint
- Updated TypeScript types
- MCP tool registration updates

### Phase 5: Testing & Validation (90 minutes)

**Objectives:**
- Comprehensive testing of semantic navigation
- Performance validation
- Quality assurance through human review

**Tasks:**
1. **A2E (Agent-to-Endpoint) Testing:**
   - Use MCP tools directly to test folder navigation
   - Validate semantic previews match folder contents
   - Test with various folder sizes and types
2. **Performance Testing:**
   - Benchmark response times for different folder sizes
   - Validate <100ms target for typical folders
   - Test database query performance
3. **Quality Validation:**
   - Manual review of topic accuracy
   - Verify readability scores make sense
   - Check for semantic coherence
4. **Integration Testing:**
   - Test with TUI folder navigation
   - Verify CLI compatibility
   - End-to-end workflow testing

**Deliverables:**
- A2E test results
- Performance benchmarks
- Quality validation report
- Integration test results

## Performance Expectations

| Folder Size | Response Time | Rationale |
|------------|---------------|-----------|
| 10 docs | ~5ms | Minimal data to aggregate |
| 100 docs | ~15ms | Simple counting operation |
| 1000 docs | ~100ms | Still acceptable, larger dataset |

## Success Criteria

### Technical Requirements
- [ ] All tests pass (unit, integration, A2E)
- [ ] Response time <100ms for folders with <1000 documents
- [ ] No empty/null semantic fields in responses
- [ ] Database queries optimized and indexed properly

### Quality Requirements
- [ ] Topics represent actual high-frequency terms from documents
- [ ] Semantic previews help LLMs navigate intelligently
- [ ] Readability scores correlate with actual document complexity
- [ ] No artificial "semantic" grouping - just honest frequency data

### Validation Requirements
- [ ] A2E tests demonstrate semantic navigation capability
- [ ] Human review confirms semantic accuracy
- [ ] Performance benchmarks met
- [ ] Integration with existing components works seamlessly

## Risk Mitigation

### Technical Risks
1. **Database Performance**: Monitor query execution time, add indexes if needed
2. **Memory Usage**: Process results incrementally for large folders
3. **Missing Semantic Data**: Fail fast rather than return empty results

### Quality Risks
1. **Poor Topic Quality**: Implement human review checkpoint
2. **Misleading Previews**: Validate aggregated topics against actual content
3. **Inconsistent Results**: Standardize aggregation methodology

## Testing Strategy

### A2E Testing Scenarios
```typescript
// Test 1: Navigate based on semantic hints
1. Call list_folders("/tests/fixtures/test-knowledge-base")
2. Find "Policies" folder with topics: ["remote work", "employee benefits"]
3. Verify topics match actual policy documents in folder

// Test 2: Performance validation
1. Create folder with 100 test documents
2. Measure list_folders response time
3. Verify <100ms performance target

// Test 3: Quality validation
1. Use known folder with specific document topics
2. Verify aggregated topics match document analysis
3. Confirm readability scores are reasonable
```

## Human Safety Stop

After implementation completion:
- Manual review of semantic preview quality
- Verification that topics accurately represent folder contents
- Confirmation that LLMs can navigate effectively using semantic hints
- Performance validation under realistic conditions

## Next Steps

Upon successful completion of Sprint 1:
- Sprint 2: Perfect list_documents Endpoint
- Continue with document-level semantic summaries
- Build on folder-level intelligence for complete navigation system

---

**Implementation Principle**: FAIL FAST - No silent failures or empty fallbacks. If semantic data is missing or poor quality, fail explicitly rather than hiding the problem.

---

## 📋 HANDOFF NOTE FOR FUTURE AGENT

### Where We Left Off
Sprint 1 is **95% complete** but **BLOCKED** by semantic data quality issues. The semantic aggregation service is fully implemented and working perfectly, but the underlying semantic data from the chunking pipeline is unusable for LLM navigation.

### What Works Perfectly ✅
- **SemanticAggregationService**: Topic frequency counting and readability averaging logic
- **Database integration**: Real SQLite queries with 6ms performance (94ms under target)
- **Architecture**: Clean domain/infrastructure separation with proper interfaces
- **Error handling**: Comprehensive logging and fail-fast error strategies

### The Blocking Issue 🛑
The semantic extraction pipeline produces garbage data:
- **Topics**: Generic categories ("general", "technology") instead of domain-specific terms
- **Key phrases**: Random words ("cathy", "wesley") instead of meaningful concepts
- **Readability**: 71% of content scored as "very difficult" (clearly miscalibrated)
- **No differentiation**: All folders have identical semantic signatures

**Evidence**: See `SEMANTIC-DATA-QUALITY-ISSUES-REPORT.md` for full technical analysis with database samples.

### CRITICAL: Before Resuming This Sprint

**🚨 FIRST TASK: Understand the semantic extraction pipeline**

You MUST investigate and understand:

1. **How topics are extracted**:
   - Which model/algorithm classifies chunks into topics?
   - Why are 58% of chunks classified as "general"?
   - How can we get domain-specific topics like "financial planning" instead of "general"?

2. **How key phrases are extracted**:
   - Which NLP pipeline extracts key phrases from text?
   - Why are random names extracted instead of business concepts?
   - How can we get "budget analysis" instead of "cathy kennedy"?

3. **How readability is calculated**:
   - Which algorithm computes readability_score? (Flesch Reading Ease?)
   - Why do business documents score as "unreadable"?
   - Is the implementation correct or miscalibrated?

4. **Where semantic processing happens**:
   - Find the code that populates `chunks.topics`, `chunks.key_phrases`, `chunks.readability_score`
   - Is it in the chunking pipeline? Post-processing? Python embeddings?
   - Can we fix it or do we need a different approach?

### Investigation Starting Points
- `src/domain/content/` - Content processing and chunking
- `src/infrastructure/embeddings/python/` - Python-based semantic extraction
- Look for semantic processing in chunking pipeline
- Check if semantic extraction happens during indexing vs post-processing

### Revised Sprint Plan After Investigation

Based on what you discover about semantic extraction, you may need to:

**Option A: Fix Existing Pipeline**
- If semantic extraction is fixable, work with responsible team
- Resume Phase 4 (MCP endpoint integration) after fixes

**Option B: Alternative Approach**
- If pipeline is fundamentally broken, consider alternative semantic sources
- Maybe use file names, folder structure, or simpler text analysis
- Adjust Sprint 1 goals to work with available data

**Option C: Defer Semantic Features**
- If semantic data cannot be fixed quickly, focus on basic folder structure
- Plan semantic features for future sprint when data quality is resolved

### Files Ready for Integration (95% Complete)
When ready to resume:
- Service: `src/domain/search/semantic-aggregation.ts`
- Provider: `src/infrastructure/storage/semantic-data-provider.ts`
- Tests: `tmp/test-semantic-aggregation.ts` (mock data ✅), `tmp/test-real-semantic-data.ts` (real data ❌)

### Remaining Work (~1-2 hours)
After semantic issues resolved:
1. Integrate with existing MCP `list_folders` endpoint
2. Update TypeScript interfaces for `semantic_preview` field
3. Add dependency injection setup
4. A2E testing with fixed semantic data
5. Documentation and cleanup

**Remember**: The aggregation service works perfectly. The problem is the input data quality, not our implementation.