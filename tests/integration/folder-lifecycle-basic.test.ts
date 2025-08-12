/**
 * Basic Integration Tests for FolderLifecycleOrchestrator
 * 
 * Tests the core functionality with mocked services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { FolderLifecycleService } from '../../src/application/indexing/folder-lifecycle-service.js';
import { readFileSync, statSync } from 'fs';

// Mock fs module for generateContentHash
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('FolderLifecycleOrchestrator - Basic Integration', () => {
  let orchestrator: FolderLifecycleService;
  let mockFmdmService: any;
  let mockFileSystemService: any;
  let mockIndexingOrchestrator: any;
  let mockStorage: any;
  
  beforeEach(() => {
    // Mock filesystem operations for generateContentHash
    vi.mocked(readFileSync).mockImplementation((filePath) => {
      // Return different content based on file path for different hashes
      return Buffer.from(`mock content for ${filePath}`);
    });
    vi.mocked(statSync).mockImplementation((filePath) => ({
      size: 1000 + String(filePath).length, // Different size per file
      mtime: new Date('2024-01-01'),
    } as any));
    
    // Create minimal mocks
    mockFmdmService = {
      updateFolderStatus: vi.fn(),
      updateFolderProgress: vi.fn(),
      getFMDM: vi.fn(() => ({ folders: [] }))
    };
    
    mockFileSystemService = {
      scanFolder: vi.fn(),
      getFileMetadata: vi.fn(),
      getFileHash: vi.fn()
    };
    
    mockIndexingOrchestrator = {
      processFile: vi.fn(() => Promise.resolve({ success: true })),
      removeFile: vi.fn(() => Promise.resolve({ success: true }))
    };
    
    mockStorage = {
      getDocumentFingerprints: vi.fn(() => Promise.resolve(new Map())),
      removeDocument: vi.fn(() => Promise.resolve()),
      isReady: vi.fn().mockReturnValue(false), // Add missing isReady method
      buildIndex: vi.fn().mockResolvedValue(void 0), // Add missing buildIndex method
      loadIndex: vi.fn().mockResolvedValue(void 0), // Fix: Add missing loadIndex method
      addEmbeddings: vi.fn().mockResolvedValue(void 0) // Add missing addEmbeddings method
    };
    
    // Create mock logger
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      setLevel: vi.fn()
    };
    
    // Create mock file state service that ensures test files get processed
    const mockFileStateService = {
      makeProcessingDecision: vi.fn().mockImplementation((filePath: string) => {
        // For test files, always process them to satisfy test expectations
        if (filePath.includes('/test/') || filePath.includes('test-knowledge-base')) {
          return Promise.resolve({ shouldProcess: true, reason: 'Test file needs processing', action: 'process' });
        }
        return Promise.resolve({ shouldProcess: false, reason: 'File skipped', action: 'skip' });
      }),
      startProcessing: vi.fn().mockResolvedValue(undefined),
      markProcessingSuccess: vi.fn().mockResolvedValue(undefined),
      markProcessingFailure: vi.fn().mockResolvedValue(undefined),
      markFileSkipped: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({ total: 0, byState: {}, processingEfficiency: 100 })
    };

    // Create orchestrator - FIXED parameter order
    orchestrator = new FolderLifecycleService(
      'test-basic',
      '/test/path',
      mockIndexingOrchestrator,
      mockFileSystemService,    // Fixed: fileSystemService in correct position
      mockStorage,              // Fixed: sqliteVecStorage in correct position  
      mockFileStateService as any, // Added: fileStateService parameter
      mockLogger,               // Fixed: added missing logger parameter
      'test-model'              // Added: valid test model to avoid validation issues
    );

    // Mock the validateModel method to prevent actual model validation
    vi.spyOn(orchestrator as any, 'validateModel').mockResolvedValue({ valid: true });
  });
  
  afterEach(() => {
    orchestrator.dispose();
  });
  
  it('should start in scanning state and transition properly', async () => {
    // Mock successful scan
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: ['/test/file1.txt', '/test/file2.txt'],
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 100,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('test-hash');
    
    const stateChanges: string[] = [];
    orchestrator.onStateChange((state) => {
      stateChanges.push(state.status);
      console.log(`State changed to: ${state.status}`);
      if (state.errorMessage) {
        console.log('Error:', state.errorMessage);
      }
      if (state.fileEmbeddingTasks) {
        console.log('Tasks:', state.fileEmbeddingTasks);
      }
    });
    
    // Initial state should be pending
    expect(orchestrator.currentState.status).toBe('pending');
    
    // Start scanning
    await orchestrator.startScanning();
    
    // Should have transitioned to ready after scanning
    expect(stateChanges).toContain('scanning');
    expect(orchestrator.currentState.status).toBe('ready');
    expect(orchestrator.currentState.fileEmbeddingTasks.length).toBe(2);
  });
  
  it('should handle empty folder (no files)', async () => {
    // Mock empty scan
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: [],
      errors: []
    });
    
    const stateChanges: string[] = [];
    orchestrator.onStateChange((state) => {
      stateChanges.push(state.status);
    });
    
    await orchestrator.startScanning();
    
    // Should go directly to active
    expect(stateChanges).toContain('active');
    expect(orchestrator.currentState.status).toBe('active');
    expect(orchestrator.currentState.fileEmbeddingTasks.length).toBe(0);
  });
  
  it('should create correct task types', async () => {
    // Mock scan with different scenarios
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: ['/test/new.txt', '/test/existing.txt'],
      errors: []
    });
    
    // For this test, we need to set up a scenario where the intelligent scanning 
    // determines one file is new and the other is modified
    
    // Mock the file state service to return different decisions for different files
    const testFileStateService = orchestrator['fileStateService'] as any;
    testFileStateService.makeProcessingDecision.mockImplementation((filePath: string, contentHash: string) => {
      if (filePath === '/test/new.txt') {
        return Promise.resolve({ 
          shouldProcess: true, 
          reason: 'New file needs processing', 
          action: 'process' 
        });
      } else if (filePath === '/test/existing.txt') {
        return Promise.resolve({ 
          shouldProcess: true, 
          reason: 'File content changed', 
          action: 'retry' // retry action results in modified changeType
        });
      }
      return Promise.resolve({ shouldProcess: false, reason: 'File skipped', action: 'skip' });
    });
    
    // Mock metadata
    mockFileSystemService.getFileMetadata
      .mockResolvedValueOnce({ size: 100, lastModified: Date.now(), isFile: true, isDirectory: false })
      .mockResolvedValueOnce({ size: 100, lastModified: Date.now(), isFile: true, isDirectory: false });
    
    await orchestrator.startScanning();
    
    const tasks = orchestrator.currentState.fileEmbeddingTasks;
    expect(tasks.length).toBe(2);
    
    // New file should get CreateEmbeddings
    expect(tasks.find(t => t.file === '/test/new.txt')?.task).toBe('CreateEmbeddings');
    
    // Existing file with different hash should get UpdateEmbeddings
    expect(tasks.find(t => t.file === '/test/existing.txt')?.task).toBe('UpdateEmbeddings');
  });
  
  it('should process tasks and update progress', async () => {
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: ['/test/file1.txt'],
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 100,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('hash');
    
    const progressUpdates: any[] = [];
    const stateChanges: string[] = [];
    
    // Set up listeners before starting operations
    orchestrator.onProgressUpdate((progress) => {
      progressUpdates.push(progress);
    });
    
    orchestrator.onStateChange((state) => {
      stateChanges.push(state.status);
    });
    
    await orchestrator.startScanning();
    expect(orchestrator.currentState.status).toBe('ready');
    
    // Start indexing to properly transition state machine
    await orchestrator.startIndexing();
    
    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Should have progress updates
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    expect(orchestrator.currentState.status).toBe('active');
    expect(orchestrator.isComplete()).toBe(true);
  });
  
  it('should handle task failures with retry', async () => {
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: ['/test/file1.txt'],
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 100,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('hash');
    
    // Mock failure on first attempt, success on retry
    mockIndexingOrchestrator.processFile
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({ success: true });
    
    await orchestrator.startScanning();
    
    // Process task - should fail
    const taskId = orchestrator.getNextTask();
    orchestrator.startTask(taskId!);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Wait for retry delay (1 second for first retry)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Start indexing to process all tasks including retries
    await orchestrator.startIndexing();
    
    // Wait for retry processing to complete 
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if tasks actually completed
    const finalState = orchestrator.currentState;
    console.log('Final state:', finalState.status);
    console.log('Final tasks:', finalState.fileEmbeddingTasks);
    
    expect(orchestrator.currentState.status).toBe('active');
    expect(orchestrator.isComplete()).toBe(true);
  });
});