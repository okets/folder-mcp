/**
 * Test Coverage Tracking System
 * 
 * Ensures no tests are dropped during consolidation by tracking:
 * - Original test locations
 * - Consolidated destinations
 * - Test categories and unique features
 */

import { promises as fs } from 'fs';

export interface TestInfo {
  name: string;
  file: string;
  line: number;
  category: string;
  isUnique?: boolean;
  uniqueFeature?: string;
}

export interface TestMapping {
  original: string[];
  consolidated: string;
  category: string;
  implementation?: string;
  uniqueFeatures?: string[];
}

// Comprehensive mapping of all Python embedding tests
export const PYTHON_EMBEDDING_TEST_MAPPINGS: Record<string, TestMapping> = {
  // Environment and Setup Tests
  'python-script-exists': {
    original: ['keep-alive', 'lifecycle', 'comprehensive', 'focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'environment'
  },
  'service-configuration': {
    original: ['keep-alive', 'lifecycle', 'comprehensive', 'focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'environment'
  },

  // Keep-Alive Specific Tests
  'keep-alive-process-tracking': {
    original: ['keep-alive', 'lifecycle'],
    consolidated: 'python-embeddings.test.ts',
    category: 'lifecycle',
    implementation: 'Track PID across entire test suite',
    uniqueFeatures: ['Process PID tracking', 'Restart count verification']
  },
  'keep-alive-configuration': {
    original: ['keep-alive', 'lifecycle'],
    consolidated: 'python-embeddings.test.ts',
    category: 'lifecycle'
  },

  // Crawling Pause Specific Tests
  'crawling-pause-mechanism': {
    original: ['crawling-pause'],
    consolidated: 'python-embeddings.test.ts',
    category: 'priority',
    uniqueFeatures: ['Pause and resume pattern', 'Timing analysis']
  },
  'priority-request-timing': {
    original: ['crawling-pause'],
    consolidated: 'python-embeddings.test.ts',
    category: 'priority',
    implementation: 'Track request timings for immediate vs batch'
  },

  // Lifecycle Management
  'initialization': {
    original: ['keep-alive', 'lifecycle', 'comprehensive', 'focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'lifecycle'
  },
  'health-checks': {
    original: ['keep-alive', 'lifecycle', 'comprehensive', 'focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'lifecycle'
  },
  'graceful-shutdown': {
    original: ['keep-alive', 'lifecycle', 'comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'lifecycle'
  },
  'restart-attempts': {
    original: ['lifecycle'],
    consolidated: 'python-embeddings.test.ts',
    category: 'lifecycle',
    uniqueFeatures: ['Restart count tracking', 'Recovery behavior']
  },

  // Model Management
  'model-cache-check': {
    original: ['comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'models'
  },
  'model-download': {
    original: ['keep-alive', 'lifecycle', 'comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'models'
  },
  'unsupported-models': {
    original: ['keep-alive', 'comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'models'
  },

  // Embedding Generation
  'single-embedding': {
    original: ['comprehensive', 'focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'embeddings'
  },
  'batch-embeddings': {
    original: ['comprehensive', 'focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'embeddings'
  },
  'immediate-vs-batch-priority': {
    original: ['keep-alive', 'lifecycle', 'crawling-pause'],
    consolidated: 'python-embeddings.test.ts',
    category: 'priority',
    implementation: 'Comprehensive timing comparison'
  },
  'similarity-calculation': {
    original: ['comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'embeddings'
  },

  // Error Handling
  'empty-text': {
    original: ['comprehensive', 'focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'errors'
  },
  'long-text': {
    original: ['comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'errors'
  },
  'invalid-input': {
    original: ['focused'],
    consolidated: 'python-embeddings.test.ts',
    category: 'errors'
  },

  // Service Statistics
  'service-stats': {
    original: ['lifecycle', 'comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'monitoring'
  },
  'processing-time-estimation': {
    original: ['comprehensive'],
    consolidated: 'python-embeddings.test.ts',
    category: 'monitoring'
  }
};

/**
 * Extract test information from a test file
 */
export async function extractTestsFromFile(filePath: string): Promise<TestInfo[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const tests: TestInfo[] = [];

  // Use regex to find test definitions (only it/test, not describe)
  const regex = /(it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  let lineNum = 1;
  const lines = content.split('\n');
  
  for (const line of lines) {
    regex.lastIndex = 0; // Reset regex state
    while ((match = regex.exec(line)) !== null) {
      const testName = match[2] || '';
      tests.push({
        name: testName,
        file: filePath,
        line: lineNum,
        category: determineCategory(testName)
      });
    }
    lineNum++;
  }

  return tests;
}

/**
 * Determine test category from test name
 */
function determineCategory(testName: string): string {
  const name = testName.toLowerCase();
  
  if (name.includes('environment') || name.includes('script') || name.includes('config')) {
    return 'environment';
  }
  if (name.includes('lifecycle') || name.includes('init') || name.includes('shutdown')) {
    return 'lifecycle';
  }
  if (name.includes('keep-alive') || name.includes('restart')) {
    return 'lifecycle';
  }
  if (name.includes('priority') || name.includes('immediate') || name.includes('batch')) {
    return 'priority';
  }
  if (name.includes('crawling') || name.includes('pause')) {
    return 'priority';
  }
  if (name.includes('model') || name.includes('download')) {
    return 'models';
  }
  if (name.includes('embedding') || name.includes('similarity')) {
    return 'embeddings';
  }
  if (name.includes('error') || name.includes('empty') || name.includes('invalid')) {
    return 'errors';
  }
  if (name.includes('stats') || name.includes('monitor') || name.includes('health')) {
    return 'monitoring';
  }
  
  return 'general';
}

/**
 * Generate coverage report comparing original vs consolidated tests
 */
export async function generateCoverageReport(
  originalFiles: string[],
  consolidatedFile: string
): Promise<{
  originalCount: number;
  consolidatedCount: number;
  coverage: number;
  missingTests: TestInfo[];
  duplicateTests: TestInfo[];
  uniqueFeatures: string[];
}> {
  // Extract tests from all original files
  const originalTests: TestInfo[] = [];
  for (const file of originalFiles) {
    const tests = await extractTestsFromFile(file);
    originalTests.push(...tests);
  }

  // Extract tests from consolidated file
  const consolidatedTests = await extractTestsFromFile(consolidatedFile);

  // Find missing tests
  const missingTests = originalTests.filter(orig => 
    !consolidatedTests.some(cons => 
      cons.name.includes(orig.name) || orig.name.includes(cons.name)
    )
  );

  // Find duplicate tests (same test in multiple original files)
  const duplicateTests: TestInfo[] = [];
  const seen = new Map<string, TestInfo>();
  
  for (const test of originalTests) {
    const key = test.name.toLowerCase();
    if (seen.has(key)) {
      duplicateTests.push(test);
    } else {
      seen.set(key, test);
    }
  }

  // Extract unique features from mappings
  const uniqueFeatures: string[] = [];
  for (const mapping of Object.values(PYTHON_EMBEDDING_TEST_MAPPINGS)) {
    if (mapping.uniqueFeatures) {
      uniqueFeatures.push(...mapping.uniqueFeatures);
    }
  }

  const coverage = consolidatedTests.length / (originalTests.length - duplicateTests.length);

  return {
    originalCount: originalTests.length,
    consolidatedCount: consolidatedTests.length,
    coverage: coverage * 100,
    missingTests,
    duplicateTests,
    uniqueFeatures
  };
}

/**
 * Verify that all unique test scenarios are preserved
 */
export function verifyUniqueScenarios(consolidatedTests: TestInfo[]): {
  preserved: string[];
  missing: string[];
} {
  const preserved: string[] = [];
  const missing: string[] = [];

  // Check each unique feature
  for (const [testId, mapping] of Object.entries(PYTHON_EMBEDDING_TEST_MAPPINGS)) {
    if (mapping.uniqueFeatures) {
      for (const feature of mapping.uniqueFeatures) {
        const found = consolidatedTests.some(test => 
          test.name.toLowerCase().includes(feature.toLowerCase())
        );
        
        if (found) {
          preserved.push(feature);
        } else {
          missing.push(feature);
        }
      }
    }
  }

  return { preserved, missing };
}