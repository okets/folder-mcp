const WebSocket = require('ws');

console.log('🧪 Testing fixes for file change detection');

const ws = new WebSocket('ws://127.0.0.1:31850');

ws.on('open', () => {
  console.log('✅ Connected to daemon');
  
  ws.send(JSON.stringify({
    type: 'connection.init',
    clientType: 'cli'
  }));
  
  setTimeout(() => {
    console.log('📁 Adding test folder...');
    ws.send(JSON.stringify({
      type: 'folder.add',
      id: 'fix-test',
      payload: {
        path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/fix-test-1',
        model: 'folder-mcp:all-MiniLM-L6-v2'
      }
    }));
  }, 1000);
});

let folderActive = false;

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'fmdm.update') {
    const testFolder = message.fmdm.folders.find(f => f.path.includes('fix-test-1'));
    if (testFolder) {
      console.log(`📊 Status: ${testFolder.status} (${testFolder.progress || 0}%)`);
      
      if (testFolder.status === 'active' && !folderActive) {
        folderActive = true;
        console.log('✅ Folder is active! Adding a new file to test change detection...');
        
        setTimeout(() => {
          console.log('⚡ Adding new file now...');
          require('fs').writeFileSync('/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/fix-test-1/added_during_active.txt', 'This file was added while active - should trigger re-scan');
        }, 2000);
      } else if (folderActive && testFolder.status === 'scanning') {
        console.log('🎉 SUCCESS! Folder detected changes and transitioned back to scanning!');
      } else if (folderActive && testFolder.status === 'indexing') {
        console.log('🎉 SUCCESS! Folder is now re-indexing the new content!');
      }
    }
  }
});

setTimeout(() => {
  console.log('🏁 Test complete');
  ws.close();
  process.exit(0);
}, 20000);