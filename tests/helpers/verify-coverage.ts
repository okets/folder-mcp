#!/usr/bin/env node

/**
 * Coverage Verification Script
 * 
 * Run this to verify no tests are dropped during consolidation
 */

import { extractTestsFromFile, generateCoverageReport, verifyUniqueScenarios } from './test-coverage-tracker.js';
import path from 'path';
import { existsSync } from 'fs';

const ORIGINAL_PYTHON_TEST_FILES = [
  'tests/integration/services/python-embedding-keep-alive.test.ts',
  'tests/integration/services/python-keep-alive-lifecycle.test.ts', 
  'tests/integration/services/python-crawling-pause.test.ts',
  'tests/integration/services/python-embeddings-comprehensive.test.ts',
  'tests/integration/services/python-embeddings-focused.test.ts'
];

const CONSOLIDATED_FILE = 'tests/integration/services/python-embeddings.test.ts';

async function main() {
  console.log('🔍 Test Coverage Verification\n');

  // Check if consolidated file exists
  const consolidatedPath = path.join(process.cwd(), CONSOLIDATED_FILE);
  const hasConsolidated = existsSync(consolidatedPath);

  // Count tests in original files
  let totalOriginal = 0;
  const testsByFile: Record<string, number> = {};

  console.log('📊 Original Test Files:');
  for (const file of ORIGINAL_PYTHON_TEST_FILES) {
    const filePath = path.join(process.cwd(), file);
    if (existsSync(filePath)) {
      const tests = await extractTestsFromFile(filePath);
      testsByFile[file] = tests.length;
      totalOriginal += tests.length;
      console.log(`  - ${path.basename(file)}: ${tests.length} tests`);
    }
  }
  console.log(`  Total: ${totalOriginal} tests\n`);

  if (hasConsolidated) {
    // Generate coverage report
    const report = await generateCoverageReport(
      ORIGINAL_PYTHON_TEST_FILES.map(f => path.join(process.cwd(), f)),
      consolidatedPath
    );

    console.log('✅ Consolidated Test File:');
    console.log(`  - ${path.basename(CONSOLIDATED_FILE)}: ${report.consolidatedCount} tests`);
    console.log(`  - Coverage: ${report.coverage.toFixed(1)}%\n`);

    if (report.duplicateTests.length > 0) {
      console.log(`📋 Duplicate Tests Found (${report.duplicateTests.length}):`);
      const duplicates = new Set(report.duplicateTests.map(t => t.name));
      duplicates.forEach(name => console.log(`  - "${name}"`));
      console.log();
    }

    if (report.missingTests.length > 0) {
      console.log(`❌ Missing Tests (${report.missingTests.length}):`);
      report.missingTests.forEach(test => {
        console.log(`  - "${test.name}" from ${path.basename(test.file)}`);
      });
      console.log();
    }

    // Verify unique scenarios
    const consolidatedTests = await extractTestsFromFile(consolidatedPath);
    const scenarios = verifyUniqueScenarios(consolidatedTests);

    if (scenarios.missing.length > 0) {
      console.log('⚠️  Missing Unique Scenarios:');
      scenarios.missing.forEach(s => console.log(`  - ${s}`));
      console.log();
    }

    // Summary
    const deduplicatedOriginal = totalOriginal - report.duplicateTests.length;
    console.log('📈 Summary:');
    console.log(`  - Original tests: ${totalOriginal} (${deduplicatedOriginal} unique)`);
    console.log(`  - Consolidated tests: ${report.consolidatedCount}`);
    console.log(`  - Test reduction: ${((1 - report.consolidatedCount / deduplicatedOriginal) * 100).toFixed(1)}%`);
    console.log(`  - File reduction: 5 files → 1 file (80% fewer files)`);

    if (report.missingTests.length === 0 && scenarios.missing.length === 0) {
      console.log('\n✅ All tests and unique scenarios preserved!');
    } else {
      console.log('\n❌ Some tests or scenarios are missing. Review before proceeding.');
      process.exit(1);
    }
  } else {
    console.log('ℹ️  Consolidated file not found. Run this after consolidation to verify coverage.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}