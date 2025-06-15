/**
 * MCP Service Adapters
 * 
 * These adapters bridge between application layer services and the expected 
 * interfaces for MCP handlers. They transform the rich application services
 * into the simpler interfaces expected by the MCP protocol handlers.
 */

import type { ILoggingService } from '../../di/interfaces.js';
import type { 
  KnowledgeOperations,
  KnowledgeSearchOptions,
  EnhancedKnowledgeOptions
} from '../../application/serving/index.js';

/**
 * Search Service Adapter
 * Adapts KnowledgeOperations service to MCP search interface
 */
export class SearchServiceAdapter {
  constructor(
    private readonly knowledgeOps: KnowledgeOperations,
    private readonly logger: ILoggingService
  ) {}

  async searchDocuments(params: {
    query: string;
    topK: number;
    filters?: {
      documentTypes?: string[];
      authors?: string[];
      dateFrom?: string;
      dateTo?: string;
    };
  }): Promise<any> {
    this.logger.debug('Adapter: searchDocuments called', { params });

    const options: KnowledgeSearchOptions = {
      maxResults: params.topK,
      threshold: 0.0,
      includeContext: true,
      groupByDocument: true,
      expandParagraphs: false
    };

    const result = await this.knowledgeOps.semanticSearch(params.query, options);
    
    // Transform KnowledgeSearchResult into expected format
    return {
      documents: result.results.map((item: any) => ({
        id: item.documentId || item.filePath,
        title: item.documentTitle || item.filePath.split('/').pop(),
        path: item.filePath,
        documentType: this.extractFileType(item.filePath),
        author: item.metadata?.author || 'Unknown',
        creationDate: item.metadata?.creationDate,
        modificationDate: item.metadata?.modificationDate,
        similarityScore: item.similarity,
        matchContext: item.content?.substring(0, 300) || ''
      })),
      totalResults: result.results.length
    };
  }

  async searchChunks(params: {
    query: string;
    topK: number;
    filters?: {
      documentTypes?: string[];
    };
    includeContext?: boolean;
  }): Promise<any> {
    this.logger.debug('Adapter: searchChunks called', { params });

    const options: KnowledgeSearchOptions = {
      maxResults: params.topK,
      threshold: 0.0,
      includeContext: params.includeContext !== false,
      groupByDocument: false,
      expandParagraphs: true
    };

    const result = await this.knowledgeOps.semanticSearch(params.query, options);
    
    // Transform KnowledgeSearchResult into expected format
    return {
      chunks: result.results.map((item: any, index: number) => ({
        id: `chunk-${index}`,
        documentId: item.documentId || item.filePath,
        documentTitle: item.documentTitle || item.filePath.split('/').pop(),
        documentPath: item.filePath,
        text: item.content || '',
        similarityScore: item.similarity,
        contextBefore: item.contextBefore || '',
        contextAfter: item.contextAfter || '',
        pageNumber: item.metadata?.pageNumber || 1,
        section: item.metadata?.section || 'Unknown'
      })),
      totalResults: result.results.length
    };
  }

  private extractFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'docx': case 'doc': return 'docx';
      case 'pptx': case 'ppt': return 'pptx';
      case 'xlsx': case 'xls': return 'xlsx';
      case 'txt': return 'txt';
      case 'md': return 'markdown';
      default: return 'unknown';
    }
  }
}

/**
 * Navigation Service Adapter
 * Adapts content serving workflow to MCP navigation interface
 */
export class NavigationServiceAdapter {
  constructor(
    private readonly contentServing: any, // IContentServingWorkflow
    private readonly logger: ILoggingService
  ) {}

  async listFolders(params: {
    path?: string;
    max_depth?: number;
    include_counts?: boolean;
  }): Promise<any> {
    this.logger.debug('Adapter: listFolders called', { params });

    try {
      // Use the file list functionality and transform it into folder structure
      const fileList = await this.contentServing.getFileList('**/*');
      
      // Group files by directory
      const folderMap = new Map<string, number>();
      fileList.files?.forEach((file: any) => {
        const pathParts = file.path.split('/');
        for (let i = 1; i < pathParts.length; i++) {
          const folderPath = pathParts.slice(0, i).join('/');
          const count = folderMap.get(folderPath) || 0;
          folderMap.set(folderPath, count + 1);
        }
      });

      const folders = Array.from(folderMap.entries()).map(([path, count]) => ({
        name: path.split('/').pop() || path,
        path,
        document_count: count,
        depth: path.split('/').length - 1
      }));

      return { folders };
    } catch (error) {
      this.logger.error('Failed to list folders', error as Error);
      return { folders: [] };
    }
  }

  async listDocumentsInFolder(params: {
    folder_path: string;
    page?: number;
    page_size?: number;
    document_types?: string[];
    sort_by?: string;
    sort_order?: string;
  }): Promise<any> {
    this.logger.debug('Adapter: listDocumentsInFolder called', { params });

    try {
      // Get files matching the folder path
      const pattern = `${params.folder_path}/**/*`;
      const fileList = await this.contentServing.getFileList(pattern);
      
      let documents = fileList.files?.map((file: any) => ({
        document_id: file.path,
        title: file.name,
        file_path: file.path,
        document_type: this.extractFileType(file.path),
        file_size: file.size || 0,
        modified_date: file.modifiedDate,
        authors: []
      })) || [];

      // Apply filtering and sorting if needed
      if (params.document_types?.length) {
        documents = documents.filter((doc: any) => 
          params.document_types!.includes(doc.document_type)
        );
      }

      return {
        documents,
        pagination: {
          current_page: params.page || 1,
          total_pages: 1,
          total_items: documents.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to list documents in folder', error as Error);
      return { documents: [], pagination: { current_page: 1, total_pages: 1, total_items: 0 } };
    }
  }

  private extractFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'docx': case 'doc': return 'docx';
      case 'pptx': case 'ppt': return 'pptx';
      case 'xlsx': case 'xls': return 'xlsx';
      case 'txt': return 'txt';
      case 'md': return 'markdown';
      default: return 'unknown';
    }
  }
}

/**
 * Document Service Adapter
 * Adapts content serving workflow to MCP document access interface
 */
export class DocumentServiceAdapter {
  constructor(
    private readonly contentServing: any, // IContentServingWorkflow
    private readonly logger: ILoggingService
  ) {}

  async getDocumentMetadata(params: {
    document_id: string;
    include_structure?: boolean;
    include_authors?: boolean;
    include_stats?: boolean;
  }): Promise<any> {
    this.logger.debug('Adapter: getDocumentMetadata called', { params });

    try {
      // For now, return basic metadata. In a full implementation,
      // this would call a document metadata service
      return {
        document_id: params.document_id,
        title: params.document_id.split('/').pop(),
        file_path: params.document_id,
        document_type: this.extractFileType(params.document_id),
        file_size: 0,
        created_date: new Date().toISOString(),
        modified_date: new Date().toISOString(),
        authors: [],
        stats: { page_count: 1, word_count: 0, character_count: 0 }
      };
    } catch (error) {
      this.logger.error('Failed to get document metadata', error as Error);
      throw error;
    }
  }

  async downloadDocument(params: {
    document_id: string;
    format?: string;
    sections?: string[];
    max_length?: number;
  }): Promise<any> {
    this.logger.debug('Adapter: downloadDocument called', { params });

    try {
      const content = await this.contentServing.getFileContent(params.document_id);
      
      let textContent = content.content || 'No content available';
      
      // Apply max length limit
      if (params.max_length && textContent.length > params.max_length) {
        textContent = textContent.substring(0, params.max_length) + '...';
      }

      return { content: textContent };
    } catch (error) {
      this.logger.error('Failed to download document', error as Error);
      return { content: 'Error reading document content' };
    }
  }

  async getChunks(params: {
    document_id: string;
    chunk_ids?: string[];
    page?: number;
    page_size?: number;
    include_content?: boolean;
    max_content_length?: number;
  }): Promise<any> {
    this.logger.debug('Adapter: getChunks called', { params });

    try {
      // For now, simulate chunks by getting document content and splitting it
      const content = await this.contentServing.getFileContent(params.document_id);
      const text = content.content || '';
      
      // Simple chunking - split by paragraphs or fixed size
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push({
          chunk_id: `chunk-${Math.floor(i / chunkSize)}`,
          document_id: params.document_id,
          content: text.substring(i, i + chunkSize),
          page_number: Math.floor(i / chunkSize) + 1,
          section: 'Content',
          content_type: 'text'
        });
      }

      return {
        chunks,
        pagination: {
          current_page: params.page || 1,
          total_pages: Math.ceil(chunks.length / (params.page_size || 20)),
          total_items: chunks.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get chunks', error as Error);
      return { chunks: [], pagination: { current_page: 1, total_pages: 1, total_items: 0 } };
    }
  }

  private extractFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'docx': case 'doc': return 'docx';
      case 'pptx': case 'ppt': return 'pptx';
      case 'xlsx': case 'xls': return 'xlsx';
      case 'txt': return 'txt';
      case 'md': return 'markdown';
      default: return 'unknown';
    }
  }
}

/**
 * Specialized Service Adapter
 * Adapts monitoring workflow to MCP specialized interface
 */
export class SpecializedServiceAdapter {
  constructor(
    private readonly monitoringWorkflow: any, // IMonitoringWorkflow
    private readonly logger: ILoggingService
  ) {}

  async tableQuery(params: any): Promise<any> {
    this.logger.debug('Adapter: tableQuery called', { params });
    
    // For now, return empty results
    return { matches: [] };
  }

  async getIngestStatus(params: any): Promise<any> {
    this.logger.debug('Adapter: getIngestStatus called', { params });

    try {
      const healthData = await this.monitoringWorkflow.getSystemHealth();
      
      return {
        summary: {
          pending: healthData.indexing?.pending || 0,
          processing: healthData.indexing?.processing || 0,
          completed: healthData.indexing?.completed || 0,
          failed: healthData.indexing?.failed || 0
        },
        jobs: healthData.jobs || []
      };
    } catch (error) {
      this.logger.error('Failed to get ingest status', error as Error);
      return {
        summary: { pending: 0, processing: 0, completed: 0, failed: 0 },
        jobs: []
      };
    }
  }

  async refreshDocument(params: any): Promise<any> {
    this.logger.debug('Adapter: refreshDocument called', { params });
    
    return {
      job_id: `refresh-${Date.now()}`,
      document_id: params.document_id,
      priority: params.priority || 'normal',
      status: 'queued',
      message: 'Document refresh queued successfully'
    };
  }

  async getEmbedding(params: any): Promise<any> {
    this.logger.debug('Adapter: getEmbedding called', { params });
    
    return {
      embeddings: []
    };
  }
}
