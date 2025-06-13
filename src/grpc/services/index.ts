/**
 * Service Implementations Index
 * 
 * Exports all gRPC service implementations
 */

import { IDependencyContainer } from '../../di/interfaces.js';
import { SearchService } from './search-service.js';
import { AuthInterceptor } from '../auth/index.js';

/**
 * Create all service implementations
 */
export function createServiceImplementations(container: IDependencyContainer, authInterceptor?: AuthInterceptor): any {
  const searchService = new SearchService(container, authInterceptor);
  
  return {
    // Search services
    searchDocs: searchService.searchDocs.bind(searchService),
    searchChunks: searchService.searchChunks.bind(searchService),
    
    // Navigation services
    listFolders: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    listDocumentsInFolder: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    
    // Document services
    getDocMetadata: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    downloadDoc: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    getChunks: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    
    // Summary services
    getDocSummary: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    batchDocSummary: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    
    // Specialized services
    tableQuery: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    ingestStatus: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    refreshDoc: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    },
    getEmbedding: async (call: any, callback: any) => {
      callback(new Error('Not implemented yet'));
    }
  };
}
