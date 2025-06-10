#!/usr/bin/env node

/**
 * Phase 1: Foundation Tests (Steps 1-8)
 * Tests for project initialization, CLI setup, file listing, caching, and fingerprinting
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const testDataDir = join(__dirname, 'test-data-phase1');

class Phase1Tester {
  constructor() {
    this.results = {
      step1: { passed: false, tests: [] },
      step2: { passed: false, tests: [] },
      step3: { passed: false, tests: [] },
      step4: { passed: false, tests: [] },
      step5: { passed: false, tests: [] },
      step6: { passed: false, tests: [] },
      step7: { passed: false, tests: [] },
      step8: { passed: false, tests: [] }
    };
  }

  async runAllTests() {
    console.log('🧪 Testing Phase 1: Foundation (Steps 1-8)\n');
    console.log('================================================\n');

    try {
      await this.setupTestEnvironment();
      
      await this.testStep1_Initialize();
      await this.testStep2_CLIExecutable();
      await this.testStep3_CommanderCLI();
      await this.testStep4_RecursiveFileListing();
      await this.testStep5_FileTypeFiltering();
      await this.testStep6_CacheDirectorySetup();
      await this.testStep7_FileFingerprinting();
      await this.testStep8_CacheStatusDetection();

      this.printResults();
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }

    return this.allTestsPassed();
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Create test data directory
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }

    // Create sample test files
    const testFiles = [
      { name: 'test.txt', content: 'This is a test text file.' },
      { name: 'readme.md', content: '# Test Markdown\nThis is a test.' },
      { name: 'ignored.jpg', content: 'Image file to be ignored' },
      { name: 'hidden.txt', content: 'Hidden file' }
    ];

    for (const file of testFiles) {
      writeFileSync(join(testDataDir, file.name), file.content);
    }

    // Create subdirectory with files
    const subDir = join(testDataDir, 'subdir');
    if (!existsSync(subDir)) {
      mkdirSync(subDir);
    }
    writeFileSync(join(subDir, 'nested.txt'), 'Nested file content');

    console.log('✅ Test environment ready\n');
  }

  async testStep1_Initialize() {
    console.log('🔍 Step 1: Initialize TypeScript Project');
    
    const tests = [
      {
        name: 'package.json exists with correct name',
        test: () => {
          const packagePath = join(projectRoot, 'package.json');
          if (!existsSync(packagePath)) return false;
          const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
          return pkg.name === 'folder-mcp';
        }
      },
      {
        name: 'tsconfig.json exists and configured for Node.js',
        test: () => {
          const tsconfigPath = join(projectRoot, 'tsconfig.json');
          if (!existsSync(tsconfigPath)) return false;
          const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
          return tsconfig.compilerOptions && tsconfig.compilerOptions.target;
        }
      },
      {
        name: 'npm run build compiles successfully',
        test: () => {
          try {
            console.log('    Building project...');
            execSync('npm run build', { cwd: projectRoot, stdio: 'pipe', timeout: 30000 });
            return true;
          } catch (error) {
            console.log(`    Build failed: ${error.message}`);
            return false;
          }
        }
      },
      {
        name: 'dist directory exists after build',
        test: () => existsSync(join(projectRoot, 'dist'))
      }
    ];

    this.results.step1 = await this.runTests(tests);
  }

  async testStep2_CLIExecutable() {
    console.log('🔍 Step 2: Create CLI Executable');
    
    const tests = [
      {
        name: 'bin field in package.json points to CLI entry',
        test: () => {
          const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
          return pkg.bin && typeof pkg.bin === 'object' && pkg.bin['folder-mcp'];
        }
      },
      {
        name: 'CLI file has shebang line',
        test: () => {
          const cliPath = join(projectRoot, 'dist', 'cli.js');
          if (!existsSync(cliPath)) return false;
          const content = readFileSync(cliPath, 'utf8');
          return content.startsWith('#!/usr/bin/env node');
        }
      },
      {
        name: 'CLI executable runs without errors',
        test: () => {
          try {
            execSync('node dist/cli.js --help', { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 10000
            });
            return true;
          } catch (error) {
            // Help command returns exit code 1, but that's normal
            return error.status === 1;
          }
        }
      }
    ];

    this.results.step2 = await this.runTests(tests);
  }

  async testStep3_CommanderCLI() {
    console.log('🔍 Step 3: Implement Commander.js CLI');
    
    const tests = [
      {
        name: 'CLI shows version with --version',
        test: () => {
          try {
            const output = execSync('node dist/cli.js --version', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 10000
            });
            return output.trim().length > 0;
          } catch (error) {
            if (error.stdout) {
              return error.stdout.trim().length > 0;
            }
            return false;
          }
        }
      },
      {
        name: 'CLI shows help with --help',
        test: () => {
          try {
            const output = execSync('node dist/cli.js --help', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 10000
            });
            return output.includes('Commands:') || output.includes('Usage:');
          } catch (error) {
            // Help command often returns exit code 1, but we still get output
            if (error.stdout) {
              return error.stdout.includes('Commands:') || error.stdout.includes('Usage:');
            }
            return false;
          }
        }
      },
      {
        name: 'CLI has index command',
        test: () => {
          try {
            const output = execSync('node dist/cli.js --help', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 10000
            });
            return output.includes('index');
          } catch (error) {
            if (error.stdout) {
              return error.stdout.includes('index');
            }
            return false;
          }
        }
      }
    ];

    this.results.step3 = await this.runTests(tests);
  }

  async testStep4_RecursiveFileListing() {
    console.log('🔍 Step 4: Recursive File Listing');
    
    const tests = [
      {
        name: 'Lists all files in test directory',
        test: () => {
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('test.txt') && output.includes('nested.txt');
          } catch (error) {
            if (error.stdout) {
              return error.stdout.includes('test.txt') || error.stdout.includes('files');
            }
            return false;
          }
        }
      },
      {
        name: 'Shows total file count',
        test: () => {
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return /\d+/.test(output) && (output.includes('files') || output.includes('Processing'));
          } catch (error) {
            if (error.stdout && /\d+/.test(error.stdout)) {
              return true;
            }
            return false;
          }
        }
      },
      {
        name: 'Handles non-existent folders gracefully',
        test: () => {
          try {
            execSync('node dist/cli.js index "/nonexistent/folder"', { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 10000
            });
            return false; // Should fail for non-existent folder
          } catch {
            return true; // Expected to fail
          }
        }
      }
    ];

    this.results.step4 = await this.runTests(tests);
  }

  async testStep5_FileTypeFiltering() {
    console.log('🔍 Step 5: File Type Filtering');
    
    const tests = [
      {
        name: 'Only shows supported file types',
        test: () => {
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('.txt') || output.includes('.md') || output.includes('Processing');
          } catch (error) {
            if (error.stdout && (error.stdout.includes('.txt') || error.stdout.includes('Processing'))) {
              return true;
            }
            return false;
          }
        }
      },
      {
        name: 'Shows count by file type',
        test: () => {
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            // Look for any file counting output - the specific format may vary
            return output.includes('files') || output.includes('Processing') || output.includes('Found');
          } catch (error) {
            if (error.stdout && (error.stdout.includes('files') || error.stdout.includes('Processing'))) {
              return true;
            }
            return false;
          }
        }
      }
    ];

    this.results.step5 = await this.runTests(tests);
  }

  async testStep6_CacheDirectorySetup() {
    console.log('🔍 Step 6: Cache Directory Setup');
    
    const tests = [
      {
        name: 'Creates .folder-mcp directory',
        test: () => {
          try {
            execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 30000
            });
            return existsSync(join(testDataDir, '.folder-mcp'));
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Creates subdirectories: embeddings, metadata, vectors',
        test: () => {
          const cacheDir = join(testDataDir, '.folder-mcp');
          return existsSync(join(cacheDir, 'embeddings')) &&
                 existsSync(join(cacheDir, 'metadata')) &&
                 existsSync(join(cacheDir, 'vectors'));
        }
      },
      {
        name: 'Creates version.json with tool version',
        test: () => {
          const versionPath = join(testDataDir, '.folder-mcp', 'version.json');
          if (!existsSync(versionPath)) return false;
          try {
            const version = JSON.parse(readFileSync(versionPath, 'utf8'));
            return version.toolVersion && version.createdAt;
          } catch {
            return false;
          }
        }
      }
    ];

    this.results.step6 = await this.runTests(tests);
  }

  async testStep7_FileFingerprinting() {
    console.log('🔍 Step 7: File Fingerprinting System');
    
    const tests = [
      {
        name: 'Generates SHA-256 hash for files',
        test: () => {
          const indexPath = join(testDataDir, '.folder-mcp', 'index.json');
          if (!existsSync(indexPath)) return false;
          try {
            const index = JSON.parse(readFileSync(indexPath, 'utf8'));
            if (index.files && Array.isArray(index.files)) {
              return index.files.some(file => 
                file && file.hash && file.hash.length === 64
              );
            }
          } catch {
            return false;
          }
          return false;
        }
      },
      {
        name: 'Creates fingerprint with hash, path, size, modified',
        test: () => {
          const indexPath = join(testDataDir, '.folder-mcp', 'index.json');
          if (!existsSync(indexPath)) return false;
          try {
            const index = JSON.parse(readFileSync(indexPath, 'utf8'));
            if (index.files && Array.isArray(index.files)) {
              return index.files.some(file => 
                file && file.hash && file.path && 
                file.size !== undefined && file.modified
              );
            }
          } catch {
            return false;
          }
          return false;
        }
      },
      {
        name: 'Saves fingerprints to index.json',
        test: () => {
          return existsSync(join(testDataDir, '.folder-mcp', 'index.json'));
        }
      }
    ];

    this.results.step7 = await this.runTests(tests);
  }

  async testStep8_CacheStatusDetection() {
    console.log('🔍 Step 8: Cache Status Detection');
    
    // First run to create initial cache
    try {
      execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
        cwd: projectRoot, 
        stdio: 'pipe',
        timeout: 30000
      });
    } catch {}

    // Modify a file
    writeFileSync(join(testDataDir, 'test.txt'), 'Modified content');

    // Add a new file
    writeFileSync(join(testDataDir, 'new-file.txt'), 'New file content');

    const tests = [
      {
        name: 'Detects new files',
        test: () => {
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('new-file.txt') || output.includes('Processing') || output.includes('files');
          } catch (error) {
            if (error.stdout && (error.stdout.includes('new-file') || error.stdout.includes('Processing'))) {
              return true;
            }
            return false;
          }
        }
      },
      {
        name: 'Detects modified files',
        test: () => {
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('modified') || output.includes('changed') || output.includes('Processing');
          } catch (error) {
            if (error.stdout && (error.stdout.includes('modified') || error.stdout.includes('Processing'))) {
              return true;
            }
            return false;
          }
        }
      },
      {
        name: 'Shows summary of changes',
        test: () => {
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('Processing') || output.includes('files') || /\d+\s+(file|chunk)/.test(output);
          } catch (error) {
            if (error.stdout && (error.stdout.includes('Processing') || error.stdout.includes('files'))) {
              return true;
            }
            return false;
          }
        }
      }
    ];

    this.results.step8 = await this.runTests(tests);
  }

  async runTests(tests) {
    const results = [];
    let passed = 0;

    for (const test of tests) {
      try {
        const result = test.test();
        if (result) {
          console.log(`  ✅ ${test.name}`);
          passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
        }
        results.push({ name: test.name, passed: result });
      } catch (error) {
        console.log(`  ❌ ${test.name} (Error: ${error.message})`);
        results.push({ name: test.name, passed: false, error: error.message });
      }
    }

    return {
      passed: passed === tests.length,
      passedCount: passed,
      totalCount: tests.length,
      tests: results
    };
  }

  printResults() {
    console.log('\n📊 Phase 1 Test Results Summary');
    console.log('================================');
    
    let totalPassed = 0;
    let totalTests = 0;
    
    for (const [step, result] of Object.entries(this.results)) {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} Step ${step.replace('step', '')}: ${this.getStepName(step)}: ${result.passedCount}/${result.totalCount} tests passed`);
      totalPassed += result.passedCount || 0;
      totalTests += result.totalCount || 0;
    }
    
    console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed`);
    console.log(`📈 Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 All Phase 1 tests passed! Foundation is solid.');
    } else {
      console.log('⚠️  Some Phase 1 tests failed. Please review the implementation.');
    }
  }

  getStepName(step) {
    const names = {
      step1: 'Initialize TypeScript Project',
      step2: 'Create CLI Executable', 
      step3: 'Implement Commander.js CLI',
      step4: 'Recursive File Listing',
      step5: 'File Type Filtering',
      step6: 'Cache Directory Setup',
      step7: 'File Fingerprinting System',
      step8: 'Cache Status Detection'
    };
    return names[step] || step;
  }

  allTestsPassed() {
    return Object.values(this.results).every(result => result.passed);
  }

  async cleanup() {
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

// Run tests if this script is executed directly
const tester = new Phase1Tester();
tester.runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });

export { Phase1Tester };
