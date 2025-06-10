#!/usr/bin/env node

/**
 * Test Runner - Executes all test phases in sequence
 * Provides a comprehensive overview of the entire test suite
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class TestRunner {
  constructor() {
    this.phases = [
      { name: 'Phase 1: Foundation', file: 'test-phase1-foundation.js' },
      { name: 'Phase 2: Parsing', file: 'test-phase2-parsing.js' },
      { name: 'Phase 3: Processing', file: 'test-phase3-processing.js' },
      { name: 'Phase 4: Search', file: 'test-phase4-search.js' },
      { name: 'Phase 5: MCP', file: 'test-phase5-mcp.js' },
      { name: 'Phase 6: Real-time', file: 'test-phase6-realtime.js' },
      { name: 'Phase 7: Production', file: 'test-phase7-production.js' },
      { name: 'Phase 8: UX & Configuration', file: 'test-phase8-ux.js' }
    ];
    this.results = [];
    this.phaseDetails = {}; // Store detailed results for each phase
  }

  async runAllTests() {
    console.log('🧪 FOLDER-MCP COMPREHENSIVE TEST SUITE');
    console.log('=====================================\n');

    const startTime = Date.now();

    for (const phase of this.phases) {
      console.log(`🚀 Running ${phase.name}...`);
      console.log('─'.repeat(50));
      
      try {
        const result = execSync(`node ${phase.file}`, {
          cwd: __dirname,
          encoding: 'utf8',
          timeout: 300000 // 5 minute timeout per phase
        });
        
        // Parse the phase output to extract test details
        this.parsePhaseOutput(phase.name, result);
        
        this.results.push({ phase: phase.name, status: 'PASSED' });
        console.log(result); // Print the output to console
        console.log(`✅ ${phase.name} completed successfully\n`);
        
      } catch (error) {
        // Even if phase fails, try to parse any output we got
        if (error.stdout) {
          this.parsePhaseOutput(phase.name, error.stdout);
          console.log(error.stdout);
        }
        if (error.stderr) {
          console.log(error.stderr);
        }
        
        this.results.push({ 
          phase: phase.name, 
          status: 'FAILED', 
          exitCode: error.status 
        });
        console.log(`❌ ${phase.name} failed with exit code ${error.status}\n`);
      }
    }

    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);

    this.printSummary(totalTime);
  }

  parsePhaseOutput(phaseName, output) {
    // Extract test counts and results from the phase output
    const lines = output.split('\n');
    let testsPassed = 0;
    let testsTotal = 0;
    let details = [];
    
    // Look for test result patterns in the output
    for (const line of lines) {
      // Match patterns like "✅ Test: Description" or "❌ Test: Description"
      if (line.includes('✅') || line.includes('❌')) {
        const isPass = line.includes('✅');
        if (isPass) testsPassed++;
        testsTotal++;
        
        // Extract test description
        const testDesc = line.replace(/[✅❌]\s*/, '').trim();
        details.push({
          status: isPass ? 'PASS' : 'FAIL',
          description: testDesc
        });
      }
      
      // Also look for summary lines like "Tests passed: X/Y"
      const summaryMatch = line.match(/Tests?\s+passed:\s*(\d+)\/(\d+)/i);
      if (summaryMatch) {
        testsPassed = parseInt(summaryMatch[1]);
        testsTotal = parseInt(summaryMatch[2]);
      }
    }
    
    // Store the parsed details
    this.phaseDetails[phaseName] = {
      passed: testsPassed,
      total: testsTotal,
      details: details,
      successRate: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0
    };
  }

  generateTestSummary(totalTime) {
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let totalTests = 0;
    let totalPassed = 0;
    let allPhasesPassed = true;
    
    // Calculate totals
    for (const result of this.results) {
      if (result.status === 'PASSED') {
        const phaseData = this.phaseDetails[result.phase];
        if (phaseData) {
          totalPassed += phaseData.passed;
          totalTests += phaseData.total;
        }
      } else {
        allPhasesPassed = false;
        const phaseData = this.phaseDetails[result.phase];
        if (phaseData) {
          totalPassed += phaseData.passed;
          totalTests += phaseData.total;
        }
      }
    }
    
    const overallSuccessRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    // Generate markdown content
    let markdown = `# Test Execution Summary\n\n`;
    markdown += `**Generated:** ${timestamp}  \n`;
    markdown += `**Execution Time:** ${totalTime}s  \n`;
    markdown += `**Version:** Auto-generated from test run  \n\n`;
    
    markdown += `## Overall Results\n\n`;
    markdown += `- **Total Tests:** ${totalTests}\n`;
    markdown += `- **Passed:** ${totalPassed}\n`;
    markdown += `- **Failed:** ${totalTests - totalPassed}\n`;
    markdown += `- **Success Rate:** ${overallSuccessRate}%\n`;
    markdown += `- **Status:** ${allPhasesPassed && overallSuccessRate === 100 ? 'COMPLETE & PRODUCTION READY' : overallSuccessRate >= 90 ? 'EXCELLENT' : overallSuccessRate >= 80 ? 'GOOD' : 'NEEDS ATTENTION'}\n\n`;
    
    markdown += `## Phase Results\n\n`;
    
    for (const result of this.results) {
      const statusIcon = result.status === 'PASSED' ? '✅' : '❌';
      const phaseData = this.phaseDetails[result.phase] || { passed: 0, total: 0, successRate: 0, details: [] };
      
      markdown += `### ${statusIcon} ${result.phase}\n`;
      markdown += `- **Tests:** ${phaseData.passed}/${phaseData.total}\n`;
      markdown += `- **Success Rate:** ${phaseData.successRate}%\n`;
      markdown += `- **Status:** ${result.status}\n`;
      
      if (phaseData.details && phaseData.details.length > 0) {
        markdown += `- **Details:**\n`;
        for (const detail of phaseData.details) {
          const detailIcon = detail.status === 'PASS' ? '  ✅' : '  ❌';
          markdown += `${detailIcon} ${detail.description}\n`;
        }
      }
      markdown += `\n`;
    }
    
    markdown += `## Test Descriptions\n\n`;
    markdown += `### Phase 1: Foundation\n`;
    markdown += `Tests core functionality including CLI interface, caching system, and file fingerprinting.\n\n`;
    
    markdown += `### Phase 2: Parsing\n`;
    markdown += `Tests document parsing capabilities for text files, PDFs, and Office documents.\n\n`;
    
    markdown += `### Phase 3: Processing\n`;
    markdown += `Tests text processing including chunking algorithms and embedding generation.\n\n`;
    
    markdown += `### Phase 4: Search\n`;
    markdown += `Tests vector search functionality and FAISS integration.\n\n`;
    
    markdown += `### Phase 5: MCP\n`;
    markdown += `Tests Model Context Protocol server implementation and integration.\n\n`;
    
    markdown += `---\n`;
    markdown += `*This summary was automatically generated by run-all-tests.js*\n`;
    
    return markdown;
  }

  printSummary(totalTime) {
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('====================================');
    
    let passed = 0;
    for (const result of this.results) {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.phase}: ${result.status}`);
      if (result.status === 'PASSED') passed++;
    }
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   • Phases Passed: ${passed}/${this.results.length}`);
    console.log(`   • Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
    console.log(`   • Total Time: ${totalTime}s`);
    
    if (passed === this.results.length) {
      console.log('\n🎉 ALL TESTS PASSED! 🎉');
      console.log('The folder-mcp project is working perfectly!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the failing phases.');
    }
    
    console.log('\n📋 Individual Phase Results:');
    console.log('• Phase 1: Foundation (CLI, caching, fingerprinting)');
    console.log('• Phase 2: Parsing (text, PDF, Office documents)');
    console.log('• Phase 3: Processing (chunking, embeddings)');
    console.log('• Phase 4: Search (vector search, FAISS)');
    console.log('• Phase 5: MCP (Model Context Protocol server)');
    
    // Generate and save the TEST-SUMMARY.md file
    try {
      const summaryMarkdown = this.generateTestSummary(totalTime);
      const summaryPath = join(__dirname, 'TEST-SUMMARY.md');
      writeFileSync(summaryPath, summaryMarkdown, 'utf8');
      console.log(`\n📄 Test summary saved to: ${summaryPath}`);
    } catch (error) {
      console.error('⚠️  Failed to generate TEST-SUMMARY.md:', error.message);
    }
  }
}

// Run if executed directly
if (process.argv[1].includes('run-all-tests.js')) {
  const runner = new TestRunner();
  runner.runAllTests()
    .then(() => {
      const passedAll = runner.results.every(r => r.status === 'PASSED');
      process.exit(passedAll ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

export { TestRunner };
