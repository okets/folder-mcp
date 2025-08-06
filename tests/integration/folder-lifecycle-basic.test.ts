/**
 * Basic Integration Tests for FolderLifecycleOrchestrator
 * 
 * Tests the core functionality with mocked services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { FolderLifecycleManagerImpl } from '../../src/application/indexing/folder-lifecycle-manager-impl.js';

describe('FolderLifecycleOrchestrator - Basic Integration', () => {
  let orchestrator: FolderLifecycleManagerImpl;
  let mockFmdmService: any;
  let mockFileSystemService: any;
  let mockIndexingOrchestrator: any;
  let mockStorage: any;
  
  beforeEach(() => {
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
      buildIndex: vi.fn().mockResolvedValue(void 0) // Add missing buildIndex method
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
    
    // Create orchestrator - FIXED parameter order
    orchestrator = new FolderLifecycleManagerImpl(
      'test-basic',
      '/test/path',
      mockIndexingOrchestrator,
      mockFileSystemService,    // Fixed: fileSystemService in correct position
      mockStorage,              // Fixed: sqliteVecStorage in correct position  
      mockLogger                // Fixed: added missing logger parameter
    );
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
    
    // Mock existing fingerprints (existing.txt already indexed)
    mockStorage.getDocumentFingerprints.mockResolvedValue(new Map([
      ['/test/existing.txt', 'old-hash']
    ]));
    
    // Mock metadata
    mockFileSystemService.getFileMetadata
      .mockResolvedValueOnce({ size: 100, lastModified: Date.now(), isFile: true, isDirectory: false })
      .mockResolvedValueOnce({ size: 100, lastModified: Date.now(), isFile: true, isDirectory: false });
    
    mockFileSystemService.getFileHash
      .mockResolvedValueOnce('new-hash')
      .mockResolvedValueOnce('updated-hash');
    
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