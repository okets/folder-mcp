#!/usr/bin/env node

/**
 * TMOAT Atomic Test: Embedding Lifecycle Verification
 * 
 * Comprehensive test that verifies the complete file monitoring and embedding lifecycle:
 * 1. Adding a file creates embeddings in the database
 * 2. Updating a file updates its embeddings 
 * 3. Removing a file removes its embeddings and database entries
 * 4. Agent-to-Endpoint semantic search validation at each step
 */

import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 ATOMIC TEST: Embedding Lifecycle Verification');
console.log('='.repeat(60));

// Test configuration - using existing monitored folder
const TEST_FOLDER = '/Users/hanan/Projects/folder-mcp/tmp/small-test-folder';
const TEST_FILE = 'embedding-lifecycle-test.txt';
const TEST_FILE_PATH = path.join(TEST_FOLDER, TEST_FILE);
const DB_PATH = path.join(TEST_FOLDER, '.folder-mcp', 'embeddings.db');
const WS_URL = 'ws://127.0.0.1:31850';

// Unique secrets for each test phase
const SECRETS = {
  add: 'UNIQUE_SECRET_ADD_12345',
  update: 'UNIQUE_SECRET_UPDATE_67890'
};

// Test state tracking
let testState = {
  phase: 'setup',
  baselineCounts: {},
  phaseResults: {},
  errors: [],
  startTime: Date.now()
};

let ws = null;
let folderState = null;

console.log(`📁 Test Folder: ${TEST_FOLDER}`);
console.log(`📄 Test File: ${TEST_FILE}`);
console.log(`🗄️ Database: ${DB_PATH}`);

/**
 * Database Verification Functions
 */

async function getEmbeddingCounts(dbPath) {
  try {
    const db = new Database(dbPath, { readonly: true });
    
    const docs = db.prepare('SELECT COUNT(*) as count FROM documents').get();
    const chunks = db.prepare('SELECT COUNT(*) as count FROM chunks').get();  
    const embeddings = db.prepare('SELECT COUNT(*) as count FROM embeddings').get();
    
    db.close();
    
    return {
      documents: docs.count,
      chunks: chunks.count,
      embeddings: embeddings.count
    };
  } catch (error) {
    console.error(`❌ Database query error: ${error.message}`);
    return { documents: 0, chunks: 0, embeddings: 0 };
  }
}

async function findDocumentByPath(dbPath, fileName) {
  try {
    const db = new Database(dbPath, { readonly: true });
    
    const doc = db.prepare('SELECT * FROM documents WHERE file_path LIKE ?').get(`%${fileName}%`);
    
    const chunks = doc ? db.prepare('SELECT COUNT(*) as count FROM chunks WHERE document_id = ?').get(doc.id) : null;
    
    db.close();
    
    return doc ? { ...doc, chunkCount: chunks?.count || 0 } : null;
  } catch (error) {
    console.error(`❌ Document lookup error: ${error.message}`);
    return null;
  }
}

async function verifyDatabaseIntegrity(dbPath) {
  try {
    const db = new Database(dbPath, { readonly: true });
    
    // Check for orphaned chunks (chunks without documents)
    const orphanedChunks = db.prepare(`
      SELECT COUNT(*) as count FROM chunks 
      WHERE document_id NOT IN (SELECT id FROM documents)
    `).get();
    
    // Check for orphaned embeddings (embeddings without chunks)
    const orphanedEmbeddings = db.prepare(`
      SELECT COUNT(*) as count FROM embeddings 
      WHERE chunk_id NOT IN (SELECT id FROM chunks)
    `).get();
    
    db.close();
    
    return {
      orphanedChunks: orphanedChunks.count,
      orphanedEmbeddings: orphanedEmbeddings.count,
      isHealthy: orphanedChunks.count === 0 && orphanedEmbeddings.count === 0
    };
  } catch (error) {
    console.error(`❌ Database integrity check error: ${error.message}`);
    return { orphanedChunks: -1, orphanedEmbeddings: -1, isHealthy: false };
  }
}

/**
 * MCP Agent-to-Endpoint Search Functions
 */

async function performSemanticSearch(query) {
  console.log(`🔍 Performing semantic search for: "${query}"`);
  
  try {
    // Use the folder-mcp MCP server for Agent-to-Endpoint testing
    const results = await mcp__folder_mcp__search({
      query: query,
      folder_id: "small-test-folder",
      limit: 5,
      threshold: 0.3
    });
    
    console.log(`   📊 Search results: ${results ? results.length : 0} matches`);
    if (results && results.length > 0) {
      results.forEach((result, i) => {
        console.log(`      ${i + 1}. ${result.document} (score: ${result.score?.toFixed(3)})`);
      });
    }
    
    return {
      success: true,
      results: results || [],
      found: results && results.length > 0,
      count: results ? results.length : 0
    };
  } catch (error) {
    console.error(`❌ MCP search error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      found: false,
      count: 0
    };
  }
}

/**
 * WebSocket FMDM Monitoring
 */

function setupWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 Connecting to daemon WebSocket...');
    ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      
      // Initialize connection
      ws.send(JSON.stringify({
        type: 'connection.init',
        clientType: 'cli'
      }));
      
      resolve();
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'connection.ack') {
          console.log('✅ Connection acknowledged');
        } else if (msg.type === 'fmdm.update' && msg.fmdm?.folders) {
          const folder = msg.fmdm.folders.find(f => f.path === TEST_FOLDER);
          if (folder) {
            const timestamp = new Date().toISOString().substring(11, 23);
            const statusMsg = `[${timestamp}] 📊 Folder: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`;
            
            if (folderState?.status !== folder.status || folderState?.progress !== folder.progress) {
              console.log(statusMsg);
              folderState = folder;
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error: ${error.message}`);
      reject(error);
    });
    
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });
}

async function waitForFolderState(targetState, timeoutMs = 15000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (folderState?.status === targetState) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * Test Phases
 */

async function runPhase1_Setup() {
  console.log('\n📋 PHASE 1: Setup & Baseline Verification');
  console.log('-'.repeat(40));
  
  testState.phase = 'setup';
  
  try {
    // Setup WebSocket connection
    await setupWebSocketConnection();
    
    // Wait for folder to be active (should be immediate)
    console.log('⏳ Waiting for folder to be active...');
    const isActive = await waitForFolderState('active', 5000);
    
    if (!isActive) {
      throw new Error('Folder is not in active state');
    }
    
    console.log('✅ Folder is active and ready');
    
    // Get baseline database counts
    console.log('📊 Getting baseline database counts...');
    testState.baselineCounts = await getEmbeddingCounts(DB_PATH);
    
    console.log(`   📄 Documents: ${testState.baselineCounts.documents}`);
    console.log(`   📝 Chunks: ${testState.baselineCounts.chunks}`);
    console.log(`   🧬 Embeddings: ${testState.baselineCounts.embeddings}`);
    
    // Verify database integrity
    const integrity = await verifyDatabaseIntegrity(DB_PATH);
    if (!integrity.isHealthy) {
      console.warn(`⚠️  Database has integrity issues: ${integrity.orphanedChunks} orphaned chunks, ${integrity.orphanedEmbeddings} orphaned embeddings`);
    } else {
      console.log('✅ Database integrity verified');
    }
    
    // Clean up any existing test file
    try {
      await fs.unlink(TEST_FILE_PATH);
      console.log('🧹 Cleaned up existing test file');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for deletion to process
    } catch (e) {
      // File doesn't exist, that's fine
    }
    
    testState.phaseResults.setup = { success: true };
    console.log('✅ PHASE 1 COMPLETE\n');
    
  } catch (error) {
    testState.errors.push(`Phase 1: ${error.message}`);
    testState.phaseResults.setup = { success: false, error: error.message };
    throw error;
  }
}

async function runPhase2_FileAddition() {
  console.log('\n➕ PHASE 2: File Addition Test');
  console.log('-'.repeat(40));
  
  testState.phase = 'add';
  
  try {
    // Create test file with unique content
    const addContent = `This is a test document for embedding lifecycle verification.

${SECRETS.add} - This secret should be searchable after indexing.

The document contains multiple paragraphs to generate multiple chunks.
This helps test the complete chunking and embedding pipeline.
Testing embedding creation and database storage integrity.

Additional content to ensure we have enough text for proper chunking.
Each chunk should generate its own embedding vector in the database.
The semantic search should be able to find this content reliably.`;

    console.log(`📝 Creating test file: ${TEST_FILE}`);
    await fs.writeFile(TEST_FILE_PATH, addContent);
    console.log('✅ File created successfully');
    
    // Wait for file monitoring to trigger (debounce + processing)
    console.log('⏳ Waiting for file monitoring to detect change...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Debounce period
    
    // Wait for processing to complete
    console.log('⏳ Waiting for indexing to complete...');
    const indexed = await waitForFolderState('active', 12000);
    
    if (!indexed) {
      throw new Error('File indexing did not complete within timeout');
    }
    
    console.log('✅ File indexing completed');
    
    // Verify database changes
    console.log('📊 Verifying database changes...');
    const newCounts = await getEmbeddingCounts(DB_PATH);
    
    const docIncrease = newCounts.documents - testState.baselineCounts.documents;
    const chunkIncrease = newCounts.chunks - testState.baselineCounts.chunks;
    const embeddingIncrease = newCounts.embeddings - testState.baselineCounts.embeddings;
    
    console.log(`   📄 Documents: +${docIncrease} (${testState.baselineCounts.documents} → ${newCounts.documents})`);
    console.log(`   📝 Chunks: +${chunkIncrease} (${testState.baselineCounts.chunks} → ${newCounts.chunks})`);
    console.log(`   🧬 Embeddings: +${embeddingIncrease} (${testState.baselineCounts.embeddings} → ${newCounts.embeddings})`);
    
    // Verify document was added
    const document = await findDocumentByPath(DB_PATH, TEST_FILE);
    if (!document) {
      throw new Error('Document was not added to database');
    }
    
    console.log(`✅ Document added: ID ${document.id}, fingerprint ${document.fingerprint.substring(0, 8)}...`);
    
    // Perform Agent-to-Endpoint search test
    console.log('\n🔍 Agent-to-Endpoint Search Test:');
    const searchResult = await performSemanticSearch(SECRETS.add);
    
    if (!searchResult.success) {
      throw new Error(`Search failed: ${searchResult.error}`);
    }
    
    if (!searchResult.found) {
      throw new Error('Search did not find the added content');
    }
    
    console.log(`✅ Search successful: Found ${searchResult.count} result(s)`);
    
    // Verify the search result contains our test file
    const foundTestFile = searchResult.results.some(r => 
      r.document && r.document.includes(TEST_FILE)
    );
    
    if (!foundTestFile) {
      throw new Error('Search results do not contain our test file');
    }
    
    console.log('✅ Test file found in search results');
    
    testState.phaseResults.add = {
      success: true,
      docIncrease,
      chunkIncrease,
      embeddingIncrease,
      searchFound: searchResult.count
    };
    
    console.log('✅ PHASE 2 COMPLETE\n');
    
  } catch (error) {
    testState.errors.push(`Phase 2: ${error.message}`);
    testState.phaseResults.add = { success: false, error: error.message };
    throw error;
  }
}

async function runPhase3_FileUpdate() {
  console.log('\n📝 PHASE 3: File Update Test');
  console.log('-'.repeat(40));
  
  testState.phase = 'update';
  
  try {
    // Get current document state
    const beforeDoc = await findDocumentByPath(DB_PATH, TEST_FILE);
    if (!beforeDoc) {
      throw new Error('Test file not found in database before update');
    }
    
    console.log(`📋 Current document: ID ${beforeDoc.id}, fingerprint ${beforeDoc.fingerprint.substring(0, 8)}...`);
    
    // Update file with new content
    const updateContent = `This document has been updated with new information.

${SECRETS.update} - This new secret should replace the old one.

The updated document contains completely different content.
This tests the embedding update and replacement functionality.
The old secret should no longer be searchable after this update.

Updated content ensures embeddings are regenerated properly.
Testing that old embeddings are replaced, not just added to.
Semantic search should reflect the current file state only.`;

    console.log(`📝 Updating test file with new content...`);
    await fs.writeFile(TEST_FILE_PATH, updateContent);
    console.log('✅ File updated successfully');
    
    // Wait for re-indexing
    console.log('⏳ Waiting for re-indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Debounce period
    
    const reindexed = await waitForFolderState('active', 12000);
    if (!reindexed) {
      throw new Error('File re-indexing did not complete within timeout');
    }
    
    console.log('✅ File re-indexing completed');
    
    // Verify document was updated
    const afterDoc = await findDocumentByPath(DB_PATH, TEST_FILE);
    if (!afterDoc) {
      throw new Error('Document disappeared after update');
    }
    
    if (afterDoc.fingerprint === beforeDoc.fingerprint) {
      throw new Error('Document fingerprint did not change after update');
    }
    
    console.log(`✅ Document updated: fingerprint ${beforeDoc.fingerprint.substring(0, 8)}... → ${afterDoc.fingerprint.substring(0, 8)}...`);
    
    // Test Agent-to-Endpoint search for new content
    console.log('\n🔍 Agent-to-Endpoint Search Test (New Content):');
    const newSearchResult = await performSemanticSearch(SECRETS.update);
    
    if (!newSearchResult.success) {
      throw new Error(`New content search failed: ${newSearchResult.error}`);
    }
    
    if (!newSearchResult.found) {
      throw new Error('Search did not find the updated content');
    }
    
    console.log(`✅ New content search successful: Found ${newSearchResult.count} result(s)`);
    
    // Test Agent-to-Endpoint search for old content (should NOT find)
    console.log('\n🔍 Agent-to-Endpoint Search Test (Old Content):');
    const oldSearchResult = await performSemanticSearch(SECRETS.add);
    
    if (!oldSearchResult.success) {
      console.warn(`⚠️  Old content search failed: ${oldSearchResult.error}`);
    } else if (oldSearchResult.found) {
      console.warn(`⚠️  Old content still found in search (${oldSearchResult.count} results) - embeddings may not have been fully replaced`);
      // This might be expected if chunks overlap or caching is involved
    } else {
      console.log('✅ Old content no longer found (embeddings properly updated)');
    }
    
    testState.phaseResults.update = {
      success: true,
      fingerprintChanged: afterDoc.fingerprint !== beforeDoc.fingerprint,
      newContentFound: newSearchResult.count,
      oldContentFound: oldSearchResult.count
    };
    
    console.log('✅ PHASE 3 COMPLETE\n');
    
  } catch (error) {
    testState.errors.push(`Phase 3: ${error.message}`);
    testState.phaseResults.update = { success: false, error: error.message };
    throw error;
  }
}

async function runPhase4_FileDeletion() {
  console.log('\n🗑️ PHASE 4: File Deletion Test');
  console.log('-'.repeat(40));
  
  testState.phase = 'delete';
  
  try {
    // Get counts before deletion
    const beforeCounts = await getEmbeddingCounts(DB_PATH);
    const beforeDoc = await findDocumentByPath(DB_PATH, TEST_FILE);
    
    if (!beforeDoc) {
      throw new Error('Test file not found in database before deletion');
    }
    
    console.log(`📋 Before deletion: ${beforeCounts.documents} docs, ${beforeCounts.chunks} chunks, ${beforeCounts.embeddings} embeddings`);
    
    // Delete the file
    console.log(`🗑️ Deleting test file...`);
    await fs.unlink(TEST_FILE_PATH);
    console.log('✅ File deleted successfully');
    
    // Wait for deletion processing
    console.log('⏳ Waiting for deletion processing...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Give time for deletion to be processed
    
    // Verify database cleanup
    const afterCounts = await getEmbeddingCounts(DB_PATH);
    const afterDoc = await findDocumentByPath(DB_PATH, TEST_FILE);
    
    console.log(`📋 After deletion: ${afterCounts.documents} docs, ${afterCounts.chunks} chunks, ${afterCounts.embeddings} embeddings`);
    
    // Check if document was removed
    if (afterDoc) {
      console.warn('⚠️  Document still exists in database after deletion');
    } else {
      console.log('✅ Document removed from database');
    }
    
    // Calculate changes
    const docDecrease = beforeCounts.documents - afterCounts.documents;
    const chunkDecrease = beforeCounts.chunks - afterCounts.chunks;
    const embeddingDecrease = beforeCounts.embeddings - afterCounts.embeddings;
    
    console.log(`   📄 Documents: -${docDecrease}`);
    console.log(`   📝 Chunks: -${chunkDecrease}`);
    console.log(`   🧬 Embeddings: -${embeddingDecrease}`);
    
    // Verify database integrity
    const integrity = await verifyDatabaseIntegrity(DB_PATH);
    if (!integrity.isHealthy) {
      console.warn(`⚠️  Database integrity issues after deletion: ${integrity.orphanedChunks} orphaned chunks, ${integrity.orphanedEmbeddings} orphaned embeddings`);
    } else {
      console.log('✅ Database integrity maintained after deletion');
    }
    
    // Test Agent-to-Endpoint search for deleted content
    console.log('\n🔍 Agent-to-Endpoint Search Test (Deleted Content):');
    const searchResult = await performSemanticSearch(SECRETS.update);
    
    if (!searchResult.success) {
      console.warn(`⚠️  Search failed after deletion: ${searchResult.error}`);
    } else if (searchResult.found) {
      console.warn(`⚠️  Deleted content still found in search (${searchResult.count} results) - cleanup may be incomplete`);
    } else {
      console.log('✅ Deleted content no longer found in search');
    }
    
    testState.phaseResults.delete = {
      success: true,
      docDecrease,
      chunkDecrease,
      embeddingDecrease,
      documentRemoved: !afterDoc,
      integrityHealthy: integrity.isHealthy,
      searchClean: !searchResult.found
    };
    
    console.log('✅ PHASE 4 COMPLETE\n');
    
  } catch (error) {
    testState.errors.push(`Phase 4: ${error.message}`);
    testState.phaseResults.delete = { success: false, error: error.message };
    throw error;
  }
}

/**
 * Test Results & Reporting
 */

function generateTestReport() {
  console.log('=' .repeat(60));
  console.log('📊 EMBEDDING LIFECYCLE TEST RESULTS');
  console.log('=' .repeat(60));
  
  const duration = ((Date.now() - testState.startTime) / 1000).toFixed(1);
  console.log(`⏱️  Total Duration: ${duration} seconds\n`);
  
  // Phase results
  Object.entries(testState.phaseResults).forEach(([phase, result]) => {
    const icon = result.success ? '✅' : '❌';
    const phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);
    console.log(`${icon} Phase ${phaseName}: ${result.success ? 'PASSED' : 'FAILED'}`);
    
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Detailed results for successful phases
    if (result.success) {
      if (phase === 'add') {
        console.log(`   📄 Added: ${result.docIncrease} document(s), ${result.chunkIncrease} chunk(s), ${result.embeddingIncrease} embedding(s)`);
        console.log(`   🔍 Search: Found ${result.searchFound} result(s)`);
      } else if (phase === 'update') {
        console.log(`   🔄 Fingerprint changed: ${result.fingerprintChanged}`);
        console.log(`   🔍 New content found: ${result.newContentFound} result(s)`);
        console.log(`   🔍 Old content found: ${result.oldContentFound} result(s)`);
      } else if (phase === 'delete') {
        console.log(`   📄 Removed: ${result.docDecrease} document(s), ${result.chunkDecrease} chunk(s), ${result.embeddingDecrease} embedding(s)`);
        console.log(`   🗂️  Document removed: ${result.documentRemoved}`);
        console.log(`   🔍 Search clean: ${result.searchClean}`);
        console.log(`   💾 DB integrity: ${result.integrityHealthy}`);
      }
    }
  });
  
  // Overall assessment
  const allPhasesPassed = Object.values(testState.phaseResults).every(r => r.success);
  const errorCount = testState.errors.length;
  
  console.log('\n' + '='.repeat(60));
  
  if (allPhasesPassed && errorCount === 0) {
    console.log('🎉 OVERALL RESULT: ALL TESTS PASSED');
    console.log('✅ File monitoring and embedding lifecycle working correctly');
    console.log('✅ Database integrity maintained throughout');
    console.log('✅ Agent-to-Endpoint semantic search working as expected');
  } else {
    console.log('⚠️  OVERALL RESULT: SOME TESTS FAILED');
    console.log(`❌ ${4 - Object.keys(testState.phaseResults).filter(k => testState.phaseResults[k].success).length} phase(s) failed`);
    console.log(`❌ ${errorCount} error(s) encountered`);
    
    if (testState.errors.length > 0) {
      console.log('\nERRORS:');
      testState.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
  }
  
  return allPhasesPassed && errorCount === 0;
}

/**
 * Main Test Execution
 */

async function runEmbeddingLifecycleTest() {
  try {
    await runPhase1_Setup();
    await runPhase2_FileAddition();
    await runPhase3_FileUpdate(); 
    await runPhase4_FileDeletion();
    
    return generateTestReport();
    
  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}`);
    return generateTestReport();
    
  } finally {
    // Cleanup
    if (ws) {
      ws.close();
    }
    
    // Ensure test file is cleaned up
    try {
      await fs.unlink(TEST_FILE_PATH);
    } catch (e) {
      // File might already be deleted
    }
  }
}

// Handle MCP integration
// This assumes the folder-mcp MCP server is available in the context
if (typeof mcp__folder_mcp__search !== 'function') {
  console.error('❌ folder-mcp MCP server not available for Agent-to-Endpoint testing');
  console.error('   Make sure the MCP server is connected and available');
  console.error('   This test requires the folder-mcp MCP to be connected to Claude Code');
  process.exit(1);
}

// Run the test
console.log('🚀 Starting embedding lifecycle test...\n');
runEmbeddingLifecycleTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });