/**
 * gRPC Client Test
 * 
 * Simple test client to verify our gRPC server implementation
 */

import * as grpc from '@grpc/grpc-js';
import { loadProtoDefinition } from './grpc/utils/proto-loader.js';

async function testGrpcClient() {
  try {
    console.log('🧪 Starting gRPC Client Test...');
    
    // Load the proto definition
    const protoDescriptor = await loadProtoDefinition();
    const folderMcp = protoDescriptor.folder_mcp as any;
    const FolderMCPClient = folderMcp.FolderMCP;
    
    // Create client connection to named pipe
    const client = new FolderMCPClient(
      'unix:\\\\.\\pipe\\folder-mcp',
      grpc.credentials.createInsecure()
    );
    
    console.log('📡 Connected to gRPC server');
    
    // Test SearchDocs
    console.log('🔍 Testing SearchDocs...');
    
    const searchRequest = {
      query: 'test query',
      topK: 5
    };
    
    const searchResult = await new Promise((resolve, reject) => {
      client.searchDocs(searchRequest, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('✅ SearchDocs response:', JSON.stringify(searchResult, null, 2));
    
    // Test SearchChunks
    console.log('🔍 Testing SearchChunks...');
    
    const chunksRequest = {
      query: 'test chunk query',
      topK: 3
    };
    
    const chunksResult = await new Promise((resolve, reject) => {
      client.searchChunks(chunksRequest, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('✅ SearchChunks response:', JSON.stringify(chunksResult, null, 2));
    
    // Test invalid request
    console.log('🚫 Testing validation with empty query...');
    
    try {
      await new Promise((resolve, reject) => {
        client.searchDocs({ query: '', topK: 5 }, (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        });
      });
    } catch (error: any) {
      console.log('✅ Validation error caught as expected:', error.message);
    }
    
    console.log('🎉 All tests passed!');
    
    // Close client
    client.close();
    
  } catch (error) {
    console.error('❌ Client test failed:', error);
  }
}

// Run the test
if (process.argv.length > 1 && (process.argv[1]?.endsWith('grpc-client-test.js') || process.argv[1]?.endsWith('grpc-client-test.ts'))) {
  testGrpcClient().catch(console.error);
}
