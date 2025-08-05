/**
 * Basic Integration Tests for FolderLifecycleOrchestrator
 * 
 * Tests the core functionality with mocked services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { FolderLifecycleOrchestratorImpl } from '../../src/application/indexing/folder-lifecycle-orchestrator-impl.js';

describe('FolderLifecycleOrchestrator - Basic Integration', () => {
  let orchestrator: FolderLifecycleOrchestratorImpl;
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
      removeDocument: vi.fn(() => Promise.resolve())
    };
    
    // Create orchestrator
    orchestrator = new FolderLifecycleOrchestratorImpl(
      'test-basic',
      '/test/path',
      mockIndexingOrchestrator,
      mockFmdmService,
      mockFileSystemService,
      mockStorage
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
    
    // Initial state should be scanning
    expect(orchestrator.currentState.status).toBe('scanning');
    
    // Start scanning
    await orchestrator.startScanning();
    
    // Should have transitioned
    expect(stateChanges).toContain('scanning');
    expect(orchestrator.currentState.status).toBe('indexing');
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
    orchestrator.onProgressUpdate((progress) => {
      progressUpdates.push(progress);
    });
    
    await orchestrator.startScanning();
    
    // Get and start the task
    const taskId = orchestrator.getNextTask();
    expect(taskId).toBeDefined();
    
    orchestrator.startTask(taskId!);
    
    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should have progress updates
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
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
    
    // Task should be retryable
    const retryTaskId = orchestrator.getNextTask();
    expect(retryTaskId).toBeDefined();
    
    // Process retry - should succeed
    orchestrator.startTask(retryTaskId!);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if tasks actually completed
    const finalState = orchestrator.currentState;
    console.log('Final state:', finalState.status);
    console.log('Final tasks:', finalState.fileEmbeddingTasks);
    
    expect(orchestrator.isComplete()).toBe(true);
    expect(orchestrator.currentState.status).toBe('active');
  });
});