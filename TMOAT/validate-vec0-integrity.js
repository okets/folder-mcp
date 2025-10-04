#!/usr/bin/env node

/**
 * Vec0 Database Integrity Validator
 * 
 * TMOAT utility for validating Vec0 virtual table integrity after document lifecycle operations.
 * Tests that embeddings in vec0 virtual tables match the documents/chunks in regular tables.
 * 
 * Usage:
 *   node TMOAT/validate-vec0-integrity.js <database-path>
 *   node TMOAT/validate-vec0-integrity.js /path/to/.folder-mcp/embeddings.db
 * 
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation failures detected
 *   2 - Database connection error
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Vec0IntegrityValidator {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.errors = [];
    this.warnings = [];
  }

  connect() {
    try {
      this.db = new Database(this.dbPath, { readonly: true });
      this.db.loadExtension(sqliteVec.getLoadablePath());
      console.log('✅ Connected to database:', this.dbPath);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(2);
    }
  }

  disconnect() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed\n');
    }
  }

  validateDocumentEmbeddings() {
    console.log('\n=== VALIDATING DOCUMENT EMBEDDINGS ===');
    
    const docCount = this.db.prepare('SELECT COUNT(*) as count FROM documents').get();
    const docEmbCount = this.db.prepare('SELECT COUNT(*) as count FROM document_embeddings').get();
    
    console.log(`Documents in database: ${docCount.count}`);
    console.log(`Document embeddings: ${docEmbCount.count}`);
    
    if (docEmbCount.count === docCount.count) {
      console.log('✅ Document embeddings count matches documents count');
      return true;
    } else {
      const orphans = docEmbCount.count - docCount.count;
      this.errors.push(`Document embeddings mismatch: ${orphans} orphan embeddings`);
      console.log(`❌ ORPHAN EMBEDDINGS DETECTED: ${orphans} orphan document embeddings`);
      
      // List document IDs that exist
      const existingDocs = this.db.prepare('SELECT id FROM documents ORDER BY id').all();
      console.log(`   Existing document IDs: [${existingDocs.map(d => d.id).join(', ')}]`);
      
      return false;
    }
  }

  validateChunkEmbeddings() {
    console.log('\n=== VALIDATING CHUNK EMBEDDINGS ===');
    
    const chunkCount = this.db.prepare('SELECT COUNT(*) as count FROM chunks').get();
    const chunkEmbCount = this.db.prepare('SELECT COUNT(*) as count FROM chunk_embeddings').get();
    
    console.log(`Chunks in database: ${chunkCount.count}`);
    console.log(`Chunk embeddings: ${chunkEmbCount.count}`);
    
    if (chunkEmbCount.count === chunkCount.count) {
      console.log('✅ Chunk embeddings count matches chunks count');
      return true;
    } else {
      const orphans = chunkEmbCount.count - chunkCount.count;
      this.errors.push(`Chunk embeddings mismatch: ${orphans} orphan embeddings`);
      console.log(`❌ ORPHAN EMBEDDINGS DETECTED: ${orphans} orphan chunk embeddings`);
      
      return false;
    }
  }

  validateSpecificDocument(docId) {
    console.log(`\n=== VALIDATING DOCUMENT ID ${docId} ===`);

    // Check if document exists
    const docExists = this.db.prepare('SELECT COUNT(*) as count FROM documents WHERE id = ?').get(docId);
    const docEmbExists = this.db.prepare('SELECT COUNT(*) as count FROM document_embeddings WHERE document_id = ?').get(docId);
    const chunksExist = this.db.prepare('SELECT COUNT(*) as count FROM chunks WHERE document_id = ?').get(docId);
    
    console.log(`Document exists: ${docExists.count > 0 ? 'YES' : 'NO'}`);
    console.log(`Document embedding exists: ${docEmbExists.count > 0 ? 'YES' : 'NO'}`);
    console.log(`Chunks for document: ${chunksExist.count}`);
    
    // Validate consistency
    if (docExists.count === 0) {
      // Document deleted - embeddings and chunks should also be deleted
      if (docEmbExists.count > 0) {
        this.errors.push(`Document ${docId}: Orphan document embedding (document deleted but embedding remains)`);
        console.log(`❌ ORPHAN: Document embedding exists for deleted document ${docId}`);
        return false;
      }
      if (chunksExist.count > 0) {
        this.errors.push(`Document ${docId}: Orphan chunks (document deleted but chunks remain)`);
        console.log(`❌ ORPHAN: ${chunksExist.count} chunks exist for deleted document ${docId}`);
        return false;
      }
      console.log(`✅ Document ${docId} properly cleaned up`);
      return true;
    } else {
      // Document exists - embedding should exist
      if (docEmbExists.count === 0) {
        this.warnings.push(`Document ${docId}: Missing document embedding`);
        console.log(`⚠️  WARNING: Document exists but no embedding found for ${docId}`);
        return false;
      }
      console.log(`✅ Document ${docId} has proper embedding`);
      return true;
    }
  }

  getOrphanDetails() {
    console.log('\n=== ORPHAN EMBEDDING DETAILS ===');

    // Find orphan document embeddings (document_ids not in documents table)
    const existingDocIds = this.db.prepare('SELECT id FROM documents').all().map(d => d.id);
    const allEmbeddings = this.db.prepare('SELECT document_id FROM document_embeddings').all().map(e => e.document_id);

    const orphanDocEmbeddings = allEmbeddings.filter(docId => !existingDocIds.includes(docId));

    if (orphanDocEmbeddings.length > 0) {
      console.log(`Orphan document embedding document_ids: [${orphanDocEmbeddings.join(', ')}]`);
      console.log(`These embeddings exist in document_embeddings but their documents don't exist in documents table`);
    } else {
      console.log('✅ No orphan document embeddings found');
    }

    // Find orphan chunk embeddings (chunk_ids not in chunks table)
    const existingChunkIds = this.db.prepare('SELECT id FROM chunks').all().map(c => c.id);
    const allChunkEmbeddings = this.db.prepare('SELECT chunk_id FROM chunk_embeddings').all().map(e => e.chunk_id);

    const orphanChunkEmbeddings = allChunkEmbeddings.filter(chunkId => !existingChunkIds.includes(chunkId));

    if (orphanChunkEmbeddings.length > 0) {
      console.log(`Orphan chunk embedding chunk_ids: [${orphanChunkEmbeddings.join(', ')}]`);
      console.log(`These embeddings exist in chunk_embeddings but their chunks don't exist in chunks table`);
    } else {
      console.log('✅ No orphan chunk embeddings found');
    }

    return {
      orphanDocumentEmbeddings: orphanDocEmbeddings,
      orphanChunkEmbeddings: orphanChunkEmbeddings
    };
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 ALL VALIDATIONS PASSED - Database integrity confirmed!');
      console.log('='.repeat(60) + '\n');
      return true;
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS DETECTED:');
      this.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    return false;
  }

  validate(specificDocIds = []) {
    this.connect();
    
    try {
      // Overall validation
      const docEmbValid = this.validateDocumentEmbeddings();
      const chunkEmbValid = this.validateChunkEmbeddings();
      
      // Specific document validation if requested
      if (specificDocIds.length > 0) {
        specificDocIds.forEach(docId => this.validateSpecificDocument(docId));
      }
      
      // Get orphan details if there are issues
      if (!docEmbValid || !chunkEmbValid) {
        this.getOrphanDetails();
      }
      
      // Print summary and return result
      const allValid = this.printSummary();
      
      this.disconnect();
      process.exit(allValid ? 0 : 1);
      
    } catch (error) {
      console.error('\n❌ Validation error:', error);
      this.disconnect();
      process.exit(2);
    }
  }
}

// CLI Usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node validate-vec0-integrity.js <database-path> [docId1,docId2,...]');
    console.error('Example: node validate-vec0-integrity.js /path/to/.folder-mcp/embeddings.db');
    console.error('Example: node validate-vec0-integrity.js /path/to/.folder-mcp/embeddings.db 19,20');
    process.exit(2);
  }
  
  const dbPath = resolve(args[0]);
  const specificDocs = args[1] ? args[1].split(',').map(id => parseInt(id.trim())) : [];
  
  console.log('Vec0 Database Integrity Validator');
  console.log('='.repeat(60));
  
  const validator = new Vec0IntegrityValidator(dbPath);
  validator.validate(specificDocs);
}

export { Vec0IntegrityValidator };
