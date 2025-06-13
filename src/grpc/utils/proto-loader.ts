/**
 * Protocol Buffer Loading Utilities
 * 
 * Utilities for loading and working with protocol buffer definitions
 * in the gRPC server implementation.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join, dirname } from 'path';

// Proto loading options
const PROTO_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

// Path to the proto file - relative to the project root
const PROTO_PATH = join(process.cwd(), 'proto/folder-mcp.proto');

/**
 * Load the protocol buffer definition and return the service definition
 */
export async function loadProtoDefinition(): Promise<grpc.GrpcObject> {
  try {
    // Load the proto file
    const packageDefinition = await protoLoader.load(PROTO_PATH, PROTO_OPTIONS);
    
    // Load the gRPC service definition
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    
    return protoDescriptor;
  } catch (error) {
    throw new Error(`Failed to load proto definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the FolderMCP service definition from the loaded proto
 */
export async function getFolderMCPService(): Promise<grpc.ServiceDefinition> {
  const protoDescriptor = await loadProtoDefinition();
  
  // Navigate to the service definition
  const folderMcp = protoDescriptor.folder_mcp as any;
  if (!folderMcp || !folderMcp.FolderMCP) {
    throw new Error('FolderMCP service not found in proto definition');
  }
  
  return folderMcp.FolderMCP.service as grpc.ServiceDefinition;
}

/**
 * Type guard to check if an object is a gRPC service error
 */
export function isGrpcError(error: any): error is grpc.ServiceError {
  return error && typeof error.code === 'number' && typeof error.message === 'string';
}

/**
 * Create a gRPC error with the specified status code and message
 */
export function createGrpcError(
  code: grpc.status,
  message: string,
  details?: string
): grpc.ServiceError {
  const error = new Error(message) as grpc.ServiceError;
  error.code = code;
  error.details = details || '';
  error.metadata = new grpc.Metadata();
  
  return error;
}
