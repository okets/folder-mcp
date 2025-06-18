/**
 * User Story-Driven Tests for New MCP Endpoints
 * 
 * These tests implement the real-world user scenarios defined in the MCP Endpoint Redesign PRD.
 * Each test follows the TDD methodology: write failing tests first, then implement endpoints.
 * 
 * Focus: Real-world LLM-driven user stories that demonstrate practical usage patterns.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../helpers/setup.js';
import { MCPEndpoints, type IMCPEndpoints } from '../../../../src/interfaces/mcp/endpoints.js';
import type { 
  SearchRequest, SearchResponse,
  GetDocumentOutlineRequest, GetDocumentOutlineResponse,
  GetDocumentDataRequest, GetDocumentDataResponse,
  ListFoldersResponse, ListDocumentsRequest, ListDocumentsResponse,
  GetSheetDataRequest, GetSheetDataResponse,
  GetSlidesRequest, GetSlidesResponse,
  GetPagesRequest, GetPagesResponse,
  GetEmbeddingRequest, GetEmbeddingResponse,
  GetStatusRequest, GetStatusResponse
} from '../../../../src/interfaces/mcp/types.js';

// Import service interfaces for dependency injection
import type { 
  IVectorSearchService, 
  IFileParsingService, 
  IEmbeddingService,
  IFileSystemService,
  ILoggingService 
} from '../../../../src/di/interfaces.js';
import type { IFileSystem } from '../../../../src/domain/files/interfaces.js';

describe('MCP Endpoints - User Story Tests', () => {
  let testEnv: any;
  let endpoints: IMCPEndpoints;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    
    // Create mock services for testing
    const mockServices = createMockServices();
    
    // Create real MCPEndpoints instance with mocked dependencies
    endpoints = new MCPEndpoints(
      testEnv.folderPath,
      mockServices.vectorSearchService,
      mockServices.fileParsingService,
      mockServices.embeddingService,
      mockServices.fileSystemService,
      mockServices.fileSystem,
      mockServices.logger
    );
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  beforeEach(() => {
    // Reset any state between tests
  });

  describe('🔍 Search Endpoint', () => {
    describe('User Story 1: "Find last month\'s sales performance and analyze trends"', () => {
      test('Step 1: Search for sales data using semantic search', async () => {
        const response = await endpoints.search({
          query: "sales performance october 2024",
          mode: "semantic",
          scope: "documents"
        });

        expect(response.status.code).toBe('success');
        expect(response.data.results).toBeDefined();
        expect(response.data.results.length).toBeGreaterThan(0);
        
        // Should find sales report and board deck
        const documentIds = response.data.results.map(r => r.document_id);
        expect(documentIds).toContain('Sales_Pipeline.xlsx');
        expect(documentIds).toContain('Q4_Board_Deck.pptx');

        // Results should include rich metadata
        const firstResult = response.data.results[0];
        expect(firstResult).toMatchObject({
          document_id: expect.any(String),
          preview: expect.any(String),
          score: expect.any(Number),
          location: expect.objectContaining({
            sheet: expect.any(String)
          }),
          metadata: expect.objectContaining({
            document_type: expect.any(String)
          })
        });
      });

      test('Step 2: Search should respect token limits and provide pagination', async () => {
        const response = await endpoints.search({
          query: "financial performance",
          mode: "semantic",
          scope: "documents",
          max_tokens: 500 // Small limit to force pagination
        });

        expect(response.data.token_count).toBeLessThanOrEqual(500);
        expect(response.continuation).toBeDefined();
        
        if (response.continuation.has_more) {
          expect(response.continuation.token).toBeDefined();
          expect(response.actions).toContainEqual(
            expect.objectContaining({
              id: 'CONTINUE',
              description: expect.stringContaining('next batch')
            })
          );
        }
      });
    });

    describe('User Story 2: "Find all vendor contracts and check their expiration dates"', () => {
      test('Step 1: Search for contract patterns using regex', async () => {
        const response = await endpoints.search({
          query: "\\b(contract|agreement)\\b.*\\b(vendor|supplier)\\b",
          mode: "regex",
          scope: "chunks"
        });

        expect(response.status.code).toBe('success');
        expect(response.data.results).toBeDefined();
        
        // Should find vendor agreements with location data
        const contractResults = response.data.results.filter(r => 
          r.document_id.includes('Vendor_Agreement') || 
          r.document_id.includes('Supply_Contract')
        );
        expect(contractResults.length).toBeGreaterThan(0);

        // Each result should have precise location information
        contractResults.forEach(result => {
          expect(result.location).toBeDefined();
          expect(result.location.page).toBeTypeOf('number');
          expect(result.context).toBeDefined();
          expect(result.context.before).toBeTypeOf('string');
          expect(result.context.after).toBeTypeOf('string');
        });
      });

      test('Search with filters should limit scope correctly', async () => {
        const response = await endpoints.search({
          query: "contract",
          mode: "semantic",
          scope: "documents",
          filters: { 
            folder: "Legal/Contracts",
            fileType: "pdf"
          }
        });

        expect(response.status.code).toBe('success');
        response.data.results.forEach(result => {
          expect(result.metadata.document_type).toBe('pdf');
          // Document should be from Legal/Contracts folder
        });
      });
    });
  });

  describe('📄 Document Outline Endpoint', () => {
    describe('User Story: "What\'s in this 100-page report? I need the financial section"', () => {
      test('Step 1: Get PDF outline with bookmarks', async () => {
        const response = await endpoints.getDocumentOutline({
          document_id: "Annual_Report_2024.pdf"
        });

        expect(response).toMatchObject({
          type: "pdf",
          total_pages: expect.any(Number),
          bookmarks: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining("Financial"),
              page: expect.any(Number)
            })
          ]),
          file_size: expect.any(String)
        });

        // Should have structured navigation
        if (response.type === 'pdf') {
          expect(response.total_pages).toBeGreaterThan(50);
          expect(response.bookmarks.length).toBeGreaterThan(0);
        }
      });

      test('Get Excel outline with sheet information', async () => {
        const response = await endpoints.getDocumentOutline({
          document_id: "Q1_Budget.xlsx"
        });

        expect(response).toMatchObject({
          type: "xlsx",
          sheets: expect.arrayContaining([
            expect.objectContaining({
              name: "Summary",
              rows: expect.any(Number),
              columns: expect.any(Number)
            })
          ]),
          total_rows: expect.any(Number),
          file_size: expect.any(String)
        });

        // Should identify different sheet types
        if (response.type === 'xlsx') {
          const summarySheet = response.sheets.find(s => s.name === "Summary");
          expect(summarySheet).toBeDefined();
          expect(summarySheet!.rows).toBeGreaterThan(0);
        }
      });

      test('Get PowerPoint outline with slide titles', async () => {
        const response = await endpoints.getDocumentOutline({
          document_id: "Q4_Board_Deck.pptx"
        });

        expect(response).toMatchObject({
          type: "pptx",
          total_slides: expect.any(Number),
          slides: expect.arrayContaining([
            expect.objectContaining({
              number: 1,
              title: expect.any(String)
            })
          ]),
          file_size: expect.any(String)
        });

        if (response.type === 'pptx') {
          expect(response.total_slides).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('📊 Sheet Data Endpoint', () => {
    describe('User Story: "Analyze customer churn across sources"', () => {
      test('Step 1: Get Excel sheet data with headers and rows', async () => {
        const response = await endpoints.getSheetData({
          document_id: "Sales_Pipeline.xlsx",
          sheet_name: "Summary"
        });

        expect(response.status.code).toBe('success');
        expect(response.data).toMatchObject({
          headers: expect.arrayContaining([expect.any(String)]),
          rows: expect.arrayContaining([
            expect.arrayContaining([expect.any(String)])
          ]),
          token_count: expect.any(Number)
        });

        // Should contain financial data
        const flatData = [response.data.headers, ...response.data.rows].flat();
        expect(flatData.some(cell => 
          typeof cell === 'string' && cell.includes('$')
        )).toBe(true);
      });

      test('Step 2: Get CSV data without sheet specification', async () => {
        const response = await endpoints.getSheetData({
          document_id: "Customer_List.csv"
          // No sheet_name for CSV
        });

        expect(response.status.code).toBe('success');
        expect(response.data.headers).toBeDefined();
        expect(response.data.rows).toBeDefined();
      });

      test('CSV should reject sheet_name parameter', async () => {
        await expect(endpoints.getSheetData({
          document_id: "Customer_List.csv",
          sheet_name: "Sheet1" // This should cause an error
        })).rejects.toThrow('CSV files don\'t have multiple sheets');
      });

      test('Handle large datasets with pagination', async () => {
        const response = await endpoints.getSheetData({
          document_id: "Q4_Forecast.xlsx", // Large file with 5000+ rows
          sheet_name: "Data",
          max_tokens: 2000
        });

        expect(response.data.token_count).toBeLessThanOrEqual(2000);
        if (response.continuation.has_more) {
          expect(response.continuation.token).toBeDefined();
          expect(response.actions).toContainEqual(
            expect.objectContaining({
              id: 'CONTINUE',
              description: expect.stringContaining('next batch')
            })
          );
        }
      });

      test('Handle cell range specification', async () => {
        const response = await endpoints.getSheetData({
          document_id: "Q1_Budget.xlsx",
          sheet_name: "Summary",
          cell_range: "A1:D10"
        });

        expect(response.data.headers.length).toBeLessThanOrEqual(4);
        expect(response.data.rows.length).toBeLessThanOrEqual(9); // 10 rows minus header
      });
    });
  });

  describe('🎯 Slides Endpoint', () => {
    describe('User Story: "Create investor pitch from board presentations"', () => {
      test('Step 1: Extract specific slides with content and notes', async () => {
        const response = await endpoints.getSlides({
          document_id: "Q4_Board_Deck.pptx",
          slide_numbers: "1,5-8,15"
        });

        expect(response.status.code).toBe('success');
        expect(response.data.slides).toBeDefined();
        expect(response.data.total_slides).toBeGreaterThan(0);

        // Should extract specified slides
        const slideNumbers = response.data.slides.map(s => s.slide_number);
        expect(slideNumbers).toContain(1);
        expect(slideNumbers).toContain(5);
        expect(slideNumbers).toContain(15);

        // Each slide should have structured content
        response.data.slides.forEach(slide => {
          expect(slide).toMatchObject({
            slide_number: expect.any(Number),
            title: expect.any(String),
            content: expect.any(String),
            notes: expect.any(String)
          });
        });
      });

      test('Step 2: Get all slides when no range specified', async () => {
        const response = await endpoints.getSlides({
          document_id: "Product_Demo.pptx"
          // No slide_numbers = get all slides
        });

        expect(response.status.code).toBe('success');
        expect(response.data.slides.length).toBe(response.data.total_slides);
      });

      test('Handle token limits with slide pagination', async () => {
        const response = await endpoints.getSlides({
          document_id: "Q4_Board_Deck.pptx", // Large presentation
          max_tokens: 1500
        });

        expect(response.data.token_count).toBeLessThanOrEqual(1500);
        if (response.continuation.has_more) {
          expect(response.continuation.token).toBeDefined();
        }
      });
    });
  });

  describe('📄 Pages Endpoint', () => {
    describe('User Story: "Review legal sections in partner agreements"', () => {
      test('Step 1: Extract specific pages from PDF', async () => {
        const response = await endpoints.getPages({
          document_id: "Acme_Vendor_Agreement.pdf",
          page_range: "12-18" // Legal sections
        });

        expect(response.status.code).toBe('success');
        expect(response.data.pages).toBeDefined();
        expect(response.data.total_pages).toBeGreaterThan(0);

        // Should extract specified pages
        const pageNumbers = response.data.pages.map(p => p.page_number);
        expect(pageNumbers).toContain(12);
        expect(pageNumbers).toContain(18);

        // Each page should have content
        response.data.pages.forEach(page => {
          expect(page).toMatchObject({
            page_number: expect.any(Number),
            content: expect.any(String)
          });
          expect(page.content.length).toBeGreaterThan(0);
        });
      });

      test('Step 2: Handle single page extraction', async () => {
        const response = await endpoints.getPages({
          document_id: "single_page.pdf",
          page_range: "1"
        });

        expect(response.status.code).toBe('success');
        expect(response.data.pages.length).toBe(1);
        expect(response.data.pages[0].page_number).toBe(1);
      });

      test('Handle all pages when no range specified', async () => {
        const response = await endpoints.getPages({
          document_id: "Remote_Work_Policy.docx"
          // No page_range = get all pages
        });

        expect(response.status.code).toBe('success');
        expect(response.data.pages.length).toBe(response.data.total_pages);
      });

      test('Handle token limits with page continuation', async () => {
        const response = await endpoints.getPages({
          document_id: "Annual_Report_2024.pdf", // Large document
          max_tokens: 2000
        });

        expect(response.data.token_count).toBeLessThanOrEqual(2000);
        
        // Should always return at least one page even if it exceeds token limit
        expect(response.data.pages.length).toBeGreaterThanOrEqual(1);
        
        if (response.data.token_count > 1900) { // Close to limit
          expect(response.status.code).toBe('partial_success');
          expect(response.status.message).toBe('TOKEN_LIMIT_EXCEEDED_BUT_INCLUDED');
          expect(response.actions).toContainEqual(
            expect.objectContaining({
              id: 'INCREASE_LIMIT',
              description: expect.stringContaining('higher token limit')
            })
          );
        }
      });
    });
  });

  describe('📁 List Folders/Documents Endpoints', () => {
    describe('User Story: "Find all Q4 financial documents by department"', () => {
      test('Step 1: Explore folder structure', async () => {
        const response = await endpoints.listFolders();

        expect(response).toMatchObject({
          data: {
            folders: expect.arrayContaining([
              "Finance",
              "Sales", 
              "Marketing",
              "Legal",
              "Engineering"
            ])
          }
        });
      });

      test('Step 2: List documents in specific folder', async () => {
        const response = await endpoints.listDocuments({
          folder: "Finance/2024/Q4"
        });

        expect(response.status.code).toBe('success');
        expect(response.data.documents).toBeDefined();
        
        response.data.documents.forEach(doc => {
          expect(doc).toMatchObject({
            name: expect.any(String),
            document_id: expect.any(String),
            modified: expect.any(String)
          });
        });
      });

      test('Handle large folder listings with pagination', async () => {
        const response = await endpoints.listDocuments({
          folder: "test-edge-cases",
          max_tokens: 500
        });

        expect(response.data.token_count).toBeLessThanOrEqual(500);
        if (response.continuation.has_more) {
          expect(response.continuation.token).toBeDefined();
        }
      });
    });
  });

  describe('🧠 Embedding Endpoint', () => {
    describe('User Story: Advanced agent needs custom similarity comparison', () => {
      test('Return embedding vector for external text', async () => {
        const response = await endpoints.getEmbedding({
          text: "Quarterly revenue is up"
        });

        expect(response).toMatchObject({
          embedding: expect.arrayContaining([expect.any(Number)])
        });

        // Should be a valid embedding vector
        expect(response.embedding.length).toBeGreaterThan(100); // Typical embedding size
        expect(response.embedding.every(n => typeof n === 'number')).toBe(true);
      });
    });
  });

  describe('🔄 Status Endpoint', () => {
    describe('User Story: "Analyze newly added competitive intelligence"', () => {
      test('Step 1: Check overall processing status', async () => {
        const response = await endpoints.getStatus();

        expect(response).toMatchObject({
          status: expect.stringMatching(/^(ready|processing|error)$/),
          progress: expect.any(Number),
          message: expect.any(String)
        });

        expect(response.progress).toBeGreaterThanOrEqual(0);
        expect(response.progress).toBeLessThanOrEqual(100);
      });

      test('Step 2: Check specific document status', async () => {
        const response = await endpoints.getStatus({
          document_id: "Annual_Report_2024.pdf"
        });

        expect(response).toMatchObject({
          status: expect.stringMatching(/^(ready|processing|error)$/),
          progress: expect.any(Number),
          message: expect.any(String)
        });
      });
    });
  });

  describe('📄 Document Data Endpoint', () => {
    describe('User Story: "Research company\'s remote work policy"', () => {
      test('Get raw content from text documents', async () => {
        const response = await endpoints.getDocumentData({
          document_id: "README.md",
          format: "raw"
        });

        expect(response).toMatchObject({
          data: {
            content: expect.any(String),
            token_count: expect.any(Number)
          },
          status: {
            code: 'success'
          }
        });
      });

      test('Get chunked content for analysis', async () => {
        const response = await endpoints.getDocumentData({
          document_id: "Remote_Work_Policy.docx",
          format: "chunks"
        });

        expect(response.data).toMatchObject({
          chunks: expect.arrayContaining([
            expect.objectContaining({
              chunk_id: expect.any(String),
              content: expect.any(String),
              metadata: expect.any(Object)
            })
          ]),
          token_count: expect.any(Number)
        });
      });

      test('Get metadata without content', async () => {
        const response = await endpoints.getDocumentData({
          document_id: "Q4_Board_Deck.pptx",
          format: "metadata"
        });

        expect(response.data).toMatchObject({
          metadata: expect.objectContaining({
            title: expect.any(String),
            created: expect.any(String),
            document_type: 'pptx'
          }),
          token_count: expect.any(Number)
        });
      });
    });
  });

  describe('🔧 Standard Response Structure', () => {
    test('All endpoints follow standard response format', async () => {
      const endpoints_with_tokens = [
        () => endpoints.search({ query: "test", mode: "semantic", scope: "documents" }),
        () => endpoints.listDocuments({ folder: "Finance" }),
        () => endpoints.getSheetData({ document_id: "Q1_Budget.xlsx", sheet_name: "Summary" }),
        () => endpoints.getSlides({ document_id: "Q4_Board_Deck.pptx" }),
        () => endpoints.getPages({ document_id: "Annual_Report_2024.pdf" }),
        () => endpoints.getDocumentData({ document_id: "README.md", format: "raw" })
      ];

      for (const endpointCall of endpoints_with_tokens) {
        const response = await endpointCall();
        
        // Standard structure validation
        expect(response).toMatchObject({
          data: expect.objectContaining({
            token_count: expect.any(Number)
          }),
          status: expect.objectContaining({
            code: expect.stringMatching(/^(success|partial_success|error)$/),
            message: expect.any(String)
          }),
          continuation: expect.objectContaining({
            has_more: expect.any(Boolean)
          })
        });

        // If has_more is true, token should be present
        if (response.continuation.has_more) {
          expect(response.continuation.token).toBeDefined();
          expect(response.actions).toBeDefined();
          if (response.actions) {
            expect(response.actions.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('Continuation tokens are properly formatted', async () => {
      const response = await endpoints.getPages({
        document_id: "Annual_Report_2024.pdf",
        max_tokens: 500 // Force pagination
      });

      if (response.continuation.has_more) {
        const token = response.continuation.token;
        
        // Should be base64url encoded
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
        
        // Should be decodable
        if (token) {
          const decoded = Buffer.from(token, 'base64url').toString('utf8');
          const parsed = JSON.parse(decoded);
          
          expect(parsed).toMatchObject({
            document_id: expect.any(String),
            page: expect.any(Number),
            type: expect.any(String)
          });
        }
      }
    });
  });

  describe('🚨 Edge Cases', () => {
    test('Handle empty files gracefully', async () => {
      const response = await endpoints.getDocumentData({
        document_id: "empty.txt",
        format: "raw"
      });

      expect(response.status.code).toBe('success');
      expect(response.data.content).toBe('');
    });

    test('Handle unicode filenames', async () => {
      const response = await endpoints.getDocumentData({
        document_id: "special_chars_文件名.txt",
        format: "raw"
      });

      expect(response.status.code).toBe('success');
    });

    test('Handle corrupted files', async () => {
      await expect(endpoints.getSheetData({
        document_id: "corrupted.xlsx",
        sheet_name: "Sheet1"
      })).rejects.toThrow();
    });

    test('First item exceeds token limit but is included', async () => {
      const response = await endpoints.getPages({
        document_id: "huge_text.txt",
        max_tokens: 100 // Very small limit
      });

      expect(response.status.code).toBe('partial_success');
      expect(response.status.message).toBe('TOKEN_LIMIT_EXCEEDED_BUT_INCLUDED');
      expect(response.data.pages.length).toBe(1); // Still returns one page
      expect(response.actions).toContainEqual(
        expect.objectContaining({
          id: 'INCREASE_LIMIT',
          description: expect.stringContaining('higher token limit')
        })
      );
    });
  });
});

// Mock implementation for TDD - will be replaced with real implementation in Task 5
/**
 * Create mock services for testing endpoints
 * These mocks provide the necessary dependencies for MCPEndpoints
 */
function createMockServices() {
  const mockLogger: ILoggingService = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    setLevel: () => {}
  };

  const mockVectorSearchService: IVectorSearchService = {
    search: async () => [],
    generateEmbedding: async () => new Array(384).fill(0)
  } as any;

  const mockFileParsingService: IFileParsingService = {
    parseFile: async (filePath: string, fileType: string) => {
      // Create mock parsed content based on file type
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
      const type = fileType.startsWith('.') ? fileType.substring(1) : fileType;
      
      // Handle empty files edge case
      if (fileName === 'empty.txt' || filePath.includes('empty.txt')) {
        return {
          content: '',
          type: 'txt',
          originalPath: filePath,
          metadata: {
            originalPath: filePath,
            type: 'txt',
            size: 0,
            lastModified: new Date().toISOString(),
            lines: 0,
            encoding: 'utf-8'
          } as any
        };
      }
      
      // Handle huge file edge case for token limit testing
      if (fileName === 'huge_text.txt' || filePath.includes('huge_text.txt')) {
        const hugeContent = 'This is a very long document with extremely detailed content that contains many paragraphs and sections. '.repeat(100);
        return {
          content: hugeContent,
          type: 'txt',
          originalPath: filePath,
          pages: [
            {
              content: hugeContent  // Very large content that exceeds 100 token limit
            }
          ],
          metadata: {
            originalPath: filePath,
            type: 'txt',
            size: hugeContent.length,
            lastModified: new Date().toISOString(),
            lines: 1,
            encoding: 'utf-8'
          } as any
        };
      }
      
      if (type === 'xlsx' || type === 'xls') {
        return {
          content: 'Mock Excel Content',
          type: 'xlsx',
          originalPath: filePath,
          sheets: {  // Changed from metadata.sheets array to sheets object
            'Summary': {
              headers: ['Name', 'Q3 Revenue', 'Q4 Revenue', 'Growth'],
              rows: [
                ['Product A', '$45,000', '$52,000', '15.6%'],
                ['Product B', '$32,000', '$38,000', '18.8%'],
                ['Product C', '$28,000', '$31,000', '10.7%']
              ]
            },
            'Data': {
              headers: ['ID', 'Value1', 'Value2'],
              rows: Array.from({length: 100}, (_, i) => [
                `Row ${i + 1}`,
                Math.floor(Math.random() * 1000),
                Math.floor(Math.random() * 1000)
              ])
            }
          },
          metadata: {
            originalPath: filePath,
            type: 'xlsx',
            size: 1024,
            lastModified: new Date().toISOString(),
            sheets: [
              {
                name: 'Summary',
                data: [
                  ['Name', 'Q3 Revenue', 'Q4 Revenue', 'Growth'],
                  ['Product A', 45000, 52000, '15.6%'],
                  ['Product B', 32000, 38000, '18.8%']
                ]
              },
              {
                name: 'Data',
                data: Array.from({length: 100}, (_, i) => [
                  `Row ${i + 1}`,
                  Math.floor(Math.random() * 1000),
                  Math.floor(Math.random() * 1000)
                ])
              }
            ]
          } as any
        };
      } else if (type === 'pptx' || type === 'ppt') {
        return {
          content: 'Mock PowerPoint Content',
          type: 'pptx',
          originalPath: filePath,
          slides: [  // Added slides array for PowerPoint outline testing
            {
              title: 'Executive Summary',
              content: 'Overview of company performance and key metrics',
              slideNumber: 1
            },
            {
              title: 'Financial Results',
              content: 'Q4 financial performance and revenue analysis',
              slideNumber: 2
            },
            {
              title: 'Market Analysis',
              content: 'Current market trends and competitive landscape',
              slideNumber: 3
            }
          ],
          metadata: {
            originalPath: filePath,
            type: 'pptx',
            size: 1024,
            lastModified: new Date().toISOString(),
            slides: 3,
            slideTitles: ['Executive Summary', 'Financial Results', 'Market Analysis']
          } as any
        };
      } else if (type === 'pdf') {
        return {
          content: 'Mock PDF Content',
          type: 'pdf',
          originalPath: filePath,
          pages: [  // Added pages array for PDF page extraction testing (100-page report)
            ...Array.from({length: 100}, (_, i) => ({
              content: `Page ${i + 1} content with detailed analysis and information. This page contains important business data and technical specifications.`
            }))
          ],
          bookmarks: [  // Added bookmarks for PDF outline testing
            {
              title: 'Executive Summary',
              page: 1
            },
            {
              title: 'Financial Analysis',
              page: 2
            },
            {
              title: 'Market Overview',
              page: 3
            }
          ],
          metadata: {
            originalPath: filePath,
            type: 'pdf',
            size: 1024,
            lastModified: new Date().toISOString(),
            pages: 100,
            pdfInfo: {
              title: fileName,
              author: 'Test Author'
            }
          } as any
        };
      } else if (type === 'csv') {
        return {
          content: 'Name,Revenue,Department\nJohn,50000,Sales\nJane,60000,Marketing',
          type: 'csv',
          originalPath: filePath,
          sheets: {  // Add sheets structure for CSV to work with sheet data endpoint
            'Sheet1': {
              headers: ['Name', 'Revenue', 'Department'],
              rows: [
                ['John', '50000', 'Sales'],
                ['Jane', '60000', 'Marketing']
              ]
            }
          },
          metadata: {
            originalPath: filePath,
            type: 'csv',
            size: 1024,
            lastModified: new Date().toISOString(),
            lines: 3,
            encoding: 'utf-8'
          } as any
        };
      } else {
        return {
          content: 'Mock text content for document analysis',
          type: 'txt',
          originalPath: filePath,
          metadata: {
            originalPath: filePath,
            type: 'txt',
            size: 1024,
            lastModified: new Date().toISOString(),
            lines: 1,
            encoding: 'utf-8'
          } as any
        };
      }
    },
    isSupported: (fileExtension: string) => true,
    getSupportedExtensions: () => ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx', '.csv']
  };

  const mockEmbeddingService: IEmbeddingService = {
    initialize: async () => {},
    generateEmbeddings: async () => [{
      vector: new Array(384).fill(0),
      dimensions: 384,
      model: 'mock-model',
      createdAt: new Date().toISOString()
    }],
    generateQueryEmbedding: async () => ({
      vector: new Array(384).fill(0),
      dimensions: 384,
      model: 'mock-model',
      createdAt: new Date().toISOString()
    }),
    getModelConfig: () => ({ model: 'mock-model', dimensions: 384 }),
    isInitialized: () => true
  };

  const mockFileSystemService: IFileSystemService = {
    exists: async () => true,
    readFile: async () => 'mock content',
    listFiles: async () => []
  } as any;

  const mockFileSystem: IFileSystem = {
    readFile: async () => 'mock content',
    stat: async () => ({
      size: 1024,
      mtime: new Date(),
      isDirectory: () => false,
      isFile: () => true,
      isReadOnly: () => false
    }),
    readDir: async () => [
      // Mock directory entries for folder listing tests
      { name: 'Finance', isDirectory: () => true, isFile: () => false },
      { name: 'Sales', isDirectory: () => true, isFile: () => false },
      { name: 'Marketing', isDirectory: () => true, isFile: () => false },
      { name: 'Legal', isDirectory: () => true, isFile: () => false },
      { name: 'Engineering', isDirectory: () => true, isFile: () => false },
      { name: 'README.md', isDirectory: () => false, isFile: () => true },
      { name: 'config.yaml', isDirectory: () => false, isFile: () => true }
    ],
    join: (...paths: string[]) => paths.join('/'),
    extname: (filePath: string) => {
      const lastDot = filePath.lastIndexOf('.');
      return lastDot === -1 ? '' : filePath.substring(lastDot);
    }
  };

  return {
    logger: mockLogger,
    vectorSearchService: mockVectorSearchService,
    fileParsingService: mockFileParsingService,
    embeddingService: mockEmbeddingService,
    fileSystemService: mockFileSystemService,
    fileSystem: mockFileSystem
  };
}
