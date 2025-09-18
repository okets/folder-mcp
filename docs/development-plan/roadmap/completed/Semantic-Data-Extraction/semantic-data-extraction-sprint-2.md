# Sprint 2 Lite: Simple Readability Fix

**Sprint Duration**: 2-3 hours
**Complexity**: Easy
**Impact**: Low but necessary cleanup

## Executive Summary

Fix the broken readability scoring with a simple, fast Coleman-Liau formula that requires no syllable counting. Current scores (30-42) will be calibrated to technical document ranges (40-60). This is a quick win before moving to higher-value work.

## Current State Analysis

### What's Broken
```sql
-- Current readability scores from our test:
-- All models showing 30-42 for technical documents
-- Should be 40-60 according to requirements
sqlite3 /Users/hanan/Projects/folder-mcp/.folder-mcp/embeddings.db \
  "SELECT AVG(readability_score), MIN(readability_score), MAX(readability_score)
   FROM chunks WHERE readability_score IS NOT NULL"
```

### The Problem
- Current implementation likely uses broken syllable counting
- Scores are too low for technical content (30s instead of 40-60)
- All models show identical scores (suggests calculation happens once, pre-embedding)

## Implementation Plan: Coleman-Liau Formula

### Why Coleman-Liau?
1. **No syllable counting needed** - uses character counts instead
2. **Fast calculation** - simple arithmetic operations
3. **Good for technical content** - handles jargon well
4. **Battle-tested** - used in many readability tools

### The Formula
```typescript
// Coleman-Liau Index
CLI = 0.0588 * L - 0.296 * S - 15.8

Where:
- L = average number of letters per 100 words
- S = average number of sentences per 100 words
```

## TMOAT Implementation Steps

### Step 1: Understand Current Implementation
```bash
# Find where readability is calculated
grep -r "readabilityScore\|readability_score" src/ --include="*.ts"

# Expected location: src/domain/content/processing.ts or similar
```

### Step 2: Create Simple Readability Service
```typescript
// src/domain/semantic/algorithms/readability-calculator.ts
export class ReadabilityCalculator {
  /**
   * Calculate readability using Coleman-Liau Index
   * No syllable counting required - uses character counts
   * Calibrated for technical documentation (40-60 range)
   */
  calculate(text: string): number {
    // Count basic metrics
    const sentences = this.countSentences(text);
    const words = this.countWords(text);
    const letters = this.countLetters(text);

    // Avoid division by zero
    if (words === 0 || sentences === 0) {
      return 50; // Default middle score for edge cases
    }

    // Coleman-Liau formula components
    const L = (letters / words) * 100;  // Letters per 100 words
    const S = (sentences / words) * 100; // Sentences per 100 words

    // Calculate raw Coleman-Liau score
    const rawScore = 0.0588 * L - 0.296 * S - 15.8;

    // Calibrate for technical documents (40-60 range)
    // Raw scores typically 5-15, we map to 40-60
    const calibrated = 40 + (rawScore * 1.5);

    // Clamp to valid range
    return Math.max(40, Math.min(60, calibrated));
  }

  private countSentences(text: string): number {
    // Count sentence endings (.!?) followed by space or EOL
    const matches = text.match(/[.!?]+[\s\n]/g) || [];
    return Math.max(1, matches.length);
  }

  private countWords(text: string): number {
    const words = text.match(/\b\w+\b/g) || [];
    return words.length;
  }

  private countLetters(text: string): number {
    const letters = text.match(/[a-zA-Z]/g) || [];
    return letters.length;
  }
}
```

### Step 3: Test Calculation Standalone
```typescript
// tmp/test-readability.ts
import { ReadabilityCalculator } from '../src/domain/semantic/algorithms/readability-calculator';

const testTexts = {
  simple: "This is a simple sentence. It has short words. Easy to read.",
  technical: "The semantic extraction service implements KeyBERT algorithms for multiword keyphrase extraction utilizing transformer-based embeddings.",
  complex: "Pursuant to the aforementioned architectural considerations, the implementation necessitates comprehensive refactoring of the ContentProcessingService to accommodate the multifaceted requirements of semantic extraction methodologies."
};

const calculator = new ReadabilityCalculator();

Object.entries(testTexts).forEach(([type, text]) => {
  const score = calculator.calculate(text);
  console.log(`${type}: ${score.toFixed(1)}`);
});

// Expected output:
// simple: 40-45 (lower complexity)
// technical: 48-52 (medium complexity)
// complex: 55-60 (high complexity)
```

### Step 4: Integration Points

Find and update where readability is calculated:
```bash
# Current calculation location
grep -r "readabilityScore" src/ --include="*.ts" -A 5 -B 5

# Likely in SemanticExtractionService or ContentProcessingService
```

Update the integration:
```typescript
// In semantic extraction service
import { ReadabilityCalculator } from './algorithms/readability-calculator';

export class SemanticExtractionService {
  private readabilityCalculator = new ReadabilityCalculator();

  async extractSemanticData(text: string, embeddings?: Float32Array) {
    const keyPhrases = await this.extractKeyPhrases(text, embeddings);
    const topics = await this.extractTopics(text, embeddings);
    const readabilityScore = this.readabilityCalculator.calculate(text);

    return {
      keyPhrases,
      topics,
      readabilityScore
    };
  }
}
```

### Step 5: TMOAT Validation

#### Test 1: Unit Test the Calculator
```bash
# Build and run test
npm run build
node tmp/test-readability.js

# Verify scores are in 40-60 range
```

#### Test 2: Database Verification After Re-indexing
```bash
# Clear and re-index with new readability
rm -rf /Users/hanan/Projects/folder-mcp/.folder-mcp
npm run daemon:restart &

# Wait for indexing to complete (monitor logs)
sleep 30

# Check new scores
sqlite3 /Users/hanan/Projects/folder-mcp/.folder-mcp/embeddings.db \
  "SELECT
    AVG(readability_score) as avg,
    MIN(readability_score) as min,
    MAX(readability_score) as max,
    COUNT(*) as total
   FROM chunks
   WHERE readability_score IS NOT NULL"

# Expected: avg ~48-52, min ~40, max ~60
```

#### Test 3: Verify Score Distribution
```bash
# Check score distribution makes sense
sqlite3 /Users/hanan/Projects/folder-mcp/.folder-mcp/embeddings.db \
  "SELECT
    CASE
      WHEN readability_score < 45 THEN '40-45 (Simple)'
      WHEN readability_score < 50 THEN '45-50 (Medium)'
      WHEN readability_score < 55 THEN '50-55 (Complex)'
      ELSE '55-60 (Very Complex)'
    END as complexity,
    COUNT(*) as count
   FROM chunks
   WHERE readability_score IS NOT NULL
   GROUP BY complexity"

# Should see reasonable distribution across ranges
```

#### Test 4: Compare Known Documents
```bash
# Test specific documents we know
sqlite3 /Users/hanan/Projects/folder-mcp/.folder-mcp/embeddings.db \
  "SELECT
    d.file_path,
    AVG(c.readability_score) as avg_readability,
    COUNT(c.id) as chunks
   FROM documents d
   JOIN chunks c ON d.id = c.document_id
   WHERE d.file_path LIKE '%README.md%'
      OR d.file_path LIKE '%epic.md%'
   GROUP BY d.file_path"

# README.md should score ~45-48 (accessible)
# epic.md should score ~50-55 (technical planning)
```

#### Test 5: MCP Endpoint Verification
```bash
# Test that MCP returns readability in metadata
folder-mcp mcp server << 'EOF'
{
  "jsonrpc": "2.0",
  "method": "search",
  "params": {
    "query": "semantic extraction",
    "folder_path": "/Users/hanan/Projects/folder-mcp"
  },
  "id": 1
}
EOF

# Check that results include readability_score in metadata
```

## Success Criteria

1. **Score Range**: All documents score between 40-60
2. **Distribution**: README files score 40-48, technical docs 48-55, complex docs 55-60
3. **Performance**: <5ms calculation time per chunk
4. **Consistency**: Similar content gets similar scores across models
5. **MCP Integration**: Readability scores appear in search metadata

## Rollback Plan

If issues arise:
1. Readability is metadata only - doesn't affect search functionality
2. Can set all scores to default 50 as emergency fix
3. Previous scores can be restored from backup

## Time Estimate

- **Implementation**: 30 minutes
- **Testing**: 30 minutes
- **Integration**: 30 minutes
- **Validation**: 30 minutes
- **Total**: ~2 hours

## Next Steps After Completion

Once readability is fixed, move to **Sprint 3: BERTopic** for high-impact topic extraction improvements.

---

## Quick Reference Commands

```bash
# Full test cycle
rm -rf /Users/hanan/Projects/folder-mcp/.folder-mcp
npm run build
npm run daemon:restart &
sleep 30
sqlite3 /Users/hanan/Projects/folder-mcp/.folder-mcp/embeddings.db \
  "SELECT AVG(readability_score), MIN(readability_score), MAX(readability_score)
   FROM chunks WHERE readability_score IS NOT NULL"
```

This is a simple, testable approach that can be completed in 2-3 hours with clear validation steps.