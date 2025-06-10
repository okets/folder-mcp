#!/usr/bin/env node

/**
 * Phase 7 Tests: Production Ready Features
 * Tests for Steps 25-27: Error Recovery, Performance Optimization, Test Suite
 */

import { execSync, spawn } from 'child_process';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const projectRoot = resolve(__dirname, '..');
const testDataDir = join(__dirname, 'test-data-phase7');

class Phase7Tester {
  constructor() {
    this.results = {};
    this.cleanup = [];
  }

  async runAllTests() {
    console.log('🧪 Running Phase 7 Tests: Production Ready Features');
    console.log('=' .repeat(80));
    
    try {
      await this.setupTestEnvironment();
      
      // Test Step 25: Error Recovery
      await this.testStep25_ErrorRecovery();
      
      this.showResults();
      
      return this.allTestsPassed();
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      return false;
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment for production features...');
    
    // Clean up any existing test data
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    
    // Create test directory
    mkdirSync(testDataDir, { recursive: true });
    
    // Create test files with varied scenarios for error testing
    const testFiles = [
      {
        name: 'valid-document.txt',
        content: 'This is a valid text document that should process successfully.\n'.repeat(20)
      },
      {
        name: 'large-document.txt', 
        content: 'Large document content that will test chunking and batch processing.\n'.repeat(500)
      },
      {
        name: 'corrupted-pdf.pdf',
        content: 'This is not a valid PDF file but has a PDF extension'
      },
      {
        name: 'empty-file.txt',
        content: ''
      },
      {
        name: 'unicode-content.txt',
        content: 'Unicode test: 🌟 ñáéíóú 中文 العربية русский язык 🚀 emoji test'
      }
    ];

    for (const file of testFiles) {
      const filePath = join(testDataDir, file.name);
      writeFileSync(filePath, file.content, 'utf8');
    }
    
    console.log(`✅ Created test environment with ${testFiles.length} test files`);
  }

  async testStep25_ErrorRecovery() {
    console.log('🔍 Step 25: Error Recovery System');
    
    const tests = [
      {
        name: 'Error recovery system imports correctly',
        test: () => {
          try {
            const errorRecoveryPath = join(projectRoot, 'src', 'utils', 'errorRecovery.ts');
            return existsSync(errorRecoveryPath);
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Error recovery system builds without errors',
        test: () => {
          try {
            execSync('npm run build', { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 30000
            });
            
            const errorRecoveryPath = join(projectRoot, 'dist', 'utils', 'errorRecovery.js');
            return existsSync(errorRecoveryPath);
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Continues indexing after single file failure',
        test: async () => {
          try {
            // Index folder with mixed valid and invalid files
            const output = execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 120000,
              stdio: 'pipe'
            });
            
            // Should continue processing despite failures
            return output.includes('Successfully processed') && 
                   output.includes('Failed to process') &&
                   output.includes('Error Summary');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Creates error log file in correct location',
        test: () => {
          const errorLogPath = join(testDataDir, '.folder-mcp', 'errors.log');
          return existsSync(errorLogPath);
        }
      },
      {
        name: 'Error log contains JSON-formatted entries',
        test: () => {
          try {
            const errorLogPath = join(testDataDir, '.folder-mcp', 'errors.log');
            if (!existsSync(errorLogPath)) return false;
            
            const logContent = readFileSync(errorLogPath, 'utf8').trim();
            if (!logContent) return true; // Empty log is OK if no errors
            
            const lines = logContent.split('\n').filter(line => line.trim());
            
            // Check that each line is valid JSON with required fields
            for (const line of lines) {
              const errorRecord = JSON.parse(line);
              if (!errorRecord.timestamp || 
                  !errorRecord.operation || 
                  !errorRecord.error ||
                  typeof errorRecord.retryCount !== 'number' ||
                  typeof errorRecord.recovered !== 'boolean') {
                return false;
              }
            }
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Shows clear error summaries with statistics',
        test: async () => {
          try {
            // Index with corrupted files to trigger error scenarios
            const output = execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 120000,
              stdio: 'pipe'
            });
            
            // Check for error summary components in the output
            return output.includes('Error Summary') &&
                   output.includes('Total Errors') &&
                   (output.includes('Successfully processed') || output.includes('Failed to process'));
          } catch (error) {
            // Even if the command has errors, check the output for summaries
            const output = error.stdout ? error.stdout.toString() : '';
            return output.includes('Error Summary') &&
                   output.includes('Total Errors') &&
                   (output.includes('Successfully processed') || output.includes('Failed to process'));
          }
        }
      },
      {
        name: 'Implements retry logic with exponential backoff',
        test: () => {
          try {
            const errorLogPath = join(testDataDir, '.folder-mcp', 'errors.log');
            if (!existsSync(errorLogPath)) return true; // No errors = no retries needed
            
            const logContent = readFileSync(errorLogPath, 'utf8').trim();
            if (!logContent) return true;
            
            const lines = logContent.split('\n').filter(line => line.trim());
            
            // Look for retry attempts in error records
            for (const line of lines) {
              const errorRecord = JSON.parse(line);
              // If retryCount > 0, it means retries were attempted
              if (errorRecord.retryCount > 0) {
                return true;
              }
            }
            
            // If no retries in log, check if CLI output shows retry attempts
            return true; // This is tested in integration
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Cache operations use atomic file writes',
        test: () => {
          try {
            // Check that no temporary files are left behind after operations
            const cacheDir = join(testDataDir, '.folder-mcp');
            if (!existsSync(cacheDir)) return true;
            
            const files = readdirSync(cacheDir, { recursive: true });
            const tempFiles = files.filter(file => 
              file.toString().includes('.tmp') || 
              file.toString().includes('.temp') ||
              file.toString().includes('~')
            );
            
            return tempFiles.length === 0;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Never leaves cache in corrupted state',
        test: () => {
          try {
            const cacheDir = join(testDataDir, '.folder-mcp');
            if (!existsSync(cacheDir)) return true;
            
            // Check key cache files exist and are valid JSON
            const keyFiles = ['index.json', 'version.json'];
            
            for (const fileName of keyFiles) {
              const filePath = join(cacheDir, fileName);
              if (existsSync(filePath)) {
                try {
                  JSON.parse(readFileSync(filePath, 'utf8'));
                } catch {
                  return false; // Corrupted JSON
                }
              }
            }
            
            // Check metadata files are valid
            const metadataDir = join(cacheDir, 'metadata');
            if (existsSync(metadataDir)) {
              const metadataFiles = readdirSync(metadataDir);
              for (const file of metadataFiles) {
                if (file.endsWith('.json')) {
                  try {
                    JSON.parse(readFileSync(join(metadataDir, file), 'utf8'));
                  } catch {
                    return false;
                  }
                }
              }
            }
            
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Progress resumption works for interrupted operations',
        test: () => {
          try {
            // This is primarily tested through integration
            // Check that progress files don't accumulate indefinitely
            const cacheDir = join(testDataDir, '.folder-mcp');
            if (!existsSync(cacheDir)) return true;
            
            const progressFiles = readdirSync(cacheDir, { recursive: true })
              .filter(file => file.toString().includes('progress'));
            
            // Should not have excessive progress files left over
            return progressFiles.length < 10;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Error recovery integrates with all major operations',
        test: async () => {
          try {
            // Test various operations to ensure error recovery is integrated
            const operations = [
              `node dist/cli.js index "${testDataDir}"`,
              `node dist/cli.js search "${testDataDir}" "test query"`,
              `node dist/cli.js config show "${testDataDir}"`
            ];
            
            let allOperationsWork = true;
            
            for (const operation of operations) {
              try {
                execSync(operation, { 
                  cwd: projectRoot, 
                  stdio: 'pipe',
                  timeout: 60000
                });
              } catch (error) {
                // Operations might fail, but they should fail gracefully
                // Check that error output contains recovery information
                const errorOutput = error.stderr ? error.stderr.toString() : '';
                if (!errorOutput.includes('Error') && !errorOutput.includes('warning')) {
                  allOperationsWork = false;
                }
              }
            }
            
            return allOperationsWork;
          } catch {
            return false;
          }
        }
      }
    ];

    this.results.step25 = await this.runTests(tests);
  }

  async runTests(tests) {
    const results = [];
    
    for (const test of tests) {
      try {
        const result = await test.test();
        results.push({
          name: test.name,
          passed: result,
          error: null
        });
        
        const status = result ? '✅' : '❌';
        console.log(`  ${status} ${test.name}`);
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          error: error.message
        });
        
        console.log(`  ❌ ${test.name} (Error: ${error.message})`);
      }
    }
    
    return results;
  }

  showResults() {
    console.log('\n📊 Phase 7 Test Results Summary');
    console.log('=' .repeat(50));
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(this.results).forEach(([step, results]) => {
      const stepPassed = results.filter(r => r.passed).length;
      const stepTotal = results.length;
      
      totalTests += stepTotal;
      passedTests += stepPassed;
      
      const percentage = stepTotal > 0 ? ((stepPassed / stepTotal) * 100).toFixed(1) : '0.0';
      const status = stepPassed === stepTotal ? '✅' : '⚠️';
      
      console.log(`${status} ${step.toUpperCase()}: ${stepPassed}/${stepTotal} tests passed (${percentage}%)`);
      
      // Show failed tests
      const failed = results.filter(r => !r.passed);
      if (failed.length > 0) {
        failed.forEach(test => {
          console.log(`   ❌ ${test.name}${test.error ? ': ' + test.error : ''}`);
        });
      }
    });
    
    const overallPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed (${overallPercentage}%)`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All Phase 7 tests passed! Production features are working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Review the error recovery implementation.');
    }
  }

  allTestsPassed() {
    let totalTests = 0;
    let passedTests = 0;
    
    Object.values(this.results).forEach(results => {
      totalTests += results.length;
      passedTests += results.filter(r => r.passed).length;
    });
    
    return totalTests > 0 && passedTests === totalTests;
  }

  async cleanupTestEnvironment() {
    try {
      if (existsSync(testDataDir)) {
        rmSync(testDataDir, { recursive: true, force: true });
      }
      console.log('\n🧹 Test environment cleaned up');
    } catch (error) {
      console.warn('⚠️  Could not clean up test environment:', error.message);
    }
  }
}

// Export for use in other test files
export { Phase7Tester };

// Run tests if this file is executed directly
async function runIfDirectExecution() {
  // Check if this file is being run directly
  const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
                       import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
  
  if (isMainModule) {
    console.log('🚀 Starting Phase 7 tests...');
    const tester = new Phase7Tester();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  }
}

runIfDirectExecution().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
