/**
 * Real-World E2E File Watching Scenarios
 * 
 * End-to-end tests that simulate realistic file watching scenarios
 * that users would encounter in production.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../helpers/test-utils.js';
import { setupDependencyInjection } from '../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../src/di/interfaces.js';
import type { MonitoringWorkflow } from '../../src/application/monitoring/index.js';
import type { IndexingWorkflow } from '../../src/application/indexing/index.js';
import fs from 'fs/promises';
import path from 'path';

// Sleep utility for testing


describe('Real-World E2E File Watching Scenarios', () => {
  let tempDir: string;
  let container: any;
  let monitoringWorkflow: MonitoringWorkflow;
  let indexingWorkflow: IndexingWorkflow;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('e2e-file-watching-');
    container = await setupDependencyInjection();
    monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
    indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
  });

  afterEach(async () => {
    try {
      await monitoringWorkflow.stopFileWatching(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
    
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  describe('Document Management Scenarios', () => {
    it('should handle document creation workflow', async () => {
      // Start file watching
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md', '.pdf', '.docx'],
        excludePatterns: ['temp', 'draft'],
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      });

      expect(startResult.success).toBe(true);

      // Simulate user creating a new document
      const documentPath = path.join(tempDir, 'project-requirements.md');
      await fs.writeFile(documentPath, `# Project Requirements

## Overview
This document outlines the requirements for the new project.

## Features
- Feature 1: User authentication
- Feature 2: Data management
- Feature 3: Reporting system

## Timeline
Project completion expected by Q2 2025.
`);

      // Wait for processing
      await TestUtils.sleep(1200);

      // Verify document was detected and processed
      const content = await fs.readFile(documentPath, 'utf8');
      expect(content).toContain('Project Requirements');
      expect(content).toContain('User authentication');

      // Simulate user updating the document
      await fs.writeFile(documentPath, `# Project Requirements (Updated)

## Overview
This document outlines the requirements for the new project.
**Last updated: ${new Date().toISOString()}**

## Features
- Feature 1: User authentication ✓
- Feature 2: Data management (in progress)
- Feature 3: Reporting system
- Feature 4: API integration (new)

## Timeline
Project completion expected by Q2 2025.
`);

      await TestUtils.sleep(1200);

      // Verify update was processed
      const updatedContent = await fs.readFile(documentPath, 'utf8');
      expect(updatedContent).toContain('Updated');
      expect(updatedContent).toContain('API integration');
    });

    it('should handle batch document imports', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: [],
        debounceMs: 2000, // Longer debounce for batch processing
        enableBatchProcessing: true,
        batchSize: 5
      });

      // Simulate importing multiple documents at once
      const documents = [
        { name: 'user-guide.md', content: '# User Guide\n\nHow to use the application...' },
        { name: 'api-docs.md', content: '# API Documentation\n\nAPI endpoints and usage...' },
        { name: 'changelog.txt', content: 'v1.0.0 - Initial release\nv1.1.0 - Bug fixes...' },
        { name: 'readme.md', content: '# Project README\n\nInstallation and setup...' },
        { name: 'contributing.md', content: '# Contributing\n\nGuidelines for contributors...' },
      ];

      // Create all documents simultaneously (batch import scenario)
      await Promise.all(
        documents.map(doc => 
          fs.writeFile(path.join(tempDir, doc.name), doc.content)
        )
      );

      // Wait for batch processing
      await TestUtils.sleep(2500);

      // Verify all documents were processed
      for (const doc of documents) {
        const filePath = path.join(tempDir, doc.name);
        const content = await fs.readFile(filePath, 'utf8');
        expect(content).toBe(doc.content);
      }

      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
      expect(status.eventsProcessed).toBeGreaterThan(0);
    });
  });

  describe('Development Workflow Scenarios', () => {
    it('should handle code documentation updates', async () => {
      // Start file watching for documentation files
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.md', '.txt'],
        excludePatterns: ['node_modules', '.git', 'dist', 'build'],
        debounceMs: 500,
        enableBatchProcessing: true
      });

      // Create documentation structure
      const docsDir = path.join(tempDir, 'docs');
      await fs.mkdir(docsDir);

      const files = [
        { path: path.join(docsDir, 'installation.md'), content: '# Installation\n\nSteps to install...' },
        { path: path.join(docsDir, 'configuration.md'), content: '# Configuration\n\nHow to configure...' },
        { path: path.join(tempDir, 'README.md'), content: '# Main Project\n\nProject overview...' },
      ];

      // Create documentation files
      for (const file of files) {
        await fs.writeFile(file.path, file.content);
      }

      await TestUtils.sleep(800);

      // Simulate developer updating documentation
      const readmePath = path.join(tempDir, 'README.md');
      await fs.writeFile(readmePath, `# Main Project (Updated)

## Overview
Project overview with new features...

## Quick Start
1. Install dependencies
2. Configure settings
3. Run the application

## Documentation
See the docs/ folder for detailed documentation.
`);

      await TestUtils.sleep(800);

      // Verify updates were processed
      const updatedReadme = await fs.readFile(readmePath, 'utf8');
      expect(updatedReadme).toContain('Quick Start');
      expect(updatedReadme).toContain('Updated');
    });

    it('should ignore development artifacts', async () => {
      // Start file watching with typical development exclusions
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: ['node_modules', '.git', 'dist', 'build', 'coverage', '.nyc_output'],
        debounceMs: 500
      });

      // Create development structure
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      const gitDir = path.join(tempDir, '.git');
      const distDir = path.join(tempDir, 'dist');

      await fs.mkdir(nodeModulesDir);
      await fs.mkdir(gitDir);
      await fs.mkdir(distDir);

      // Create files that should be ignored
      const ignoredFiles = [
        path.join(nodeModulesDir, 'package.txt'),
        path.join(gitDir, 'config.txt'),
        path.join(distDir, 'output.txt'),
      ];

      // Create files that should be watched
      const watchedFiles = [
        path.join(tempDir, 'documentation.md'),
        path.join(tempDir, 'notes.txt'),
      ];

      // Create all files
      await Promise.all([
        ...ignoredFiles.map(file => fs.writeFile(file, 'Should be ignored')),
        ...watchedFiles.map(file => fs.writeFile(file, 'Should be watched')),
      ]);

      await TestUtils.sleep(800);

      // Verify all files exist
      for (const file of [...ignoredFiles, ...watchedFiles]) {
        expect(await fs.access(file)).resolves.not.toThrow();
      }

      // File watching should still be active and only processed watched files
      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
    });
  });

  describe('Content Management Scenarios', () => {
    it('should handle content creation and editing workflow', async () => {
      // Start file watching for content files
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.md', '.txt'],
        excludePatterns: ['drafts', 'temp'],
        debounceMs: 1000,
        enableBatchProcessing: true
      });

      // Simulate content creation workflow
      const contentDir = path.join(tempDir, 'content');
      await fs.mkdir(contentDir);

      // Create initial content
      const articlePath = path.join(contentDir, 'article-1.md');
      await fs.writeFile(articlePath, `# Understanding File Watching

File watching is a crucial feature for real-time content management systems.

## Benefits
- Automatic content updates
- Real-time search indexing
- Improved user experience

## Implementation
The system uses efficient file system monitoring to detect changes.
`);

      await TestUtils.sleep(1200);

      // Simulate content editor making revisions
      await fs.writeFile(articlePath, `# Understanding File Watching (Revised)

File watching is a crucial feature for real-time content management systems.
This article has been updated with new information.

## Benefits
- Automatic content updates
- Real-time search indexing
- Improved user experience
- Reduced manual intervention

## Implementation
The system uses efficient file system monitoring to detect changes.
Advanced debouncing ensures optimal performance.

## Best Practices
- Configure appropriate debounce intervals
- Use file type filtering
- Implement proper error handling
`);

      await TestUtils.sleep(1200);

      // Verify content was updated
      const updatedContent = await fs.readFile(articlePath, 'utf8');
      expect(updatedContent).toContain('Revised');
      expect(updatedContent).toContain('Best Practices');
      expect(updatedContent).toContain('Advanced debouncing');
    });

    it('should handle multiple content editors working simultaneously', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.md', '.txt'],
        excludePatterns: [],
        debounceMs: 1500, // Longer debounce for multiple editors
        enableBatchProcessing: true,
        batchSize: 10
      });

      // Simulate multiple editors creating content simultaneously
      const editorFiles = [
        { editor: 'alice', file: 'alice-article.md', content: '# Article by Alice\n\nAlice is writing about topic A...' },
        { editor: 'bob', file: 'bob-guide.md', content: '# Guide by Bob\n\nBob is creating a comprehensive guide...' },
        { editor: 'charlie', file: 'charlie-notes.txt', content: 'Charlie\'s notes on the project requirements...' },
      ];

      // All editors create files at the same time
      await Promise.all(
        editorFiles.map(({ file, content }) => 
          fs.writeFile(path.join(tempDir, file), content)
        )
      );

      // Simulate concurrent editing
      await TestUtils.sleep(500);

      // All editors update their files
      await Promise.all(
        editorFiles.map(({ file, content, editor }) => 
          fs.writeFile(path.join(tempDir, file), `${content}\n\nUpdated by ${editor} at ${new Date().toISOString()}`)
        )
      );

      // Wait for batch processing
      await TestUtils.sleep(2000);

      // Verify all files were processed
      for (const { file, editor } of editorFiles) {
        const filePath = path.join(tempDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        expect(content).toContain(`Updated by ${editor}`);
        expect(content).toContain(new Date().toISOString().split('T')[0]); // Check date
      }

      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
      expect(status.eventsProcessed).toBeGreaterThan(0);
    });
  });

  describe('File Organization Scenarios', () => {
    it('should handle file moves and renames', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: [],
        debounceMs: 500
      });

      // Create initial file
      const originalPath = path.join(tempDir, 'original-document.txt');
      await fs.writeFile(originalPath, 'This is the original document content.');

      await TestUtils.sleep(800);

      // Simulate file rename
      const renamedPath = path.join(tempDir, 'renamed-document.txt');
      await fs.rename(originalPath, renamedPath);

      await TestUtils.sleep(800);

      // Verify rename was handled
      await expect(fs.access(originalPath)).rejects.toThrow();
      expect(await fs.access(renamedPath)).resolves.not.toThrow();

      const content = await fs.readFile(renamedPath, 'utf8');
      expect(content).toBe('This is the original document content.');
    });

    it('should handle directory restructuring', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: [],
        debounceMs: 800
      });

      // Create initial structure
      const oldDir = path.join(tempDir, 'old-structure');
      const newDir = path.join(tempDir, 'new-structure');
      
      await fs.mkdir(oldDir);

      const files = [
        path.join(oldDir, 'file1.txt'),
        path.join(oldDir, 'file2.md'),
      ];

      await Promise.all(
        files.map((file, i) => fs.writeFile(file, `Content of file ${i + 1}`))
      );

      await TestUtils.sleep(1000);

      // Simulate directory restructuring
      await fs.mkdir(newDir);

      // Move files to new structure
      await fs.rename(files[0], path.join(newDir, 'file1.txt'));
      await fs.rename(files[1], path.join(newDir, 'file2.md'));

      // Remove old directory
      await fs.rmdir(oldDir);

      await TestUtils.sleep(1000);

      // Verify new structure
      const newFiles = [
        path.join(newDir, 'file1.txt'),
        path.join(newDir, 'file2.md'),
      ];

      for (let i = 0; i < newFiles.length; i++) {
        const content = await fs.readFile(newFiles[i], 'utf8');
        expect(content).toBe(`Content of file ${i + 1}`);
      }

      // Verify old structure is gone
      await expect(fs.access(oldDir)).rejects.toThrow();
    });
  });

  describe('Performance and Scale Scenarios', () => {
    it('should handle large file operations efficiently', async () => {
      // Start file watching with optimized settings
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 2000, // Longer debounce for large operations
        enableBatchProcessing: true,
        batchSize: 20
      });

      // Create large content
      const largeContent = 'Lorem ipsum '.repeat(1000) + '\n'.repeat(100);
      const largeFiles = Array.from({ length: 15 }, (_, i) => ({
        path: path.join(tempDir, `large-file-${i}.txt`),
        content: `${largeContent}\n\nFile number: ${i}\nTimestamp: ${Date.now()}`
      }));

      const startTime = Date.now();

      // Create all large files
      await Promise.all(
        largeFiles.map(({ path, content }) => fs.writeFile(path, content))
      );

      // Wait for processing
      await TestUtils.sleep(3000);

      const processingTime = Date.now() - startTime;

      // Verify all files were created
      for (const { path: filePath } of largeFiles) {
        expect(await fs.access(filePath)).resolves.not.toThrow();
      }

      // Performance should be reasonable (under 10 seconds for this test)
      expect(processingTime).toBeLessThan(10000);

      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
      expect(status.eventsProcessed).toBeGreaterThan(0);
    });

    it('should maintain performance with continuous file activity', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 300,
        enableBatchProcessing: true,
        batchSize: 5
      });

      // Simulate continuous file activity over time
      const activityFile = path.join(tempDir, 'activity-log.txt');
      let logContent = 'Activity Log Started\n';

      // Initial file creation
      await fs.writeFile(activityFile, logContent);
      await TestUtils.sleep(400);

      // Simulate periodic updates
      for (let i = 0; i < 10; i++) {
        logContent += `Activity ${i + 1} at ${new Date().toISOString()}\n`;
        await fs.writeFile(activityFile, logContent);
        await TestUtils.sleep(200); // Rapid updates
      }

      // Wait for final processing
      await TestUtils.sleep(500);

      // Verify final content
      const finalContent = await fs.readFile(activityFile, 'utf8');
      expect(finalContent).toContain('Activity Log Started');
      expect(finalContent).toContain('Activity 10');

      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
      expect(status.eventsProcessed).toBeGreaterThan(0);
    });
  });
});
