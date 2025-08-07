const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:31850');

ws.on('open', () => {
  console.log('✅ Connected - Monitoring for change detection');
  
  // Send connection init
  ws.send(JSON.stringify({
    type: 'connection.init',
    clientType: 'cli'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'fmdm.update') {
    const folder = message.fmdm.folders.find(f => f.path.includes('fresh-chaos-test'));
    if (folder) {
      console.log(`📊 ${folder.status} (${folder.progress || 0}%) - ${new Date().toISOString().slice(14, 23)}`);
    }
  }
});

console.log('🔍 Monitoring for 30 seconds to see if changes are detected...');
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 30000);