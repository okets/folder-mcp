const WebSocket = require('ws');

async function testFileChaos() {
  console.log('=== TEST 1: Files changing during indexing ===');
  
  const ws = new WebSocket('ws://127.0.0.1:31850');
  
  ws.on('open', () => {
    console.log('✅ Connected to daemon WebSocket');
    
    // Send connection init
    ws.send(JSON.stringify({
      type: 'connection.init',
      clientType: 'cli'
    }));
    
    // Add test folder after connection
    setTimeout(() => {
      console.log('📁 Adding test folder...');
      ws.send(JSON.stringify({
        type: 'folder.add',
        id: 'test-chaos-1',
        payload: {
          path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/test-1-file-chaos',
          model: 'folder-mcp:all-MiniLM-L6-v2'
        }
      }));
    }, 1000);
  });

  let indexingStarted = false;
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'fmdm.update') {
      const testFolder = message.fmdm.folders.find(f => f.path.includes('test-1-file-chaos'));
      if (testFolder) {
        console.log(`📊 Folder status: ${testFolder.status} (${testFolder.progress || 0}%)`);
        
        // When indexing starts, add chaos files
        if (testFolder.status === 'indexing' && !indexingStarted) {
          indexingStarted = true;
          console.log('🚀 INDEXING STARTED - Adding chaos files...');
          
          setTimeout(() => {
            console.log('Adding 10 new files during indexing...');
            // We'll add files via separate process to avoid blocking
            process.exit(0);
          }, 2000);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
}

testFileChaos().catch(console.error);