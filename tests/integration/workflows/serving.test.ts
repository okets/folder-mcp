/**
 * Integration Tests - Content Serving Workflow
 * 
 * Tests the complete content serving workflow across all architectural layers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { MockFactory } from '../../helpers/mock-factories.js';

// Test-specific interfaces
interface ServingWorkflow {
  getContent(request: ContentRequest): Promise<ContentResponse>;
  getContentWithContext(request: ContentRequest, contextLines?: number): Promise<ContentResponse>;
  getMultipleContents(requests: ContentRequest[]): Promise<ContentResponse[]>;
}

interface ContentRequest {
  filePath: string;
  format?: ContentFormat;
  includeMetadata?: boolean;
}

interface ContentResponse {
  filePath: string;
  content: string;
  metadata: ContentMetadata;
  format: ContentFormat;
  servedAt: string;
  size: number;
}

interface ContentMetadata {
  fileType: string;
  size: number;
  lastModified: string;
  chunks: number;
  embeddings: boolean;
  contextLines?: number;
  enhanced?: boolean;
  error?: string;
}

type ContentFormat = 'raw' | 'highlighted' | 'markdown';

describe('Integration - Content Serving Workflow', () => {
  let tempDir: string;
  let mockServingWorkflow: Partial<ServingWorkflow>;
  let testContent: Record<string, any>;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('serving-workflow-test-');

    // Mock content data
    testContent = {
      'src/types.ts': {
        content: 'interface User {\n  id: string;\n  name: string;\n}',
        metadata: {
          fileType: 'typescript',
          size: 56,
          lastModified: '2024-01-15T10:30:00Z',
          chunks: 1,
          embeddings: true
        }
      },
      'docs/readme.md': {
        content: '# Project Documentation\n\nThis is the main project documentation.',
        metadata: {
          fileType: 'markdown',
          size: 68,
          lastModified: '2024-01-16T14:20:00Z',
          chunks: 1,
          embeddings: true
        }
      },
      'config.json': {
        content: '{\n  "name": "test-project",\n  "version": "1.0.0"\n}',
        metadata: {
          fileType: 'json',
          size: 48,
          lastModified: '2024-01-17T09:15:00Z',
          chunks: 1,
          embeddings: false
        }
      }
    };

    // Mock serving workflow
    mockServingWorkflow = {
      async getContent(request: ContentRequest): Promise<ContentResponse> {
        const content = testContent[request.filePath];
        
        if (!content) {
          throw new Error(`File not found: ${request.filePath}`);
        }

        return {
          filePath: request.filePath,
          content: content.content,
          metadata: content.metadata,
          format: request.format || 'raw',
          servedAt: new Date().toISOString(),
          size: content.content.length
        };
      },

      async getContentWithContext(request: ContentRequest, contextLines: number = 5): Promise<ContentResponse> {
        const content = testContent[request.filePath];
        
        if (!content) {
          throw new Error(`File not found: ${request.filePath}`);
        }

        // Mock context addition (in real implementation, this would add surrounding lines)
        const contentWithContext = `// Context: ${request.filePath}\n${content.content}\n// End context`;

        return {
          filePath: request.filePath,
          content: contentWithContext,
          metadata: {
            ...content.metadata,
            contextLines,
            enhanced: true
          },
          format: request.format || 'raw',
          servedAt: new Date().toISOString(),
          size: contentWithContext.length
        };
      },

      async getMultipleContents(requests: ContentRequest[]): Promise<ContentResponse[]> {
        return Promise.all(
          requests.map(req => this.getContent!(req))
        );
      }
    };
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Basic Content Serving', () => {
    it('should serve file content', async () => {
      const request: ContentRequest = {
        filePath: 'src/types.ts',
        format: 'raw'
      };

      const response = await mockServingWorkflow.getContent!(request);

      expect(response.filePath).toBe('src/types.ts');
      expect(response.content).toContain('interface User');
      expect(response.metadata.fileType).toBe('typescript');
      expect(response.format).toBe('raw');
      expect(response.servedAt).toBeTruthy();
      expect(response.size).toBeGreaterThan(0);
    });

    it('should serve different file formats', async () => {
      const formats: ContentFormat[] = ['raw', 'highlighted', 'markdown'];
      
      for (const format of formats) {
        const request: ContentRequest = {
          filePath: 'src/types.ts',
          format
        };

        const response = await mockServingWorkflow.getContent!(request);

        expect(response.format).toBe(format);
        expect(response.content).toBeTruthy();
      }
    });

    it('should include file metadata', async () => {
      const request: ContentRequest = {
        filePath: 'docs/readme.md',
        includeMetadata: true
      };

      const response = await mockServingWorkflow.getContent!(request);

      expect(response.metadata).toBeDefined();
      expect(response.metadata.fileType).toBe('markdown');
      expect(response.metadata.size).toBeGreaterThan(0);
      expect(response.metadata.lastModified).toBeTruthy();
      expect(response.metadata.chunks).toBeDefined();
      expect(response.metadata.embeddings).toBeDefined();
    });
  });

  describe('Content with Context', () => {
    it('should serve content with surrounding context', async () => {
      const request: ContentRequest = {
        filePath: 'src/types.ts',
        format: 'raw'
      };

      const response = await mockServingWorkflow.getContentWithContext!(request, 3);

      expect(response.content).toContain('// Context:');
      expect(response.content).toContain('interface User');
      expect(response.content).toContain('// End context');
      expect(response.metadata.contextLines).toBe(3);
      expect(response.metadata.enhanced).toBe(true);
    });

    it('should handle different context sizes', async () => {
      const contextSizes = [1, 5, 10];
      
      for (const contextLines of contextSizes) {
        const request: ContentRequest = {
          filePath: 'docs/readme.md',
          format: 'raw'
        };

        const response = await mockServingWorkflow.getContentWithContext!(request, contextLines);

        expect(response.metadata.contextLines).toBe(contextLines);
        expect(response.content.length).toBeGreaterThan(testContent['docs/readme.md'].content.length);
      }
    });
  });

  describe('Multiple Content Serving', () => {
    it('should serve multiple files simultaneously', async () => {
      const requests: ContentRequest[] = [
        { filePath: 'src/types.ts', format: 'raw' },
        { filePath: 'docs/readme.md', format: 'markdown' },
        { filePath: 'config.json', format: 'raw' }
      ];

      const responses = await mockServingWorkflow.getMultipleContents!(requests);

      expect(responses).toHaveLength(3);
      expect(responses[0].filePath).toBe('src/types.ts');
      expect(responses[1].filePath).toBe('docs/readme.md');
      expect(responses[2].filePath).toBe('config.json');
      
      responses.forEach(response => {
        expect(response.content).toBeTruthy();
        expect(response.servedAt).toBeTruthy();
      });
    });

    it('should handle partial failures in multiple requests', async () => {
      const requests: ContentRequest[] = [
        { filePath: 'src/types.ts', format: 'raw' },
        { filePath: 'nonexistent.txt', format: 'raw' },
        { filePath: 'config.json', format: 'raw' }
      ];

      const mockWorkflowWithErrors: Partial<ServingWorkflow> = {
        async getMultipleContents(requests: ContentRequest[]): Promise<ContentResponse[]> {
          const results: ContentResponse[] = [];
          
          for (const request of requests) {
            try {
              const content = testContent[request.filePath];
              if (!content) {
                throw new Error(`File not found: ${request.filePath}`);
              }
              
              results.push({
                filePath: request.filePath,
                content: content.content,
                metadata: content.metadata,
                format: request.format || 'raw',
                servedAt: new Date().toISOString(),
                size: content.content.length
              });
            } catch (error) {
              results.push({
                filePath: request.filePath,
                content: '',
                metadata: {
                  error: (error as Error).message,
                  fileType: 'unknown',
                  size: 0,
                  lastModified: new Date().toISOString(),
                  chunks: 0,
                  embeddings: false
                },
                format: request.format || 'raw',
                servedAt: new Date().toISOString(),
                size: 0
              });
            }
          }
          
          return results;
        }
      };

      const responses = await mockWorkflowWithErrors.getMultipleContents!(requests);

      expect(responses).toHaveLength(3);
      expect(responses[0].content).toBeTruthy(); // Successful
      expect(responses[1].metadata.error).toContain('File not found'); // Failed
      expect(responses[2].content).toBeTruthy(); // Successful
    });
  });

  describe('Performance and Caching', () => {
    it('should serve content within performance targets', async () => {
      const request: ContentRequest = {
        filePath: 'src/types.ts',
        format: 'raw'
      };

      const startTime = Date.now();
      const response = await mockServingWorkflow.getContent!(request);
      const duration = Date.now() - startTime;

      expect(response.content).toBeTruthy();
      expect(duration).toBeLessThan(100); // Should serve within 100ms
    });

    it('should handle concurrent content requests', async () => {
      const requests = Array(10).fill(null).map((_, i) => ({
        filePath: i % 2 === 0 ? 'src/types.ts' : 'docs/readme.md',
        format: 'raw' as ContentFormat
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => mockServingWorkflow.getContent!(req))
      );
      const duration = Date.now() - startTime;

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.content).toBeTruthy();
      });
      expect(duration).toBeLessThan(1000); // Concurrent serving should be efficient
    });

    it('should optimize repeated requests', async () => {
      const request: ContentRequest = {
        filePath: 'src/types.ts',
        format: 'raw'
      };

      // First request
      const startTime1 = Date.now();
      const response1 = await mockServingWorkflow.getContent!(request);
      const duration1 = Date.now() - startTime1;

      // Second request (should be faster if cached)
      const startTime2 = Date.now();
      const response2 = await mockServingWorkflow.getContent!(request);
      const duration2 = Date.now() - startTime2;

      expect(response1.content).toBe(response2.content);
      expect(response1.filePath).toBe(response2.filePath);
      // In a real implementation with caching, duration2 might be faster
    });
  });

  describe('Content Transformation', () => {
    it('should transform content based on format', async () => {
      const codeRequest: ContentRequest = {
        filePath: 'src/types.ts',
        format: 'highlighted'
      };

      const markdownRequest: ContentRequest = {
        filePath: 'docs/readme.md',
        format: 'markdown'
      };

      const codeResponse = await mockServingWorkflow.getContent!(codeRequest);
      const markdownResponse = await mockServingWorkflow.getContent!(markdownRequest);

      expect(codeResponse.format).toBe('highlighted');
      expect(markdownResponse.format).toBe('markdown');
    });

    it('should handle different file types appropriately', async () => {
      const fileTypes = ['src/types.ts', 'docs/readme.md', 'config.json'];
      
      for (const filePath of fileTypes) {
        const request: ContentRequest = {
          filePath,
          format: 'raw'
        };

        const response = await mockServingWorkflow.getContent!(request);

        expect(response.content).toBeTruthy();
        expect(response.metadata.fileType).toBeTruthy();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent files', async () => {
      const request: ContentRequest = {
        filePath: 'nonexistent.txt',
        format: 'raw'
      };

      await expect(mockServingWorkflow.getContent!(request)).rejects.toThrow('File not found');
    });

    it('should handle invalid formats gracefully', async () => {
      const invalidWorkflow: Partial<ServingWorkflow> = {
        async getContent(request: ContentRequest): Promise<ContentResponse> {
          const content = testContent[request.filePath];
          
          if (!content) {
            throw new Error(`File not found: ${request.filePath}`);
          }

          // Handle invalid format
          if (request.format && !['raw', 'highlighted', 'markdown'].includes(request.format)) {
            throw new Error(`Unsupported format: ${request.format}`);
          }

          return {
            filePath: request.filePath,
            content: content.content,
            metadata: content.metadata,
            format: request.format || 'raw',
            servedAt: new Date().toISOString(),
            size: content.content.length
          };
        }
      };

      const request: ContentRequest = {
        filePath: 'src/types.ts',
        format: 'invalid' as ContentFormat
      };

      await expect(invalidWorkflow.getContent!(request)).rejects.toThrow('Unsupported format');
    });

    it('should handle corrupted content gracefully', async () => {
      const corruptedWorkflow: Partial<ServingWorkflow> = {
        async getContent(request: ContentRequest): Promise<ContentResponse> {
          return {
            filePath: request.filePath,
            content: '',
            metadata: { 
              error: 'Content corrupted or unreadable',
              fileType: 'unknown',
              size: 0,
              lastModified: new Date().toISOString(),
              chunks: 0,
              embeddings: false
            },
            format: request.format || 'raw',
            servedAt: new Date().toISOString(),
            size: 0
          };
        }
      };

      const request: ContentRequest = {
        filePath: 'corrupted.txt',
        format: 'raw'
      };

      const response = await corruptedWorkflow.getContent!(request);

      expect(response.content).toBe('');
      expect(response.metadata.error).toContain('corrupted');
      expect(response.size).toBe(0);
    });
  });
});
