const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:31850');

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({type: 'connection.init', clientType: 'cli'}));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.type === 'fmdm.update') {
    const folder = message.fmdm.folders.find(f => f.path.includes('fresh-chaos-test'));
    if (folder) {
      console.log(`Status: ${folder.status} (${folder.progress || 0}%)`);
    }
  }
});

setTimeout(() => {
  console.log('Creating obvious new file...');
  require('fs').writeFileSync('/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/fresh-chaos-test/obvious_new_file.txt', 'OBVIOUS NEW CONTENT');
}, 2000);

setTimeout(() => process.exit(0), 8000);