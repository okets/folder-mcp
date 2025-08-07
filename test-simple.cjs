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
    console.log('Adding folder...');
    ws.send(JSON.stringify({
      type: 'folder.add',
      id: 'test-add',
      payload: {
        path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/test-1-file-chaos',
        model: 'folder-mcp:all-MiniLM-L6-v2'
      }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨', message.type);
  
  if (message.type === 'fmdm.update') {
    const folder = message.fmdm.folders.find(f => f.path.includes('test-1-file-chaos'));
    if (folder) {
      console.log(`📊 ${folder.path}: ${folder.status} (${folder.progress || 0}%)`);
    }
  }
  
  if (message.type === 'action.response') {
    console.log('📝', message);
  }
});

setTimeout(() => {
  process.exit(0);
}, 10000);