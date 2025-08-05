/**
 * Simple Real File Tests for FolderLifecycleOrchestrator
 * 
 * Tests basic lifecycle without embeddings dependency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { FolderLifecycleOrchestratorImpl } from '../../src/application/indexing/folder-lifecycle-orchestrator-impl.js';
import { FolderTaskQueue } from '../../src/domain/folders/folder-task-queue.js';
import { FolderLifecycleStateMachine } from '../../src/domain/folders/folder-lifecycle-state-machine.js';
import { existsSync, rmSync } from 'fs';

describe('FolderLifecycleOrchestrator - Simple Real File Tests', () => {
  const testKnowledgeBase = join(process.cwd(), 'tests/fixtures/test-knowledge-base');
  
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
      getDocumentFingerprints: vi.fn(() => Promise.resolve(new Map()))
    };
    
    // Create orchestrator
    orchestrator = new FolderLifecycleOrchestratorImpl(
      'test-simple',
      testKnowledgeBase,
      mockIndexingOrchestrator,
      mockFmdmService,
      mockFileSystemService,
      mockStorage
    );
  });
  
  afterEach(() => {
    orchestrator.dispose();
  });
  
  it('should scan real test knowledge base and find files', async () => {
    // Mock file system scan to return real files
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: [
        join(testKnowledgeBase, 'Technology/AI_Research.pdf'),
        join(testKnowledgeBase, 'Technology/Cloud_Architecture.docx'),
        join(testKnowledgeBase, 'Business/Q1_Sales_Report.xlsx'),
        join(testKnowledgeBase, 'Business/Marketing_Strategy.pptx'),
        join(testKnowledgeBase, 'Legal/Contract_Template.docx'),
        join(testKnowledgeBase, 'README.txt')
      ],
      errors: []
    });
    
    // Mock file metadata
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 1024,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('test-hash');
    
    const stateChanges: string[] = [];
    orchestrator.onStateChange((state) => {
      stateChanges.push(state.status);
    });
    
    // Start scanning
    await orchestrator.startScanning();
    
    // Verify state transitions
    expect(stateChanges).toContain('scanning');
    expect(orchestrator.currentState.status).toBe('indexing');
    
    // Verify files were detected
    const state = orchestrator.currentState;
    expect(state.fileEmbeddingTasks.length).toBe(6);
    
    // Verify file types were detected correctly
    const fileTypes = new Set(
      state.fileEmbeddingTasks.map((t: any) => t.file.split('.').pop()?.toLowerCase())
    );
    expect(fileTypes).toContain('pdf');
    expect(fileTypes).toContain('docx');
    expect(fileTypes).toContain('xlsx');
    expect(fileTypes).toContain('pptx');
    expect(fileTypes).toContain('txt');
  });
  
  it('should create tasks for each detected file', async () => {
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: [
        join(testKnowledgeBase, 'doc1.pdf'),
        join(testKnowledgeBase, 'doc2.docx'),
        join(testKnowledgeBase, 'doc3.txt')
      ],
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 1024,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('test-hash');
    
    await orchestrator.startScanning();
    
    const state = orchestrator.currentState;
    
    // Verify tasks were created
    expect(state.fileEmbeddingTasks).toHaveLength(3);
    expect(state.fileEmbeddingTasks[0]?.task).toBe('CreateEmbeddings');
    expect(state.fileEmbeddingTasks[0]?.status).toBe('pending');
    expect(state.fileEmbeddingTasks[0]?.file).toContain('doc1.pdf');
    
    // Verify task queue
    expect(orchestrator.getNextTask()).toBeDefined();
  });
  
  it('should process tasks and update progress', async () => {
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: [
        join(testKnowledgeBase, 'file1.txt'),
        join(testKnowledgeBase, 'file2.txt')
      ],
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 100,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('hash');
    
    const progressUpdates: number[] = [];
    orchestrator.onProgressUpdate((progress) => {
      progressUpdates.push(progress.percentage);
    });
    
    await orchestrator.startScanning();
    
    // Process first task
    const task1 = orchestrator.getNextTask();
    expect(task1).toBeDefined();
    orchestrator.startTask(task1!);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check progress
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(50);
    
    // Process second task
    const task2 = orchestrator.getNextTask();
    expect(task2).toBeDefined();
    orchestrator.startTask(task2!);
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Should be complete
    expect(orchestrator.isComplete()).toBe(true);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });
  
  it('should handle scan errors gracefully', async () => {
    mockFileSystemService.scanFolder.mockRejectedValue(
      new Error('Permission denied')
    );
    
    const stateChanges: string[] = [];
    orchestrator.onStateChange((state) => {
      stateChanges.push(state.status);
    });
    
    await orchestrator.startScanning();
    
    // Should transition to error state
    expect(stateChanges).toContain('error');
    expect(orchestrator.currentState.status).toBe('error');
  });
  
  it('should respect concurrency limits', async () => {
    // Create 10 files
    const files = Array.from({ length: 10 }, (_, i) => 
      join(testKnowledgeBase, `file${i}.txt`)
    );
    
    mockFileSystemService.scanFolder.mockResolvedValue({
      files,
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 100,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('hash');
    
    await orchestrator.startScanning();
    
    // Start multiple tasks up to concurrency limit (3)
    const taskIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const taskId = orchestrator.getNextTask();
      if (taskId) {
        orchestrator.startTask(taskId);
        taskIds.push(taskId);
      }
    }
    
    // Should only start 2 tasks (concurrency limit)
    expect(taskIds.length).toBe(2);
    
    // Verify in-progress count
    const state = orchestrator.currentState;
    const inProgress = state.fileEmbeddingTasks.filter((t: any) => t.status === 'in-progress');
    expect(inProgress.length).toBe(2);
  });
});