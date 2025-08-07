const WebSocket = require('ws');

console.log('🧪 Testing Fix #2 - Folder Deletion Detection');

const ws = new WebSocket('ws://127.0.0.1:31850');

ws.on('open', () => {
  console.log('✅ Connected');
  
  ws.send(JSON.stringify({
    type: 'connection.init',
    clientType: 'cli'
  }));
  
  setTimeout(() => {
    console.log('📁 Adding deletion test folder...');
    ws.send(JSON.stringify({
      type: 'folder.add',
      id: 'deletion-test',
      payload: {
        path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/deletion-test',
        model: 'folder-mcp:all-MiniLM-L6-v2'
      }
    }));
  }, 1000);
});

let folderActive = false;
let folderDeleted = false;

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'fmdm.update') {
    const folder = message.fmdm.folders.find(f => f.path.includes('deletion-test'));
    
    if (folder) {
      console.log(`📊 ${folder.status} (${folder.progress || 0}%)`);
      
      // When folder becomes active, delete it from disk
      if (folder.status === 'active' && !folderActive) {
        folderActive = true;
        console.log('⏰ Folder active - deleting from disk in 3 seconds...');
        
        setTimeout(() => {
          console.log('⚡ DELETING FOLDER FROM DISK NOW');
          require('fs').rmSync('/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/deletion-test', { recursive: true, force: true });
          folderDeleted = true;
          
          // The validation timer runs every 30 seconds, so let's wait up to 35 seconds
          console.log('⏳ Waiting for validation timer to detect deletion (up to 35 seconds)...');
        }, 3000);
      }
    } else if (folderDeleted && folderActive) {
      // Folder was deleted from disk and now it's gone from FMDM
      console.log('🎉 SUCCESS! Deleted folder was removed from FMDM!');
      process.exit(0);
    }
  }
});

setTimeout(() => {
  if (folderDeleted) {
    console.log('❌ FAIL: Deleted folder still in FMDM after 40 seconds');
  }
  process.exit(1);
}, 40000);