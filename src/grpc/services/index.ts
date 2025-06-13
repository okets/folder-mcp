/**
 * Service Implementations Index
 * 
 * Exports all gRPC service implementations using DI-compliant factory functions
 */

import { IDependencyContainer } from '../../di/interfaces.js';
import { SearchService } from './search-service.js';
import { NavigationService } from './navigation-service.js';
import { DocumentService } from './document-service.js';
import { SummaryService } from './summary-service.js';
import { SpecializedService } from './specialized-service.js';
import { HealthService } from './health-service.js';
import { AuthInterceptor } from '../auth/index.js';

/**
 * Factory function for creating SearchService
 */
export function createSearchService(container: IDependencyContainer, authInterceptor?: AuthInterceptor): SearchService {
  return new SearchService(container, authInterceptor);
}

/**
 * Factory function for creating NavigationService
 */
export function createNavigationService(container: IDependencyContainer, authInterceptor?: AuthInterceptor): NavigationService {
  return new NavigationService(container, authInterceptor);
}

/**
 * Factory function for creating DocumentService
 */
export function createDocumentService(container: IDependencyContainer, authInterceptor?: AuthInterceptor): DocumentService {
  return new DocumentService(container, authInterceptor);
}

/**
 * Factory function for creating SummaryService
 */
export function createSummaryService(container: IDependencyContainer, authInterceptor?: AuthInterceptor): SummaryService {
  return new SummaryService(container, authInterceptor);
}

/**
 * Factory function for creating SpecializedService
 */
export function createSpecializedService(container: IDependencyContainer, authInterceptor?: AuthInterceptor): SpecializedService {
  return new SpecializedService(container, authInterceptor);
}

/**
 * Factory function for creating HealthService
 */
export function createHealthService(container: IDependencyContainer): HealthService {
  return new HealthService(container);
}

/**
 * Create all service implementations using DI-compliant factory functions
 */
export function createServiceImplementations(container: IDependencyContainer, authInterceptor?: AuthInterceptor): any {
  const searchService = createSearchService(container, authInterceptor);
  const navigationService = createNavigationService(container, authInterceptor);
  const documentService = createDocumentService(container, authInterceptor);
  const summaryService = createSummaryService(container, authInterceptor);
  const specializedService = createSpecializedService(container, authInterceptor);
  
  return {
    // Search services
    searchDocs: searchService.searchDocs.bind(searchService),
    searchChunks: searchService.searchChunks.bind(searchService),
    
    // Navigation services
    listFolders: navigationService.listFolders.bind(navigationService),
    listDocumentsInFolder: navigationService.listDocumentsInFolder.bind(navigationService),
    
    // Document services
    getDocMetadata: documentService.getDocMetadata.bind(documentService),
    downloadDoc: documentService.downloadDoc.bind(documentService),
    getChunks: documentService.getChunks.bind(documentService),
    
    // Summary services
    getDocSummary: summaryService.getDocSummary.bind(summaryService),
    batchDocSummary: summaryService.batchDocSummary.bind(summaryService),
    
    // Specialized services
    tableQuery: specializedService.tableQuery.bind(specializedService),
    ingestStatus: specializedService.ingestStatus.bind(specializedService),
    refreshDoc: specializedService.refreshDoc.bind(specializedService),
    getEmbedding: specializedService.getEmbedding.bind(specializedService)
  };
}
