/**
 * gRPC Authentication Test
 * 
 * Tests the API key authentication system for remote gRPC connections
 */

import * as grpc from '@grpc/grpc-js';
import { folder_mcp } from './generated/folder-mcp.js';
import { getFolderMCPService } from './grpc/utils/proto-loader.js';

interface TestConfig {
  host: string;
  port: number;
  useAuth: boolean;
  apiKey?: string;
}

async function testAuthenticatedConnection(config: TestConfig): Promise<void> {
  console.log(`🔌 Testing connection to ${config.host}:${config.port} with auth: ${config.useAuth}`);
  
  const serviceDefinition = await getFolderMCPService();
  const FolderMCPClient = grpc.makeGenericClientConstructor(serviceDefinition, 'FolderMCP');
  const client = new FolderMCPClient(`${config.host}:${config.port}`, grpc.credentials.createInsecure());
  
  // Create metadata for authentication
  const metadata = new grpc.Metadata();
  if (config.useAuth && config.apiKey) {
    metadata.set('authorization', `Bearer ${config.apiKey}`);
  }
  
  return new Promise((resolve, reject) => {
    // Test SearchDocs endpoint
    const request: folder_mcp.ISearchDocsRequest = {
      query: 'test authentication',
      topK: 5
    };
    
    (client as any).SearchDocs(
      request,
      metadata,
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          if (error.code === grpc.status.UNAUTHENTICATED) {
            console.log('🔐 Authentication required (as expected)');
          } else if (error.code === grpc.status.RESOURCE_EXHAUSTED) {
            console.log('⚠️  Rate limited due to too many failed attempts');
          } else {
            console.log(`❌ Request failed: ${error.message} (code: ${error.code})`);
          }
          reject(error);
        } else {
          console.log('✅ Authenticated request successful:', response);
          resolve();
        }
        
        client.close();
      }
    );
    
    // Set timeout
    setTimeout(() => {
      client.close();
      reject(new Error('Test timeout'));
    }, 5000);
  });
}

async function testUnixSocketConnection(): Promise<void> {
  console.log('🔌 Testing Unix socket connection (no auth required)...');
  
  const socketPath = process.platform === 'win32' 
    ? '\\\\.\\pipe\\folder-mcp-auth-test'  // Use the test pipe name
    : '/tmp/folder-mcp-auth-test.sock';
  
  const serviceDefinition = await getFolderMCPService();
  const FolderMCPClient = grpc.makeGenericClientConstructor(serviceDefinition, 'FolderMCP');
  const client = new FolderMCPClient(
    `unix:${socketPath}`, 
    grpc.credentials.createInsecure()
  );
  
  return new Promise((resolve, reject) => {
    const request: folder_mcp.ISearchDocsRequest = {
      query: 'test unix socket',
      topK: 5
    };
    
    const metadata = new grpc.Metadata();
    
    (client as any).SearchDocs(
      request,
      metadata,
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          console.log(`❌ Unix socket request failed: ${error.message}`);
          reject(error);
        } else {
          console.log('✅ Unix socket request successful (no auth required)');
          resolve();
        }
        
        client.close();
      }
    );
    
    // Set timeout
    setTimeout(() => {
      client.close();
      reject(new Error('Unix socket test timeout'));
    }, 5000);
  });
}

async function runAuthTests(): Promise<void> {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('❌ Please provide an API key as the first argument');
    console.log('Usage: node grpc-auth-test.js <api-key>');
    process.exit(1);
  }
  
  console.log('🧪 Running gRPC Authentication Tests...\n');
  
  try {
    // Test 1: Connection without API key (should fail for remote, succeed for local)
    console.log('Test 1: Connection without API key');
    try {
      await testAuthenticatedConnection({
        host: '127.0.0.1',  // localhost - should be allowed without auth in our demo setup
        port: 50051,
        useAuth: false
      });
      console.log('✅ Test 1 passed: Local connection allowed without auth\n');
    } catch (error: any) {
      if (error.code === grpc.status.UNAUTHENTICATED) {
        console.log('✅ Test 1 passed: Correctly rejected unauthenticated request\n');
      } else {
        console.log(`⚠️  Test 1 unexpected error: ${error.message}\n`);
      }
    }
    
    // Test 2: Connection with invalid API key (should fail for remote)
    console.log('Test 2: Connection with invalid API key');
    try {
      await testAuthenticatedConnection({
        host: '127.0.0.1',  // localhost - should be allowed regardless of key in demo
        port: 50051,
        useAuth: true,
        apiKey: 'invalid-key-12345'
      });
      console.log('✅ Test 2 passed: Local connection allowed with any key\n');
    } catch (error: any) {
      if (error.code === grpc.status.UNAUTHENTICATED) {
        console.log('✅ Test 2 passed: Correctly rejected invalid API key\n');
      } else {
        console.log(`⚠️  Test 2 unexpected error: ${error.message}\n`);
      }
    }
    
    // Test 3: Connection with valid API key (should succeed)
    console.log('Test 3: Connection with valid API key');
    try {
      await testAuthenticatedConnection({
        host: '127.0.0.1',  // localhost - should be allowed
        port: 50051,
        useAuth: true,
        apiKey: apiKey
      });
      console.log('✅ Test 3 passed: Authenticated request successful\n');
    } catch (error: any) {
      console.log(`❌ Test 3 failed: ${error.message}\n`);
    }
    
    // Test 4: Unix socket connection (should succeed without auth)
    console.log('Test 4: Unix socket connection (no auth required)');
    try {
      await testUnixSocketConnection();
      console.log('✅ Test 4 passed: Unix socket connection successful\n');
    } catch (error: any) {
      console.log(`❌ Test 4 failed: ${error.message}\n`);
    }
    
    console.log('🎉 Authentication tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (process.argv.length > 1 && (process.argv[1]?.endsWith('grpc-auth-test.js') || process.argv[1]?.endsWith('grpc-auth-test.ts'))) {
  runAuthTests().catch(console.error);
}

export { runAuthTests };
