const WebSocket = require('ws');

console.log('🧪 Testing Fix #2 - File Change Detection');

const ws = new WebSocket('ws://127.0.0.1:31850');

ws.on('open', () => {
  console.log('✅ Connected');
  
  ws.send(JSON.stringify({
    type: 'connection.init',
    clientType: 'cli'
  }));
  
  setTimeout(() => {
    console.log('📁 Adding fresh test folder...');
    ws.send(JSON.stringify({
      type: 'folder.add',
      id: 'fix-test-2',
      payload: {
        path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/fix-test-2',
        model: 'folder-mcp:all-MiniLM-L6-v2'
      }
    }));
  }, 1000);
});

let activeDetected = false;
let changesMade = false;

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'fmdm.update') {
    const folder = message.fmdm.folders.find(f => f.path.includes('fix-test-2'));
    if (folder) {
      console.log(`📊 ${folder.status} (${folder.progress || 0}%)`);
      
      // When folder becomes active, add a file
      if (folder.status === 'active' && !activeDetected) {
        activeDetected = true;
        console.log('⏰ Folder active - making changes in 3 seconds...');
        
        setTimeout(() => {
          console.log('⚡ ADDING FILE NOW');
          require('fs').writeFileSync('/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/fix-test-2/change_test.txt', 'Change detection test');
          changesMade = true;
        }, 3000);
      }
      
      // Check if changes triggered re-scanning
      if (changesMade && folder.status === 'scanning') {
        console.log('🎉 SUCCESS! File changes detected - folder transitioned back to scanning!');
        process.exit(0);
      }
    }
  }
});

setTimeout(() => {
  if (changesMade) {
    console.log('❌ FAIL: Changes not detected within 15 seconds');
  }
  process.exit(1);
}, 18000);