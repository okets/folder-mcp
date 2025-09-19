-- Sprint 0: Add document-level semantic aggregation fields
-- Migration: 001-add-document-semantic-fields.sql
--
-- Adds semantic aggregation fields to the documents table to support
-- intelligent folder navigation. These fields are populated during indexing
-- by aggregating chunk-level semantic data.

-- Add document-level semantic fields
ALTER TABLE documents ADD COLUMN
  -- Core semantic summary (JSON containing aggregated semantics)
  semantic_summary TEXT DEFAULT NULL;

ALTER TABLE documents ADD COLUMN
  -- Primary document theme/purpose for quick filtering
  primary_theme TEXT DEFAULT NULL;

ALTER TABLE documents ADD COLUMN
  -- Average readability score from all chunks
  avg_readability_score REAL DEFAULT NULL;

ALTER TABLE documents ADD COLUMN
  -- Topic diversity metric (0-1, variety of topics)
  topic_diversity_score REAL DEFAULT NULL;

ALTER TABLE documents ADD COLUMN
  -- Phrase richness metric (0-1, multiword phrase ratio)
  phrase_richness_score REAL DEFAULT NULL;

-- Extraction metadata fields
ALTER TABLE documents ADD COLUMN
  -- Extraction method used ('python_rich', 'onnx_embedding', 'aggregation_only')
  extraction_method TEXT DEFAULT NULL;

ALTER TABLE documents ADD COLUMN
  -- When semantic extraction was performed (Unix timestamp)
  semantic_extracted_at INTEGER DEFAULT NULL;

-- Error tracking fields (fail-loud approach)
ALTER TABLE documents ADD COLUMN
  -- Boolean flag indicating if extraction failed
  extraction_failed BOOLEAN DEFAULT FALSE;

ALTER TABLE documents ADD COLUMN
  -- Error message if extraction failed
  extraction_error TEXT DEFAULT NULL;

ALTER TABLE documents ADD COLUMN
  -- Number of extraction attempts
  extraction_attempts INTEGER DEFAULT 0;

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_documents_primary_theme ON documents(primary_theme);
CREATE INDEX IF NOT EXISTS idx_documents_extraction_method ON documents(extraction_method);
CREATE INDEX IF NOT EXISTS idx_documents_semantic_extracted_at ON documents(semantic_extracted_at);
CREATE INDEX IF NOT EXISTS idx_documents_extraction_failed ON documents(extraction_failed);

-- Update schema version if version tracking table exists
UPDATE schema_version SET version = 2, updated_at = CURRENT_TIMESTAMP WHERE id = 1;