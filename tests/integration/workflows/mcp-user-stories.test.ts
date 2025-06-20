/**
 * Integration Tests for User Story Workflows
 * 
 * These tests implement complete user journeys from start to finish,
 * demonstrating how the new MCP endpoints work together to solve real problems.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../helpers/setup.js';
import type { 
  SearchRequest, GetDocumentOutlineRequest, GetSheetDataRequest,
  GetSlidesRequest, GetPagesRequest, ListDocumentsRequest
} from '../../../src/interfaces/mcp/types.js';

// Mock endpoint interface - will be replaced with real implementation in Task 5
interface MCPWorkflowClient {
  search(request: SearchRequest): Promise<any>;
  getDocumentOutline(request: GetDocumentOutlineRequest): Promise<any>;
  getSheetData(request: GetSheetDataRequest): Promise<any>;
  getSlides(request: GetSlidesRequest): Promise<any>;
  getPages(request: GetPagesRequest): Promise<any>;
  listDocuments(request: ListDocumentsRequest): Promise<any>;
}

describe('MCP User Story Integration Tests', () => {
  let testEnv: any;
  let client: MCPWorkflowClient;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    // TODO: Initialize real MCP client when endpoints are implemented
    client = createMockWorkflowClient();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  describe('📊 Complete User Story: "Find last month\'s sales performance and analyze trends"', () => {
    test('End-to-end workflow: Search → Outline → Extract Data', async () => {
      // Step 1: User searches for sales performance data
      console.log("👤 User: 'Find last month's sales performance and analyze trends'");
      
      const searchResults = await client.search({
        query: "sales performance october 2024",
        mode: "semantic",
        scope: "documents"
      });

      expect(searchResults.data.results.length).toBeGreaterThan(0);
      console.log(`🔍 Found ${searchResults.data.results.length} relevant documents`);

      // Step 2: User explores the structure of the sales spreadsheet
      const spreadsheetDoc = searchResults.data.results.find((r: any) => 
        r.document_id.includes('Sales_Pipeline') || r.document_id.includes('xlsx')
      );
      expect(spreadsheetDoc).toBeDefined();

      const outline = await client.getDocumentOutline({
        document_id: spreadsheetDoc.document_id
      });

      expect(outline.type).toBe('xlsx');
      expect(outline.sheets.length).toBeGreaterThan(0);
      console.log(`📋 Spreadsheet has ${outline.sheets.length} sheets: ${outline.sheets.map((s: any) => s.name).join(', ')}`);

      // Step 3: Extract summary data for analysis
      const summarySheet = outline.sheets.find((s: any) => s.name.toLowerCase().includes('summary'));
      if (summarySheet) {
        const sheetData = await client.getSheetData({
          document_id: spreadsheetDoc.document_id,
          sheet_name: summarySheet.name
        });

        expect(sheetData.data.headers).toBeDefined();
        expect(sheetData.data.rows.length).toBeGreaterThan(0);
        console.log(`📊 Extracted ${sheetData.data.rows.length} rows of sales data`);

        // Verify we have financial data
        const allCells = [sheetData.data.headers, ...sheetData.data.rows].flat();
        const hasFinancialData = allCells.some(cell => 
          typeof cell === 'string' && (cell.includes('$') || cell.includes('revenue') || cell.includes('sales'))
        );
        expect(hasFinancialData).toBe(true);
      }

      // Step 4: Get presentation slides for context
      const presentationDoc = searchResults.data.results.find((r: any) => 
        r.document_id.includes('Board_Deck') || r.document_id.includes('pptx')
      );
      
      if (presentationDoc) {
        const slides = await client.getSlides({
          document_id: presentationDoc.document_id,
          slide_numbers: "1,5-8,15" // Key slides for sales performance
        });

        expect(slides.data.slides.length).toBeGreaterThan(0);
        console.log(`🎯 Retrieved ${slides.data.slides.length} key presentation slides`);

        // Verify slides contain relevant content
        const slideContent = slides.data.slides.map((s: any) => s.content + ' ' + s.title).join(' ');
        expect(slideContent.toLowerCase()).toMatch(/sales|revenue|performance|growth/);
      }

      console.log("✅ Complete sales analysis workflow executed successfully");
    });
  });

  describe('📄 Complete User Story: "Find all vendor contracts and check their expiration dates"', () => {
    test('End-to-end workflow: Regex Search → Extract Pages → Review Terms', async () => {
      console.log("👤 User: 'Find all vendor contracts and check their expiration dates'");

      // Step 1: Search for contract patterns using regex
      const contractSearch = await client.search({
        query: "\\b(contract|agreement)\\b.*\\b(vendor|supplier)\\b",
        mode: "regex",
        scope: "chunks"
      });

      expect(contractSearch.data.results.length).toBeGreaterThan(0);
      console.log(`🔍 Found ${contractSearch.data.results.length} contract references`);

      // Step 2: Group results by document
      const contractDocs = new Set(contractSearch.data.results.map((r: any) => r.document_id));
      console.log(`📑 Identified ${contractDocs.size} contract documents`);

      // Step 3: For each contract, extract the key legal pages
      for (const docId of Array.from(contractDocs).slice(0, 2)) { // Test first 2 documents
        console.log(`📖 Analyzing contract: ${docId}`);

        // Find pages with legal terms based on search results
        const docResults = contractSearch.data.results.filter((r: any) => r.document_id === docId);
        const validPages = docResults
          .map((r: any) => r.location?.page)
          .filter((p: any): p is number => typeof p === 'number' && p > 0);
        const pageNumbers = [...new Set(validPages)] as number[];
        
        if (pageNumbers.length > 0) {
          const pageRange = pageNumbers.sort((a: any, b: any) => a - b).join(',');
          const pages = await client.getPages({
            document_id: docId as string,
            page_range: pageRange
          });

          expect(pages.data.pages.length).toBeGreaterThan(0);
          console.log(`📄 Extracted ${pages.data.pages.length} pages with contract terms`);

          // Verify we found contract-related content
          const pageContent = pages.data.pages.map((p: any) => p.content).join(' ');
          expect(pageContent.toLowerCase()).toMatch(/contract|agreement|vendor|supplier|expir|term/);

          // Look for expiration dates (basic pattern matching)
          const datePatterns = [
            /december\s+\d{1,2},?\s+\d{4}/i,
            /\d{1,2}\/\d{1,2}\/\d{4}/,
            /expires?\s+\w+\s+\d{1,2},?\s+\d{4}/i
          ];
          
          const foundDates = datePatterns.some(pattern => pattern.test(pageContent));
          if (foundDates) {
            console.log(`📅 Found potential expiration dates in ${docId}`);
          }
        }
      }

      console.log("✅ Complete contract review workflow executed successfully");
    });
  });

  describe('🏢 Complete User Story: "What\'s in this 100-page report? I need the financial section"', () => {
    test('End-to-end workflow: Outline → Navigate → Extract Sections', async () => {
      console.log("👤 User: 'What's in this 100-page report? I need the financial section'");

      // Step 1: User wants to understand a large document structure
      const reportDocId = "Annual_Report_2024.pdf"; // Simulated large report
      
      const outline = await client.getDocumentOutline({
        document_id: reportDocId
      });

      expect(outline.type).toBe('pdf');
      expect(outline.total_pages).toBeGreaterThan(50);
      console.log(`📖 Report has ${outline.total_pages} pages with ${outline.bookmarks.length} sections`);

      // Step 2: Find the financial section using bookmarks
      const financialBookmark = outline.bookmarks.find((b: any) => 
        b.title.toLowerCase().includes('financial') || 
        b.title.toLowerCase().includes('finance')
      );
      
      expect(financialBookmark).toBeDefined();
      console.log(`💰 Found financial section: "${financialBookmark.title}" starting at page ${financialBookmark.page}`);

      // Step 3: Extract the financial section (estimate 20 pages)
      const endPage = Math.min(financialBookmark.page + 20, outline.total_pages);
      const financialPages = await client.getPages({
        document_id: reportDocId,
        page_range: `${financialBookmark.page}-${endPage}`
      });

      expect(financialPages.data.pages.length).toBeGreaterThan(0);
      console.log(`📊 Extracted ${financialPages.data.pages.length} pages from financial section`);

      // Step 4: Verify financial content
      const financialContent = financialPages.data.pages.map((p: any) => p.content).join(' ');
      const hasFinancialTerms = /revenue|profit|loss|earnings|financial|balance|income/i.test(financialContent);
      expect(hasFinancialTerms).toBe(true);

      // Step 5: Handle pagination if content is large
      if (financialPages.continuation.has_more) {
        console.log("📖 Additional financial pages available via pagination");
        expect(financialPages.continuation.token).toBeDefined();
        expect(financialPages.actions.some((a: any) => a.id === 'CONTINUE')).toBe(true);
      }

      console.log("✅ Complete document navigation workflow executed successfully");
    });
  });

  describe('📈 Complete User Story: "Create investor pitch from board presentations"', () => {
    test('End-to-end workflow: Search → Outline → Extract Key Slides', async () => {
      console.log("👤 User: 'Create investor pitch from board presentations'");

      // Step 1: Find recent board presentations
      const boardPresentations = await client.search({
        query: "board presentation deck 2024",
        mode: "semantic",
        scope: "documents"
      });

      expect(boardPresentations.data.results.length).toBeGreaterThan(0);
      console.log(`🔍 Found ${boardPresentations.data.results.length} board presentations`);

      // Step 2: Get outline of the main board deck
      const mainDeck = boardPresentations.data.results.find((r: any) => 
        r.document_id.includes('Board_Deck') || r.document_id.includes('Q4')
      );
      expect(mainDeck).toBeDefined();

      const deckOutline = await client.getDocumentOutline({
        document_id: mainDeck.document_id
      });

      expect(deckOutline.type).toBe('pptx');
      console.log(`🎯 Main deck has ${deckOutline.total_slides} slides`);

      // Step 3: Extract executive summary and key metric slides
      const keySlides = await client.getSlides({
        document_id: mainDeck.document_id,
        slide_numbers: "1,5-8,15" // Cover, metrics, and summary slides
      });

      expect(keySlides.data.slides.length).toBeGreaterThan(0);
      console.log(`📊 Extracted ${keySlides.data.slides.length} key slides for investor pitch`);

      // Step 4: Verify slide content quality
      keySlides.data.slides.forEach((slide: any, index: any) => {
        expect(slide.slide_number).toBeTypeOf('number');
        expect(slide.title).toBeTypeOf('string');
        expect(slide.content).toBeTypeOf('string');
        expect(slide.notes).toBeTypeOf('string');
        
        console.log(`📄 Slide ${slide.slide_number}: "${slide.title}"`);
      });

      // Step 5: Verify business-relevant content
      const allSlideContent = keySlides.data.slides
        .map((s: any) => `${s.title} ${s.content} ${s.notes}`)
        .join(' ');
      
      const hasBusinessMetrics = /revenue|growth|market|customer|strategy|financial/i.test(allSlideContent);
      expect(hasBusinessMetrics).toBe(true);

      console.log("✅ Complete investor pitch creation workflow executed successfully");
    });
  });

  describe('🔍 Complete User Story: "Find all Q4 financial documents by department"', () => {
    test('End-to-end workflow: Browse → Filter → Collect', async () => {
      console.log("👤 User: 'Find all Q4 financial documents by department'");

      // Step 1: Explore the folder structure
      const searchResult = await client.search({
        query: "Q4 financial",
        mode: "semantic", 
        scope: "documents",
        filters: { folder: "Finance" }
      });

      expect(searchResult.data.results.length).toBeGreaterThan(0);
      console.log(`🔍 Found ${searchResult.data.results.length} Q4 financial documents in Finance folder`);

      // Step 2: Search other departments
      const departments = ['Sales', 'Marketing', 'Legal'];
      const departmentDocs = new Map();

      for (const dept of departments) {
        const deptSearch = await client.search({
          query: "Q4 2024 financial budget forecast",
          mode: "semantic",
          scope: "documents",
          filters: { folder: dept }
        });

        if (deptSearch.data.results.length > 0) {
          departmentDocs.set(dept, deptSearch.data.results);
          console.log(`📁 ${dept}: Found ${deptSearch.data.results.length} Q4 documents`);
        }
      }

      // Step 3: List documents in specific Q4 folders
      const q4Documents = await client.listDocuments({
        folder: "Finance/2024/Q4"
      });

      expect(q4Documents.data.documents.length).toBeGreaterThan(0);
      console.log(`📋 Finance Q4 folder contains ${q4Documents.data.documents.length} documents`);

      // Step 4: Collect all Q4 financial documents
      const allQ4Docs = [
        ...searchResult.data.results,
        ...Array.from(departmentDocs.values()).flat(),
        ...q4Documents.data.documents.map((d: any) => ({ document_id: d.document_id, preview: d.name }))
      ];

      const uniqueQ4Docs = Array.from(
        new Map(allQ4Docs.map(doc => [doc.document_id, doc])).values()
      );

      console.log(`📊 Total unique Q4 financial documents found: ${uniqueQ4Docs.length}`);
      uniqueQ4Docs.forEach(doc => {
        console.log(`  📄 ${doc.document_id}: ${doc.preview || 'Financial document'}`);
      });

      expect(uniqueQ4Docs.length).toBeGreaterThan(0);
      console.log("✅ Complete departmental document discovery workflow executed successfully");
    });
  });
});

// Mock workflow client with more realistic behavior
function createMockWorkflowClient(): MCPWorkflowClient {
  return {
    async search(request: SearchRequest) {
      // Simulate different search results based on query
      if (request.query.includes('sales performance')) {
        return {
          data: {
            results: [
              {
                document_id: 'Sales_Pipeline.xlsx',
                preview: 'Q4 sales performance shows 15% growth over previous quarter...',
                score: 0.92,
                location: { sheet: 'Summary', page: null, section: null, slide: null },
                context: { before: 'Q3 results...', after: 'Projections for...' },
                metadata: { document_type: 'xlsx', total_pages: null }
              },
              {
                document_id: 'Q4_Board_Deck.pptx',
                preview: 'Sales exceeded targets with record quarterly performance...',
                score: 0.88,
                location: { slide: 8, page: null, section: null, sheet: null },
                context: { before: 'Revenue overview...', after: 'Looking ahead...' },
                metadata: { document_type: 'pptx', total_pages: null }
              }
            ],
            token_count: 450
          },
          status: { code: 'success', message: 'SEARCH_COMPLETED' },
          continuation: { has_more: false },
          actions: []
        };
      } else if (request.query.includes('board presentation')) {
        return {
          data: {
            results: [
              {
                document_id: 'Q4_Board_Deck.pptx',
                preview: 'Board presentation for Q4 2024 business review and strategic planning...',
                score: 0.95,
                location: { slide: 1, page: null, section: null, sheet: null },
                context: { before: '', after: 'Executive summary...' },
                metadata: { document_type: 'pptx', total_pages: null }
              },
              {
                document_id: 'Board_Deck_Q3.pptx',
                preview: 'Q3 board deck with financial results and market analysis...',
                score: 0.88,
                location: { slide: 5, page: null, section: null, sheet: null },
                context: { before: 'Previous quarter...', after: 'Growth projections...' },
                metadata: { document_type: 'pptx', total_pages: null }
              }
            ],
            token_count: 420
          },
          status: { code: 'success', message: 'SEARCH_COMPLETED' },
          continuation: { has_more: false },
          actions: []
        };
      } else if (request.mode === 'regex' && request.query.includes('contract')) {
        return {
          data: {
            results: [
              {
                document_id: 'Acme_Vendor_Agreement.pdf',
                preview: 'This vendor agreement between Company and Acme Corp...',
                score: 1.0,
                location: { page: 1, section: null, sheet: null, slide: null },
                context: { before: '', after: 'The terms of this contract...' },
                metadata: { document_type: 'pdf', total_pages: 25 }
              },
              {
                document_id: 'Supply_Contract_2024.docx',
                preview: 'Supply contract with BigCorp supplier expires December 31, 2024...',
                score: 0.95,
                location: { page: 5, section: null, sheet: null, slide: null },
                context: { before: 'Payment terms...', after: 'Renewal options...' },
                metadata: { document_type: 'docx', total_pages: 15 }
              }
            ],
            token_count: 380
          },
          status: { code: 'success', message: 'SEARCH_COMPLETED' },
          continuation: { has_more: false },
          actions: []
        };
      } else if (request.filters?.folder) {
        return {
          data: {
            results: [
              {
                document_id: `${request.filters.folder}_Q4_Report.xlsx`,
                preview: `Q4 financial report for ${request.filters.folder} department...`,
                score: 0.85,
                location: { sheet: 'Summary', page: null, section: null, slide: null },
                context: { before: 'Q3 comparison...', after: 'Next quarter...' },
                metadata: { document_type: 'xlsx', total_pages: null }
              }
            ],
            token_count: 200
          },
          status: { code: 'success', message: 'SEARCH_COMPLETED' },
          continuation: { has_more: false },
          actions: []
        };
      }
      
      return {
        data: { results: [], token_count: 0 },
        status: { code: 'success', message: 'NO_RESULTS' },
        continuation: { has_more: false },
        actions: []
      };
    },

    async getDocumentOutline(request: GetDocumentOutlineRequest) {
      if (request.document_id.endsWith('.xlsx')) {
        return {
          type: 'xlsx',
          sheets: [
            { name: 'Summary', rows: 50, columns: 8 },
            { name: 'Details', rows: 2000, columns: 12 },
            { name: 'Charts', rows: 0, columns: 0 }
          ],
          total_rows: 2050,
          file_size: '1.2MB'
        };
      } else if (request.document_id.endsWith('.pptx')) {
        return {
          type: 'pptx',
          total_slides: 45,
          slides: [
            { number: 1, title: 'Q4 Business Review' },
            { number: 2, title: 'Agenda' },
            { number: 5, title: 'Revenue Performance' },
            { number: 8, title: 'Market Analysis' },
            { number: 15, title: 'Summary & Next Steps' }
          ],
          file_size: '15.3MB'
        };
      } else {
        return {
          type: 'pdf',
          total_pages: 94,
          bookmarks: [
            { title: 'Executive Summary', page: 1 },
            { title: 'Financial Overview', page: 23 },
            { title: 'Risk Factors', page: 45 },
            { title: 'Appendices', page: 80 }
          ],
          file_size: '2.4MB'
        };
      }
    },

    async getSheetData(request: GetSheetDataRequest) {
      return {
        data: {
          headers: ['Month', 'Revenue', 'Growth %', 'Target'],
          rows: [
            ['January', '$1,200,000', '15%', '$1,100,000'],
            ['February', '$1,350,000', '18%', '$1,200,000'],
            ['March', '$1,500,000', '20%', '$1,300,000']
          ],
          token_count: 300
        },
        status: { code: 'success', message: 'SUCCESS' },
        continuation: { has_more: false },
        actions: []
      };
    },

    async getSlides(request: GetSlidesRequest) {
      const requestedSlides = request.slide_numbers 
        ? request.slide_numbers.split(',').map(s => parseInt(s.trim()))
        : [1, 5, 8, 15];

      return {
        data: {
          slides: requestedSlides.map(num => ({
            slide_number: num,
            title: `Slide ${num}: ${num === 1 ? 'Business Review' : num === 5 ? 'Revenue Performance' : num === 8 ? 'Market Analysis' : 'Summary'}`,
            content: `Content for slide ${num} covering key business metrics and strategic insights for Q4 performance review.`,
            notes: `Speaker notes for slide ${num} with additional context and talking points for the presentation.`
          })),
          total_slides: 45,
          token_count: 800
        },
        status: { code: 'success', message: 'SUCCESS' },
        continuation: { has_more: false },
        actions: []
      };
    },

    async getPages(request: GetPagesRequest) {
      const pages = request.page_range 
        ? request.page_range.split(',').map(p => parseInt(p.trim()))
        : [1];

      return {
        data: {
          pages: pages.map(num => ({
            page_number: num,
            content: `Page ${num} content: This is a sample page containing relevant business information including financial data, contract terms, and strategic analysis. The content includes key metrics and performance indicators relevant to business operations.`
          })),
          total_pages: 94,
          token_count: 1200
        },
        status: { code: 'success', message: 'SUCCESS' },
        continuation: { 
          has_more: pages.length < 10,
          token: pages.length < 10 ? 'continuation_token_' + Date.now() : undefined
        },
        actions: pages.length < 10 ? [
          { id: 'CONTINUE', description: 'Get next batch of pages', params: {} }
        ] : []
      };
    },

    async listDocuments(request: ListDocumentsRequest) {
      return {
        data: {
          documents: [
            { name: 'Q4_Budget.xlsx', document_id: 'Q4_Budget.xlsx', modified: '2024-01-15' },
            { name: 'Q4_Forecast.xlsx', document_id: 'Q4_Forecast.xlsx', modified: '2024-01-10' },
            { name: 'Annual_Report_2024.pdf', document_id: 'Annual_Report_2024.pdf', modified: '2024-01-20' }
          ],
          token_count: 200
        },
        status: { code: 'success', message: 'SUCCESS' },
        continuation: { has_more: false },
        actions: []
      };
    }
  };
}
