const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:31850');

ws.on('open', () => {
  console.log('✅ Connected');
  
  // Send connection init
  ws.send(JSON.stringify({
    type: 'connection.init',
    clientType: 'cli'
  }));
  
  setTimeout(() => {
    console.log('📁 Adding fresh folder...');
    ws.send(JSON.stringify({
      type: 'folder.add',
      id: 'fresh-test',
      payload: {
        path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/fresh-chaos-test',
        model: 'folder-mcp:all-MiniLM-L6-v2'
      }
    }));
  }, 500);
});

let indexingDetected = false;

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'fmdm.update') {
    const folder = message.fmdm.folders.find(f => f.path.includes('fresh-chaos-test'));
    if (folder) {
      console.log(`📊 ${folder.status} (${folder.progress || 0}%) - ${new Date().toISOString().slice(14, 23)}`);
      
      // When we see indexing state, add chaos files
      if ((folder.status === 'indexing' || folder.status === 'scanning') && !indexingDetected) {
        indexingDetected = true;
        console.log('🚨 DETECTED INDEXING/SCANNING - Starting file chaos in 1 second...');
        
        setTimeout(() => {
          console.log('⚡ Adding 5 new files during processing...');
          // Will simulate this via file system operations
        }, 1000);
        
        setTimeout(() => {
          console.log('⚡ Deleting 2 files during processing...');
        }, 2000);
        
        setTimeout(() => {
          console.log('⚡ Modifying 3 files during processing...');
        }, 3000);
      }
    }
  }
  
  if (message.type === 'action.response') {
    console.log('📝', message.success ? '✅' : '❌', message.message || 'Action completed');
  }
});

setTimeout(() => {
  ws.close();
  process.exit(0);
}, 15000);