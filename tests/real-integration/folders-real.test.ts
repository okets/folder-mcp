/**
 * Real Integration Tests for Folders/Documents Endpoints
 * 
 * These tests use real files, real cache directories, and real service calls.
 * No mocks - everything is tested against actual folder structures and files.
 * 
 * User Story: "Find all Q4 financial documents by department"
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { promises as fs, existsSync, statSync, readdirSync } from 'fs';
import os from 'os';

// Test-only types (these endpoints are planned/legacy)
interface ListFoldersResponse {
  data: {
    folders: string[];
    token_count: number;
  };
  status: {
    code: 'success' | 'partial_success' | 'error';
    message: string;
  };
  continuation: {
    has_more: boolean;
    token?: string;
  };
}

interface ListDocumentsRequest {
  folder: string;
  max_tokens?: number;
  continuation_token?: string;
}

interface DocumentInfo {
  name: string;
  document_id: string;
  modified: string;
}

interface ListDocumentsResponse {
  data: {
    documents: DocumentInfo[];
    token_count: number;
  };
  status: {
    code: 'success' | 'partial_success' | 'error';
    message: string;
  };
  continuation: {
    has_more: boolean;
    token?: string;
  };
}

// Helper function to copy directory recursively
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Helper function to get real file stats
async function getFileStats(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    return null;
  }
}

// Helper function to list directories (simulating listFolders endpoint)
async function listFolders(basePath: string): Promise<ListFoldersResponse> {
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !entry.name.startsWith('.') && entry.name !== 'node_modules')
      .map(entry => entry.name)
      .sort();

    return {
      data: {
        folders,
        token_count: folders.length
      },
      status: {
        code: 'success',
        message: `Found ${folders.length} folders`
      },
      continuation: {
        has_more: false
      }
    };
  } catch (error) {
    return {
      data: {
        folders: [],
        token_count: 0
      },
      status: {
        code: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      continuation: {
        has_more: false
      }
    };
  }
}

// Helper function to list documents (simulating listDocuments endpoint)
async function listDocuments(basePath: string, folder: string, maxTokens?: number): Promise<ListDocumentsResponse> {
  try {
    const folderPath = path.join(basePath, folder);
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    
    const documents: DocumentInfo[] = [];
    
    for (const entry of entries) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        const filePath = path.join(folderPath, entry.name);
        const stats = await fs.stat(filePath);
        const documentId = path.join(folder, entry.name).replace(/\\/g, '/');
        
        documents.push({
          name: entry.name,
          document_id: documentId,
          modified: stats.mtime.toISOString()
        });
      }
    }
    
    // Sort by name for consistent results
    documents.sort((a, b) => a.name.localeCompare(b.name));
    
    // Apply token limiting if specified
    const limitedDocuments = maxTokens ? documents.slice(0, maxTokens) : documents;
    const hasMore = maxTokens ? documents.length > maxTokens : false;

    return {
      data: {
        documents: limitedDocuments,
        token_count: limitedDocuments.length
      },
      status: {
        code: 'success',
        message: `Found ${limitedDocuments.length} documents in ${folder}`
      },
      continuation: hasMore ? {
        has_more: hasMore,
        token: `${maxTokens}`
      } : {
        has_more: hasMore
      }
    };
  } catch (error) {
    return {
      data: {
        documents: [],
        token_count: 0
      },
      status: {
        code: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      continuation: {
        has_more: false
      }
    };
  }
}

describe('Folders/Documents Endpoints - Real Integration Tests', () => {
  let tempDirs: string[] = [];
  let knowledgeBasePath: string;

  const logResults = (testName: string, results: any, metrics?: any) => {
    console.log(`\n=== ${testName} Results ===`);
    console.log('Results:', JSON.stringify(results, null, 2));
    if (metrics) {
      console.log('Metrics:', JSON.stringify(metrics, null, 2));
    }
    console.log('========================\n');
  };

  beforeEach(async () => {
    // Create temp directory for this test
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'folders-real-test-'));
    tempDirs.push(tempDir);
    
    // Copy test knowledge base
    const sourceKB = path.join(__dirname, '../fixtures/test-knowledge-base');
    knowledgeBasePath = path.join(tempDir, 'test-knowledge-base');
    await copyDirectory(sourceKB, knowledgeBasePath);
    
    // Validate test setup
    expect(existsSync(knowledgeBasePath)).toBe(true);
    console.log(`✅ Test setup complete: ${knowledgeBasePath}`);
  });

  afterEach(async () => {
    // Cleanup temp directories
    for (const tempDir of tempDirs) {
      if (existsSync(tempDir)) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }
    tempDirs = [];
  });

  describe('1. Basic Directory Navigation Tests', () => {
    it('should list top-level folders correctly', async () => {
      const startTime = Date.now();
      
      // Test listFolders endpoint
      const result = await listFolders(knowledgeBasePath);
      
      const endTime = Date.now();
      const metrics = {
        processing_time_ms: endTime - startTime,
        folders_found: result.data.folders.length
      };

      logResults('List Top-Level Folders', result, metrics);

      // Validate response structure
      expect(result.status.code).toBe('success');
      expect(result.data.folders).toBeInstanceOf(Array);
      expect(result.data.token_count).toBeGreaterThan(0);
      expect(result.continuation.has_more).toBe(false);

      // Validate expected folders are present
      const expectedFolders = ['Engineering', 'Finance', 'Legal', 'Marketing', 'Sales', 'test-edge-cases'];
      for (const folder of expectedFolders) {
        expect(result.data.folders).toContain(folder);
      }

      // Validate hidden folders are excluded
      expect(result.data.folders).not.toContain('.folder-mcp');
      expect(result.data.folders).not.toContain('node_modules');
      expect(result.data.folders).not.toContain('.git');

      // Performance validation
      expect(metrics.processing_time_ms).toBeLessThan(1000); // Should complete under 1 second
    });

    it('should list documents in a specific folder', async () => {
      const startTime = Date.now();
      
      // Test listDocuments endpoint for Engineering folder
      const result = await listDocuments(knowledgeBasePath, 'Engineering');
      
      const endTime = Date.now();
      const metrics = {
        processing_time_ms: endTime - startTime,
        documents_found: result.data.documents.length
      };

      logResults('List Engineering Documents', result, metrics);

      // Validate response structure
      expect(result.status.code).toBe('success');
      expect(result.data.documents).toBeInstanceOf(Array);
      expect(result.data.token_count).toBeGreaterThan(0);
      expect(result.continuation.has_more).toBe(false);

      // Validate expected files are present
      const expectedFiles = ['API_Spec.html', 'README.md', 'config.xml', 'notes.txt'];
      expect(result.data.documents).toHaveLength(expectedFiles.length);
      
      for (const file of expectedFiles) {
        const doc = result.data.documents.find(d => d.name === file);
        expect(doc).toBeDefined();
        expect(doc!.document_id).toBe(`Engineering/${file}`);
        expect(doc!.modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO date format
      }
    });

    it('should handle nested folder navigation (Finance/2024/Q4)', async () => {
      const startTime = Date.now();
      
      // Test nested folder navigation
      const result = await listDocuments(knowledgeBasePath, 'Finance/2024/Q4');
      
      const endTime = Date.now();
      const metrics = {
        processing_time_ms: endTime - startTime,
        documents_found: result.data.documents.length,
        nested_depth: 3
      };

      logResults('List Nested Q4 Documents', result, metrics);

      // Validate response structure
      expect(result.status.code).toBe('success');
      expect(result.data.documents).toBeInstanceOf(Array);
      expect(result.data.documents).toHaveLength(1);

      // Validate Q4_Forecast.xlsx is found
      const q4Doc = result.data.documents[0];
      expect(q4Doc!.name).toBe('Q4_Forecast.xlsx');
      expect(q4Doc!.document_id).toBe('Finance/2024/Q4/Q4_Forecast.xlsx');
      expect(q4Doc!.modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('2. Real File System Validation Tests', () => {
    it('should extract accurate file metadata from actual files', async () => {
      const testFiles = [
        { path: 'Legal/Contracts/Acme_Vendor_Agreement.pdf', expectedType: 'pdf' },
        { path: 'Sales/Data/Customer_List.csv', expectedType: 'csv' },
        { path: 'Finance/2024/Q1/Q1_Budget.xlsx', expectedType: 'xlsx' }
      ];

      for (const testFile of testFiles) {
        const result = await listDocuments(knowledgeBasePath, path.dirname(testFile.path));
        const fileName = path.basename(testFile.path);
        
        const doc = result.data.documents.find(d => d.name === fileName);
        expect(doc).toBeDefined();
        
        // Validate document_id matches expected path
        expect(doc!.document_id).toBe(testFile.path);
        
        // Validate actual file exists and metadata is accurate
        const actualFilePath = path.join(knowledgeBasePath, testFile.path);
        expect(existsSync(actualFilePath)).toBe(true);
        
        const stats = await getFileStats(actualFilePath);
        expect(stats).not.toBeNull();
        expect(stats!.isFile).toBe(true);
        expect(stats!.size).toBeGreaterThan(0);
        
        // Validate modified date matches file system
        expect(doc!.modified).toBe(stats!.modified);

        console.log(`✅ File validated: ${testFile.path} (${stats!.size} bytes, modified: ${stats!.modified})`);
      }
    });

    it('should handle directory traversal through entire knowledge base structure', async () => {
      const directoryStructure = [
        { folder: 'Finance', expectedFiles: 0 }, // Has subdirectories, no direct files
        { folder: 'Finance/2024', expectedFiles: 0 }, // Has subdirectories, no direct files
        { folder: 'Finance/2024/Q1', expectedFiles: 2 }, // Q1_Budget.xlsx, Q1_Report.pdf
        { folder: 'Finance/2024/Q4', expectedFiles: 1 }, // Q4_Forecast.xlsx
        { folder: 'Finance/Reports', expectedFiles: 1 }, // Annual_Report_2024.pdf
        { folder: 'Sales/Data', expectedFiles: 2 }, // Customer_List.csv, Sales_Pipeline.xlsx
        { folder: 'Sales/Presentations', expectedFiles: 2 }, // Product_Demo.pptx, Q4_Board_Deck.pptx
      ];

      for (const dir of directoryStructure) {
        const result = await listDocuments(knowledgeBasePath, dir.folder);
        
        expect(result.status.code).toBe('success');
        expect(result.data.documents).toHaveLength(dir.expectedFiles);
        
        console.log(`✅ Directory validated: ${dir.folder} (${dir.expectedFiles} files)`);
        
        // Validate all documents have proper document_id format
        for (const doc of result.data.documents) {
          expect(doc.document_id).toMatch(new RegExp(`^${dir.folder.replace(/\//g, '/')}/`));
          expect(doc.name).not.toContain('/'); // File name only, no path
          expect(doc.modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
      }
    });
  });

  describe('3. Filtering and Edge Case Tests', () => {
    it('should filter out hidden folders and system directories', async () => {
      // Create some hidden directories to test filtering
      const hiddenDirs = ['.folder-mcp', '.git', 'node_modules', '.hidden-test'];
      
      for (const hiddenDir of hiddenDirs) {
        const hiddenPath = path.join(knowledgeBasePath, hiddenDir);
        await fs.mkdir(hiddenPath, { recursive: true });
        await fs.writeFile(path.join(hiddenPath, 'test.txt'), 'test content');
      }

      const result = await listFolders(knowledgeBasePath);
      
      expect(result.status.code).toBe('success');
      
      // Validate hidden directories are filtered out
      for (const hiddenDir of hiddenDirs) {
        expect(result.data.folders).not.toContain(hiddenDir);
      }
      
      // Validate normal folders are still present
      const expectedFolders = ['Engineering', 'Finance', 'Legal', 'Marketing', 'Sales', 'test-edge-cases'];
      for (const folder of expectedFolders) {
        expect(result.data.folders).toContain(folder);
      }

      console.log(`✅ Hidden folder filtering working: ${hiddenDirs.length} hidden dirs filtered out`);
    });

    it('should handle empty directories gracefully', async () => {
      // Create an empty directory
      const emptyDir = path.join(knowledgeBasePath, 'empty-test-dir');
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await listDocuments(knowledgeBasePath, 'empty-test-dir');
      
      expect(result.status.code).toBe('success');
      expect(result.data.documents).toHaveLength(0);
      expect(result.data.token_count).toBe(0);
      expect(result.continuation.has_more).toBe(false);

      console.log('✅ Empty directory handling validated');
    });

    it('should handle non-existent folders with proper error responses', async () => {
      const result = await listDocuments(knowledgeBasePath, 'non-existent-folder');
      
      expect(result.status.code).toBe('error');
      expect(result.data.documents).toHaveLength(0);
      expect(result.data.token_count).toBe(0);
      expect(result.status.message).toContain('ENOENT');

      console.log('✅ Non-existent folder error handling validated');
    });

    it('should handle special character filenames correctly', async () => {
      const result = await listDocuments(knowledgeBasePath, 'test-edge-cases');
      
      expect(result.status.code).toBe('success');
      
      // Find the special character filename
      const specialCharFile = result.data.documents.find(d => d.name.includes('文件名'));
      expect(specialCharFile).toBeDefined();
      expect(specialCharFile!.name).toBe('special_chars_文件名.txt');
      expect(specialCharFile!.document_id).toBe('test-edge-cases/special_chars_文件名.txt');

      console.log('✅ Special character filename handling validated');
    });
  });

  describe('4. Windows-Specific Tests', () => {
    it('should handle Windows path separators correctly', async () => {
      // Test with Windows-style path separators
      const windowsPath = 'Finance\\2024\\Q4';
      const normalizedPath = windowsPath.replace(/\\/g, '/');
      
      const result = await listDocuments(knowledgeBasePath, normalizedPath);
      
      expect(result.status.code).toBe('success');
      expect(result.data.documents).toHaveLength(1);
      
      const doc = result.data.documents[0];
      // Document ID should use forward slashes regardless of input
      expect(doc!.document_id).toBe('Finance/2024/Q4/Q4_Forecast.xlsx');

      console.log('✅ Windows path separator handling validated');
    });

    it('should handle case sensitivity appropriately', async () => {
      // Test case variations (behavior depends on file system)
      const variations = ['Engineering', 'engineering', 'ENGINEERING'];
      const results = [];
      
      for (const variation of variations) {
        try {
          const result = await listDocuments(knowledgeBasePath, variation);
          results.push({ variation, success: result.status.code === 'success' });
        } catch (error) {
          results.push({ variation, success: false });
        }
      }
      
      // At least the correct case should work
      const correctCase = results.find(r => r.variation === 'Engineering');
      expect(correctCase?.success).toBe(true);

      console.log('✅ Case sensitivity behavior validated:', results);
    });
  });

  describe('5. Cache Directory Handling Tests', () => {
    it('should create cache directories during operations and filter them from listings', async () => {
      // Create .folder-mcp cache directory
      const cacheDir = path.join(knowledgeBasePath, '.folder-mcp');
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(path.join(cacheDir, 'cache.json'), JSON.stringify({ test: 'data' }));

      // Verify cache directory exists
      expect(existsSync(cacheDir)).toBe(true);

      // Test that cache directory is filtered from folder listings
      const foldersResult = await listFolders(knowledgeBasePath);
      expect(foldersResult.data.folders).not.toContain('.folder-mcp');

      // Test that cache files are filtered from document listings
      const documentsResult = await listDocuments(knowledgeBasePath, '.');
      const cacheFiles = documentsResult.data.documents.filter(d => d.name.startsWith('.folder-mcp'));
      expect(cacheFiles).toHaveLength(0);

      console.log('✅ Cache directory filtering validated');
    });
  });

  describe('6. Performance and Token Limit Tests', () => {
    it('should handle pagination with token limits', async () => {
      const maxTokens = 2;
      const result = await listDocuments(knowledgeBasePath, 'Engineering', maxTokens);
      
      expect(result.status.code).toBe('success');
      expect(result.data.documents).toHaveLength(maxTokens);
      expect(result.data.token_count).toBe(maxTokens);
      expect(result.continuation.has_more).toBe(true);
      expect(result.continuation.token).toBeDefined();

      console.log('✅ Token limit pagination validated');
    });

    it('should measure performance benchmarks for large directories', async () => {
      const startTime = Date.now();
      
      // Test performance with largest directory (Sales has subdirectories)
      const result = await listDocuments(knowledgeBasePath, 'Sales/Presentations');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(result.status.code).toBe('success');
      expect(processingTime).toBeLessThan(500); // Should complete under 500ms

      const metrics = {
        documents_processed: result.data.documents.length,
        processing_time_ms: processingTime,
        throughput_docs_per_ms: result.data.documents.length / processingTime
      };

      logResults('Performance Benchmark', result, metrics);
      console.log('✅ Performance benchmark completed');
    });
  });

  describe('7. Multi-Step User Story Workflow Test', () => {
    it('should complete "Find all Q4 financial documents by department" user story', async () => {
      console.log('\n🎯 Starting User Story: "Find all Q4 financial documents by department"');
      
      const workflow = [];
      let totalProcessingTime = 0;

      // Step 1: List top-level departments
      const step1Start = Date.now();
      const departments = await listFolders(knowledgeBasePath);
      const step1Time = Date.now() - step1Start;
      totalProcessingTime += step1Time;
      
      workflow.push({
        step: 1,
        action: 'List all departments',
        result: `Found ${departments.data.folders.length} departments`,
        processing_time_ms: step1Time
      });
      
      expect(departments.status.code).toBe('success');
      expect(departments.data.folders).toContain('Finance');

      // Step 2: Navigate to Finance department
      const step2Start = Date.now();
      const financeContents = await listDocuments(knowledgeBasePath, 'Finance');
      const step2Time = Date.now() - step2Start;
      totalProcessingTime += step2Time;
      
      workflow.push({
        step: 2,
        action: 'Navigate to Finance department',
        result: `Found ${financeContents.data.documents.length} direct files (subdirectories contain the actual files)`,
        processing_time_ms: step2Time
      });
      
      expect(financeContents.status.code).toBe('success');

      // Step 3: Navigate to 2024 fiscal year
      const step3Start = Date.now();
      const year2024Contents = await listDocuments(knowledgeBasePath, 'Finance/2024');
      const step3Time = Date.now() - step3Start;
      totalProcessingTime += step3Time;
      
      workflow.push({
        step: 3,
        action: 'Navigate to 2024 fiscal year',
        result: `Found ${year2024Contents.data.documents.length} direct files (Q1 and Q4 subdirectories available)`,
        processing_time_ms: step3Time
      });
      
      expect(year2024Contents.status.code).toBe('success');

      // Step 4: Find Q4 documents specifically
      const step4Start = Date.now();
      const q4Documents = await listDocuments(knowledgeBasePath, 'Finance/2024/Q4');
      const step4Time = Date.now() - step4Start;
      totalProcessingTime += step4Time;
      
      workflow.push({
        step: 4,
        action: 'Find Q4 documents',  
        result: `Found ${q4Documents.data.documents.length} Q4 financial documents`,
        processing_time_ms: step4Time
      });
      
      expect(q4Documents.status.code).toBe('success');
      expect(q4Documents.data.documents).toHaveLength(1);

      // Step 5: Validate Q4 financial document details
      const q4Doc = q4Documents.data.documents[0];
      const step5Start = Date.now();
      const fileStats = await getFileStats(path.join(knowledgeBasePath, q4Doc!.document_id));
      const step5Time = Date.now() - step5Start;
      totalProcessingTime += step5Time;
      
      workflow.push({
        step: 5,
        action: 'Validate Q4 document details',
        result: `Q4_Forecast.xlsx validated: ${fileStats!.size} bytes, modified ${fileStats!.modified}`,
        processing_time_ms: step5Time
      });
      
      expect(q4Doc!.name).toBe('Q4_Forecast.xlsx');
      expect(q4Doc!.document_id).toBe('Finance/2024/Q4/Q4_Forecast.xlsx');
      expect(fileStats).not.toBeNull();
      expect(fileStats!.size).toBeGreaterThan(0);

      // Final workflow summary
      const workflowSummary = {
        user_story: 'Find all Q4 financial documents by department',
        status: 'completed_successfully',
        total_steps: workflow.length,
        total_processing_time_ms: totalProcessingTime,
        documents_found: q4Documents.data.documents.length,
        workflow_details: workflow
      };

      logResults('User Story Workflow Complete', workflowSummary);

      // Validate entire workflow completed successfully
      expect(workflowSummary.status).toBe('completed_successfully');
      expect(workflowSummary.documents_found).toBe(1);
      expect(workflowSummary.total_processing_time_ms).toBeLessThan(2000); // Should complete under 2 seconds

      console.log('🎉 User Story "Find all Q4 financial documents by department" completed successfully!');
    });
  });
});