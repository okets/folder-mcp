#!/usr/bin/env node

/**
 * TMOAT Atomic Test 1: WebSocket Connection
 * Tests basic connection to the daemon and verifies FMDM updates
 */

import WebSocket from 'ws';

console.log('🔍 ATOMIC TEST 1: WebSocket Connection to Daemon');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');
    
    // Send connection init with correct client type
    console.log('📤 Sending connection.init with clientType: cli');
    ws.send(JSON.stringify({
        type: 'connection.init',
        clientType: 'cli'  // Fixed: using supported client type
    }));
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        const timestamp = new Date().toISOString().substring(11, 23);
        
        console.log(`[${timestamp}] 📨 Received: ${message.type || 'unknown'}`);
        
        if (message.type === 'connection.ack') {
            console.log('✅ Connection acknowledged by daemon');
        } else if (message.type === 'fmdm.update') {
            console.log(`📊 FMDM Update - ${message.fmdm?.folders?.length || 0} folders managed`);
            if (message.fmdm?.folders?.length > 0) {
                message.fmdm.folders.forEach(folder => {
                    const folderName = folder.path.split('/').pop();
                    console.log(`  📁 ${folderName}: ${folder.status}`);
                });
            }
        } else if (message.type === 'error') {
            console.log(`❌ Error from daemon: ${message.message || 'unknown error'}`);
        } else {
            console.log(`📝 Other message: ${JSON.stringify(message, null, 2)}`);
        }
    } catch (e) {
        console.log(`❌ Failed to parse message: ${data}`);
    }
});

ws.on('error', (err) => {
    console.log(`❌ WebSocket error: ${err.message}`);
    process.exit(1);
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
});

// Auto-close after 10 seconds
setTimeout(() => {
    console.log('⏱️  Test timeout - closing connection');
    ws.close();
}, 10000);

console.log('⏳ Connecting to daemon...');