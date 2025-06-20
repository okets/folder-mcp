/**
 * Test environment setup and cleanup utilities
 */

import path from 'path';

export interface TestEnvironment {
  folderPath: string;
  tempDir?: string;
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  // Basic setup for tests
  process.env.NODE_ENV = 'test';
  
  // Use the existing test knowledge base with proper path resolution
  const folderPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-knowledge-base');
  
  return {
    folderPath
  };
}

export async function cleanupTestEnvironment(testEnv: TestEnvironment): Promise<void> {
  // Clean up any temporary resources if created
  // For now, we're using the static test knowledge base, so no cleanup needed
}