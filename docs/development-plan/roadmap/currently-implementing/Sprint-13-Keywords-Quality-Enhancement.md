# Sprint 13: Keywords Quality Enhancement

## Executive Summary

Current keyword extraction produces fragmented, low-quality keywords due to format-agnostic processing. This sprint enhances extraction by leveraging document structure and metadata that we already parse but discard.

**Expected Impact:** 50-90% improvement in keyword quality across all file types.

## Problem Analysis

### Current Issues Identified

**From ONNX Model Database:**
```
- "**Script Flow" (partial markdown)
- "seconds) **Key Points" (broken phrase with punctuation)
- "(10 seconds) **Key" (incomplete fragment)
- "--- ##" (pure formatting)
```

**From Python GPU Model Database:**
```
- "script flow lecture" (lowercase, generic)
- "reasoning forgetful llm" (word salad)
- "seconds key points" (timing mixed with headers)
```

### Root Causes

1. **Text Preprocessing Gaps**
   - Markdown formatting treated as content
   - No sentence boundary detection
   - Punctuation fragments included

2. **Format-Agnostic Processing**
   - PDF metadata keywords ignored
   - Document headers treated same as body text
   - Excel sheet names and headers discarded

3. **Cosine Similarity Bias**
   - Favors frequently occurring phrases
   - No structural importance weighting
   - Generic terms score higher than specific concepts

## Architecture Analysis

### Current Pipeline Flow

```
File Parser → Chunking → Semantic Extraction → Document Aggregation
     ↓            ↓              ↓                    ↓
Extracts rich   Plain text   Generic n-gram    Simple cosine
metadata but    only         extraction        similarity
discards it
```

### Integration Points

1. **Parser Stage** (`src/domain/files/parser.ts`)
   - Already extracts PDF metadata keywords
   - Already parses Word HTML structure
   - Already extracts Excel sheet names/headers
   - Already processes PowerPoint slide titles

2. **Extraction Stage** (`src/domain/semantic/extraction-service.ts`)
   - Orchestrates keyword extraction
   - Calls N-gram extractor for ONNX models
   - Calls KeyBERT for GPU models

3. **Document Stage** (`src/domain/semantic/document-keyword-scorer.ts`)
   - Aggregates chunk keywords
   - Applies cosine similarity scoring
   - Returns top 30 keywords

## Solution Design

### Phase 1: Enhanced ParsedContent Structure

**Goal:** Capture structural keyword candidates during parsing

**Changes to `src/types/index.ts`:**
```typescript
interface ParsedContent {
  content: string;  // Full text (existing)

  // NEW: Format-specific keyword candidates
  structuredCandidates?: {
    metadata?: string[];      // PDF/Word keywords from metadata
    headers?: string[];       // Document headers (H1-H6, #, ##, ###)
    entities?: string[];      // Named entities (sheets, slides, tables)
    emphasized?: string[];    // Bold/italic text
    captions?: string[];      // Figure/table captions
  };

  // NEW: Content zones with importance weights
  contentZones?: Array<{
    text: string;
    type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
    weight: number;  // 0-1 importance score
  }>;
}
```

### Phase 2: Format-Specific Parser Enhancements

#### 2.1 Markdown Files Enhancement (`parseTextFile`)

**Extract Headers:**
```typescript
private extractMarkdownHeaders(content: string): string[] {
  const headers: string[] = [];
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    headers.push(match[2].trim());
  }
  return headers;
}

private cleanMarkdownContent(content: string): string {
  return content
    .replace(/^#{1,6}\s+/gm, '')        // Remove header markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold formatting
    .replace(/\*([^*]+)\*/g, '$1')      // Remove italic formatting
    .replace(/```[^`]*```/gs, '')       // Remove code blocks
    .replace(/^---+$/gm, '')            // Remove horizontal rules
    .replace(/^\|.+\|$/gm, '')          // Remove table rows
}
```

#### 2.2 PDF Files Enhancement (`parsePdfFile`)

**Use Existing Metadata:**
```typescript
// In PDF metadata extraction (already exists):
const structuredCandidates = {
  metadata: pdfData.Meta?.Keywords ?
    pdfData.Meta.Keywords.split(/[,;]/).map(k => k.trim()) : [],
  headers: extractPDFHeaders(pageTexts), // New function
};
```

#### 2.3 Word Documents Enhancement (`parseWordFile`)

**Parse HTML Structure:**
```typescript
private extractWordHeaders(htmlContent: string): string[] {
  const headers: string[] = [];
  const headerRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;
  while ((match = headerRegex.exec(htmlContent)) !== null) {
    headers.push(match[2].trim());
  }
  return headers;
}

// Use existing metadata keywords:
const metadataKeywords = result.messages
  .filter(m => m.type === 'info' && m.message.includes('keywords'))
  .map(m => m.message.split('keywords:')[1]?.trim())
  .filter(Boolean);
```

#### 2.4 Excel Files Enhancement (`parseExcelFile`)

**Already Extracted - Just Structure It:**
```typescript
const structuredCandidates = {
  entities: workbook.SheetNames, // Sheet names as keywords
  headers: extractColumnHeaders(worksheets), // First row headers
  emphasized: extractFormulaReferences(worksheets) // Cell references
};
```

#### 2.5 PowerPoint Enhancement (`parsePowerPointFile`)

**Extract Slide Structure:**
```typescript
const structuredCandidates = {
  headers: slides.map(slide => slide.title).filter(Boolean),
  entities: extractBulletPoints(slides),
  emphasized: extractSpeakerNotes(slides)
};
```

### Phase 3: Enhanced Semantic Extraction

#### 3.1 Text Preprocessing Service

**New: `src/domain/semantic/text-preprocessor.ts`:**
```typescript
export class TextPreprocessor {
  constructor(private fileType: string) {}

  preprocess(content: string): string {
    switch (this.fileType) {
      case '.md':
        return this.cleanMarkdown(content);
      case '.pdf':
        return this.cleanPDF(content);
      default:
        return this.cleanGeneric(content);
    }
  }

  private cleanMarkdown(content: string): string {
    // Remove markdown syntax while preserving content
  }

  private cleanPDF(content: string): string {
    // Remove PDF artifacts (headers, footers, page numbers)
  }

  private cleanGeneric(content: string): string {
    // Basic cleanup (extra whitespace, special characters)
  }
}
```

#### 3.2 Enhanced N-gram Extraction

**Modify `src/domain/semantic/algorithms/ngram-cosine-extractor.ts`:**
```typescript
export interface EnhancedExtractionOptions extends NGramExtractionOptions {
  structuredCandidates?: {
    metadata?: string[];
    headers?: string[];
    entities?: string[];
    emphasized?: string[];
  };
  contentZones?: Array<{
    text: string;
    type: string;
    weight: number;
  }>;
}

async extractKeyPhrases(
  text: string,
  docEmbedding?: Float32Array,
  options: Partial<EnhancedExtractionOptions> = {}
): Promise<string[]> {
  // 1. Preprocess text based on format
  const preprocessor = new TextPreprocessor(options.fileType || '.txt');
  const cleanText = preprocessor.preprocess(text);

  // 2. Start with high-priority structured candidates
  const priorityCandidates: Array<{text: string, weight: number}> = [];

  if (options.structuredCandidates?.metadata) {
    priorityCandidates.push(...options.structuredCandidates.metadata.map(k =>
      ({text: k, weight: 1.0})
    ));
  }

  if (options.structuredCandidates?.headers) {
    priorityCandidates.push(...options.structuredCandidates.headers.map(h =>
      ({text: h, weight: 0.9})
    ));
  }

  // 3. Extract n-grams from clean text
  const ngrams = extractNGrams(cleanText, opts.ngramRange[0], opts.ngramRange[1]);
  const candidates = filterCandidates(ngrams);

  // 4. Combine priority candidates with n-gram candidates
  const allCandidates = [
    ...priorityCandidates,
    ...candidates.map(c => ({text: c, weight: 0.4}))
  ];

  // 5. Score with weights applied
  return this.scoreWeightedCandidates(allCandidates, docEmbedding, opts);
}
```

### Phase 4: Enhanced Document Keyword Scoring

**Modify `src/domain/semantic/document-keyword-scorer.ts`:**

```typescript
export interface WeightedKeywordCandidate extends DocumentKeywordCandidate {
  sourceType: 'metadata' | 'header' | 'entity' | 'emphasized' | 'ngram';
  sourceWeight: number;
}

export interface EnhancedScoringOptions extends KeywordScoringOptions {
  structuredCandidates?: {
    metadata?: string[];
    headers?: string[];
    entities?: string[];
    emphasized?: string[];
  };
}

scoreAndSelect(
  documentEmbedding: Float32Array,
  options: EnhancedScoringOptions = {}
): KeywordScoringResult {
  // 1. Add structured candidates with high weights
  if (options.structuredCandidates) {
    this.addStructuredCandidates(options.structuredCandidates);
  }

  // 2. Apply weighted scoring
  const weights = {
    metadata: 1.0,           // Author-defined keywords
    header: 0.9,            // Document headers
    entity: 0.8,            // Named entities (sheets, slides)
    emphasized: 0.7,        // Bold/italic text
    ngram: 0.4,            // Regular n-gram extraction
    ...options.weights
  };

  // 3. Calculate weighted final scores
  for (const candidate of this.candidates.values()) {
    const sourceWeight = weights[candidate.sourceType] || 0.4;
    candidate.finalScore =
      sourceWeight * 0.5 +  // Source weight gets 50%
      weights.documentSimilarity * candidate.documentScore * 0.3 +
      weights.chunkAverage * candidate.avgChunkScore * 0.2;
  }

  // 4. Ensure metadata keywords always make the cut
  return this.selectWithMinimumMetadata(options);
}
```

## Implementation Tasks

### Task 1: Enhanced ParsedContent Structure (2 hours)
- [ ] Update `ParsedContent` interface in types
- [ ] Update all parser methods to return structured candidates
- [ ] Add content zone extraction for each file type

### Task 2: Format-Specific Parser Enhancements (6 hours)
- [ ] **Markdown**: Header extraction, content cleaning (1.5 hours)
- [ ] **PDF**: Metadata keyword usage, header detection (1.5 hours)
- [ ] **Word**: HTML structure parsing, metadata extraction (1.5 hours)
- [ ] **Excel**: Column headers, sheet names (1 hour)
- [ ] **PowerPoint**: Slide titles, bullet points (0.5 hours)

### Task 3: Text Preprocessing Service (3 hours)
- [ ] Create `TextPreprocessor` class
- [ ] Implement format-specific cleaning methods
- [ ] Add sentence boundary detection
- [ ] Integrate with extraction service

### Task 4: Enhanced N-gram Extraction (4 hours)
- [ ] Add structured candidate support to `NGramCosineExtractor`
- [ ] Implement weighted candidate scoring
- [ ] Add better filtering for incomplete phrases
- [ ] Test with real document examples

### Task 5: Enhanced Document Keyword Scoring (3 hours)
- [ ] Add weighted scoring to `DocumentKeywordScorer`
- [ ] Implement minimum metadata keyword guarantee
- [ ] Add source type tracking
- [ ] Ensure diversity while preserving quality

### Task 6: Integration & Testing (4 hours)
- [ ] Update `IndexingOrchestrator` to pass structured data
- [ ] Test with all file types in test databases
- [ ] Compare before/after keyword quality
- [ ] Performance impact analysis

## Success Criteria

### Quality Metrics
- [ ] **Metadata Keywords**: 100% of PDF/Word metadata keywords included
- [ ] **Header Recognition**: 90%+ of document headers captured as keywords
- [ ] **Format Cleanup**: Zero markdown syntax in final keywords
- [ ] **Structural Relevance**: Keywords represent document structure, not fragments

### Performance Metrics
- [ ] **Processing Time**: <10% increase in indexing time
- [ ] **Memory Usage**: No significant memory impact
- [ ] **Database Size**: Minimal impact on storage

### Validation Tests
- [ ] **Technical Documents**: Capture API names, method names, technical terms
- [ ] **Business Documents**: Extract policy names, section headers, key concepts
- [ ] **Presentations**: Slide titles and main bullet points as keywords
- [ ] **Spreadsheets**: Sheet names and column headers as domain terminology

## File Changes Required

### Core Files to Modify
1. `src/types/index.ts` - Enhanced ParsedContent interface
2. `src/domain/files/parser.ts` - All parsing methods
3. `src/domain/semantic/extraction-service.ts` - Text preprocessing integration
4. `src/domain/semantic/algorithms/ngram-cosine-extractor.ts` - Structured candidates
5. `src/domain/semantic/document-keyword-scorer.ts` - Weighted scoring
6. `src/application/indexing/orchestrator.ts` - Data flow integration

### New Files to Create
1. `src/domain/semantic/text-preprocessor.ts` - Format-specific cleaning
2. `tests/unit/semantic/text-preprocessor.test.ts` - Preprocessing tests
3. `tests/integration/keyword-quality.test.ts` - End-to-end quality tests

## Risk Assessment

### Technical Risks
- **Format Compatibility**: Ensure changes work across all file types
- **Performance Impact**: Monitor processing time with large documents
- **Edge Cases**: Handle malformed or unusual document structures

### Mitigation Strategies
- **Incremental Rollout**: Implement one format at a time
- **Fallback Logic**: Maintain existing extraction as backup
- **Comprehensive Testing**: Test with diverse real-world documents

## Expected Outcomes

### Immediate Wins (Phase 1-2)
- **50-70% improvement** from metadata keywords and header extraction
- **Elimination** of markdown formatting artifacts
- **Better domain terminology** from structured data

### Full Implementation (All Phases)
- **80-90% improvement** in keyword relevance and quality
- **Document structure representation** in keywords
- **Author intent preservation** through metadata usage
- **Format-aware extraction** that leverages document semantics

### Long-term Benefits
- **Better search relevance** due to higher quality keywords
- **Improved user experience** with more meaningful document discovery
- **Foundation for advanced features** like topic modeling and document clustering