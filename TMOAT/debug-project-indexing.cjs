#!/usr/bin/env node

/**
 * TMOAT: Debug Project Folder Indexing
 * 
 * This test adds the folder-mcp project itself for indexing
 * and monitors the entire lifecycle to identify where issues occur.
 * 
 * Expected: ~270 documents should be indexed
 * Reality: We'll see where it fails
 */

const WebSocket = require('ws');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_FOLDER = '/Users/hanan/Projects/folder-mcp';
const DB_PATH = `${PROJECT_FOLDER}/.folder-mcp/embeddings.db`;

// State tracking
const lifecycleEvents = [];
const stateTransitions = [];
let lastProgress = -1;
let wsConnection = null;

// Helper to query database using sqlite3 command
async function queryDB(sql) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DB_PATH)) {
      resolve(null);
      return;
    }
    
    try {
      const result = execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf-8' });
      const lines = result.trim().split('\n').filter(l => l);
      
      // Parse results based on query type
      if (sql.includes('COUNT(*)')) {
        resolve([{ count: parseInt(lines[0]) || 0 }]);
      } else if (lines.length > 0) {
        // Parse pipe-separated values from sqlite3 CLI
        const rows = lines.map(line => {
          const parts = line.split('|');
          if (sql.includes('as ext')) {
            return { ext: parts[0], count: parseInt(parts[1]) || 0 };
          } else if (sql.includes('file_path')) {
            return { file_path: parts[0] };
          }
          return { value: parts[0] };
        });
        resolve(rows);
      } else {
        resolve([]);
      }
    } catch (error) {
      console.error('DB Query error:', error.message);
      resolve(null);
    }
  });
}

// Helper to check database state
async function checkDatabaseState() {
  console.log('\n📊 Database State Check:');
  console.log('-'.repeat(40));
  
  try {
    // Count documents
    const docs = await queryDB("SELECT COUNT(*) as count FROM documents");
    const docCount = docs ? docs[0].count : 0;
    console.log(`  Documents: ${docCount}`);
    
    // Count by file type
    const types = await queryDB(`
      SELECT 
        LOWER(SUBSTR(file_path, -4)) as ext,
        COUNT(*) as count 
      FROM documents 
      GROUP BY ext
    `);
    if (types) {
      console.log('  By extension:');
      types.forEach(t => console.log(`    ${t.ext}: ${t.count}`));
    }
    
    // Count chunks and embeddings
    const chunks = await queryDB("SELECT COUNT(*) as count FROM chunks");
    const embeddings = await queryDB("SELECT COUNT(*) as count FROM embeddings");
    
    console.log(`  Chunks: ${chunks ? chunks[0].count : 0}`);
    console.log(`  Embeddings: ${embeddings ? embeddings[0].count : 0}`);
    
    // Check for venv files
    const venvFiles = await queryDB("SELECT COUNT(*) as count FROM documents WHERE file_path LIKE '%.venv%'");
    console.log(`  Venv files: ${venvFiles ? venvFiles[0].count : 0}`);
    
    // Sample of what was indexed
    const sample = await queryDB("SELECT file_path FROM documents LIMIT 5");
    if (sample && sample.length > 0) {
      console.log('  Sample files indexed:');
      sample.forEach(s => console.log(`    - ${s.file_path.substring(s.file_path.lastIndexOf('/') + 1)}`));
    }
    
    return { docCount, chunks: chunks ? chunks[0].count : 0 };
  } catch (error) {
    console.error('  Error checking database:', error.message);
    return { docCount: 0, chunks: 0 };
  }
}

// Clean start
function cleanStart() {
  console.log('🧹 Cleaning up for fresh start...');
  
  // Kill any running daemon
  try {
    execSync('pkill -f "node.*daemon/index.js" || true', { stdio: 'ignore' });
    console.log('  ✓ Killed existing daemon');
  } catch (e) {}
  
  // Remove existing .folder-mcp directory
  const folderMcpPath = `${PROJECT_FOLDER}/.folder-mcp`;
  if (fs.existsSync(folderMcpPath)) {
    execSync(`rm -rf "${folderMcpPath}"`, { stdio: 'ignore' });
    console.log('  ✓ Removed .folder-mcp directory');
  }
  
  // Clear daemon log
  const logPath = 'tmp/daemon.log';
  if (fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '');
    console.log('  ✓ Cleared daemon log');
  }
}

// Start daemon
function startDaemon() {
  console.log('\n🚀 Starting daemon...');
  
  const daemon = spawn('node', ['dist/src/daemon/index.js', '--restart'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  daemon.unref();
  
  // Capture output
  daemon.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('ERROR') || output.includes('WARN')) {
      console.log(`  [DAEMON]: ${output.trim()}`);
    }
  });
  
  daemon.stderr.on('data', (data) => {
    const output = data.toString();
    fs.appendFileSync('tmp/daemon.log', output);
  });
  
  console.log('  ✓ Daemon started');
}

// Connect to WebSocket and monitor
async function monitorViaWebSocket() {
  return new Promise((resolve, reject) => {
    console.log('\n📡 Connecting to WebSocket...');
    
    wsConnection = new WebSocket('ws://localhost:31850');
    let folderAdded = false;
    let timeoutHandle;
    
    wsConnection.on('open', () => {
      console.log('  ✓ Connected to WebSocket');
      
      // Initialize connection
      wsConnection.send(JSON.stringify({
        type: 'connection.init',
        clientType: 'cli'
      }));
      
      // Add folder after short delay
      setTimeout(() => {
        console.log(`\n📁 Adding folder: ${PROJECT_FOLDER}`);
        wsConnection.send(JSON.stringify({
          type: 'folder.add',
          id: `add-${Date.now()}`,
          payload: {
            path: PROJECT_FOLDER,
            model: 'BAAI/bge-m3'  // Use the model that daemon has available
          }
        }));
        folderAdded = true;
        
        // Set timeout for test completion
        timeoutHandle = setTimeout(() => {
          console.log('\n⏱️ Test timeout reached (60 seconds)');
          resolve();
        }, 60000);
      }, 1000);
    });
    
    wsConnection.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'connection.ack') {
        console.log('  ✅ Connection acknowledged');
      } else if (msg.type === 'fmdm.update' && folderAdded) {
        const folders = msg.fmdm ? msg.fmdm.folders : [];
        const folder = folders.find(f => f.path === PROJECT_FOLDER);
        
        if (folder) {
          const progress = folder.progress || 0;
          const status = folder.status;
          const info = folder.info || '';
          
          // Track state transitions
          if (stateTransitions.length === 0 || stateTransitions[stateTransitions.length - 1].status !== status) {
            stateTransitions.push({
              status,
              progress,
              info,
              timestamp: new Date().toISOString()
            });
            console.log(`\n[${status.toUpperCase()}] Progress: ${progress}% ${info ? `- ${info}` : ''}`);
          }
          
          // Track progress changes
          if (progress !== lastProgress) {
            lastProgress = progress;
            lifecycleEvents.push({
              type: 'progress',
              value: progress,
              status,
              timestamp: new Date().toISOString()
            });
            
            // Log significant progress points
            if (progress % 10 === 0 || progress === 2 || progress === 100) {
              console.log(`  Progress update: ${progress}% - ${info}`);
            }
          }
          
          // Check if indexing completed or failed
          if (status === 'active' || status === 'indexed') {
            clearTimeout(timeoutHandle);
            console.log(`\n✅ Folder reached ${status} state!`);
            setTimeout(() => resolve(), 2000); // Give it time to settle
          } else if (status === 'error') {
            clearTimeout(timeoutHandle);
            console.log(`\n❌ Folder entered error state: ${folder.error || 'Unknown error'}`);
            setTimeout(() => resolve(), 2000);
          }
        }
      }
    });
    
    wsConnection.on('error', (error) => {
      console.error('  ❌ WebSocket error:', error.message);
      reject(error);
    });
    
    wsConnection.on('close', () => {
      console.log('  WebSocket closed');
      resolve();
    });
  });
}

// Analyze daemon log for issues
function analyzeDaemonLog() {
  console.log('\n📜 Analyzing daemon log...');
  console.log('-'.repeat(40));
  
  const logPath = 'tmp/daemon.log';
  if (!fs.existsSync(logPath)) {
    console.log('  No daemon log found');
    return;
  }
  
  const log = fs.readFileSync(logPath, 'utf-8');
  const lines = log.split('\n');
  
  // Count important events
  const scanLines = lines.filter(l => l.includes('MANAGER-SCAN'));
  const errorLines = lines.filter(l => l.includes('ERROR'));
  const progressLines = lines.filter(l => l.includes('MANAGER-PROGRESS'));
  
  console.log(`  Scan events: ${scanLines.length}`);
  console.log(`  Error events: ${errorLines.length}`);
  console.log(`  Progress events: ${progressLines.length}`);
  
  // Extract key scan info
  scanLines.forEach(line => {
    if (line.includes('Found') && line.includes('files')) {
      const match = line.match(/Found (\d+) files/);
      if (match) console.log(`  📋 Scanner found: ${match[1]} total files`);
    }
    if (line.includes('Filtered to') && line.includes('supported files')) {
      const match = line.match(/Filtered to (\d+) supported files/);
      if (match) console.log(`  📋 After filtering: ${match[1]} supported files`);
    }
    if (line.includes('Detected') && line.includes('changes')) {
      const match = line.match(/Detected (\d+) changes/);
      if (match) console.log(`  📋 Changes detected: ${match[1]}`);
    }
  });
  
  // Show first few errors
  if (errorLines.length > 0) {
    console.log('\n  First errors:');
    errorLines.slice(0, 3).forEach(line => {
      const match = line.match(/ERROR.*?(\{.*\})?$/);
      if (match) console.log(`    - ${match[0].substring(0, 80)}...`);
    });
  }
}

// Main test execution
async function runTest() {
  console.log('🔬 PROJECT INDEXING DEBUG TEST');
  console.log('=' .repeat(60));
  console.log(`Project: ${PROJECT_FOLDER}`);
  console.log(`Expected: ~270 documents (txt, md, pdf, docx, xlsx, pptx)`);
  console.log('');
  
  try {
    // Step 1: Clean start
    cleanStart();
    
    // Step 2: Start daemon
    startDaemon();
    
    // Wait for daemon to initialize
    console.log('\n⏳ Waiting for daemon to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: Monitor via WebSocket
    await monitorViaWebSocket();
    
    // Step 4: Check database state
    const dbState = await checkDatabaseState();
    
    // Step 5: Analyze daemon log
    analyzeDaemonLog();
    
    // Step 6: Report results
    console.log('\n📈 LIFECYCLE ANALYSIS');
    console.log('=' .repeat(60));
    
    console.log('\nState Transitions:');
    stateTransitions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.status} (${t.progress}%) - ${t.info || 'No info'}`);
    });
    
    console.log('\nProgress Points:');
    const progressPoints = lifecycleEvents.filter(e => e.type === 'progress').map(e => e.value);
    console.log(`  ${progressPoints.join('% → ')}%`);
    
    console.log('\nFinal Result:');
    console.log(`  Documents indexed: ${dbState.docCount} / ~270 expected`);
    console.log(`  Chunks created: ${dbState.chunks}`);
    console.log(`  Success rate: ${Math.round(dbState.docCount / 270 * 100)}%`);
    
    // Identify issues
    console.log('\n🔍 IDENTIFIED ISSUES:');
    if (dbState.docCount < 50) {
      console.log('  ❌ Very few documents indexed - likely stopped early');
    } else if (dbState.docCount < 100) {
      console.log('  ⚠️ Only partial indexing - batch limit issue?');
    } else if (dbState.docCount < 200) {
      console.log('  ⚠️ Missing many documents - file type filtering issue?');
    }
    
    if (!stateTransitions.find(t => t.status === 'scanning')) {
      console.log('  ❌ Never entered scanning state');
    }
    if (!stateTransitions.find(t => t.status === 'indexing')) {
      console.log('  ❌ Never entered indexing state');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Cleanup
    if (wsConnection) wsConnection.close();
    console.log('\n✨ Test complete');
    process.exit(0);
  }
}

// Run the test
runTest();