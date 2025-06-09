#!/usr/bin/env node

/**
 * Phase 2: File Parsing Tests (Steps 9-13)
 * Tests for text, PDF, Word, Excel, and PowerPoint parsers
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const testDataDir = join(__dirname, 'test-data-parsing');

class Phase2Tester {
  constructor() {
    this.results = {
      step9: { passed: false, tests: [] },
      step10: { passed: false, tests: [] },
      step11: { passed: false, tests: [] },
      step12: { passed: false, tests: [] },
      step13: { passed: false, tests: [] }
    };
  }

  async runAllTests() {
    console.log('🧪 Testing Phase 2: File Parsing (Steps 9-13)\n');
    console.log('================================================\n');

    try {
      await this.setupTestEnvironment();
      
      await this.testStep9_TextFileParser();
      await this.testStep10_PDFParser();
      await this.testStep11_WordParser();
      await this.testStep12_ExcelParser();
      await this.testStep13_PowerPointParser();

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
    console.log('🔧 Setting up test environment for file parsing...');
    
    // Create test data directory
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }

    // Create sample text files for testing
    const testFiles = [
      {
        name: 'test.txt',
        content: 'This is a test text file.\nIt has multiple lines.\nAnd different content.'
      },
      {
        name: 'readme.md',
        content: '# Test Markdown\n\nThis is a **bold** test with *italic* text.\n\n## Section 2\n\nMore content here.'
      },
      {
        name: 'large-text.txt',
        content: 'A'.repeat(1000) + '\n' + 'B'.repeat(1000) + '\n' + 'C'.repeat(1000)
      },
      {
        name: 'mixed-encoding.txt',
        content: 'Text with special characters: üñíçødé 测试 🚀'
      },
      {
        name: 'unicode.txt',
        content: 'Unicode test: emoji 😀🎉🚀 and symbols ∑∆√π'
      }
    ];

    for (const file of testFiles) {
      writeFileSync(join(testDataDir, file.name), file.content, 'utf8');
    }

    console.log('✅ Test environment ready for parsing tests\n');
  }

  async testStep9_TextFileParser() {
    console.log('🔍 Step 9: Text File Parser');
    
    const tests = [
      {
        name: 'Parses .txt files with correct content',
        test: () => {
          try {
            execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 30000
            });
            
            // Check if metadata was created
            const metadataDir = join(testDataDir, '.folder-mcp-cache', 'metadata');
            if (!existsSync(metadataDir)) return false;
            
            // Look for any metadata file
            const files = readdirSync(metadataDir);
            if (files.length === 0) return false;
            
            // Check if at least one metadata file contains text content
            return files.some(file => {
              try {
                const metadata = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'));
                return metadata.originalContent && 
                       metadata.originalContent.content && 
                       metadata.originalContent.content.includes('test');
              } catch {
                return false;
              }
            });
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Parses .md files with content',
        test: () => {
          try {
            const metadataDir = join(testDataDir, '.folder-mcp-cache', 'metadata');
            if (!existsSync(metadataDir)) return false;
            
            const files = readdirSync(metadataDir);
            return files.some(file => {
              try {
                const metadata = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'));
                return metadata.originalContent && 
                       metadata.originalContent.content && 
                       metadata.originalContent.content.includes('Markdown');
              } catch {
                return false;
              }
            });
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Handles UTF-8 encoding correctly',
        test: () => {
          try {
            const metadataDir = join(testDataDir, '.folder-mcp-cache', 'metadata');
            if (!existsSync(metadataDir)) return false;
            
            const files = readdirSync(metadataDir);
            return files.some(file => {
              try {
                const metadata = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'));
                return metadata.originalContent && 
                       metadata.originalContent.content && 
                       (metadata.originalContent.content.includes('üñíçødé') || 
                        metadata.originalContent.content.includes('测试') ||
                        metadata.originalContent.content.includes('🚀'));
              } catch {
                return false;
              }
            });
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Creates proper metadata structure',
        test: () => {
          try {
            const metadataDir = join(testDataDir, '.folder-mcp-cache', 'metadata');
            if (!existsSync(metadataDir)) return false;
            
            const files = readdirSync(metadataDir);
            return files.some(file => {
              try {
                const metadata = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'));
                return metadata.originalContent && 
                       metadata.chunks && 
                       Array.isArray(metadata.chunks) &&
                       metadata.totalChunks >= 0;
              } catch {
                return false;
              }
            });
          } catch {
            return false;
          }
        }
      }
    ];

    this.results.step9 = await this.runTests(tests);
  }

  async testStep10_PDFParser() {
    console.log('🔍 Step 10: PDF Parser Integration');
    
    const tests = [
      {
        name: 'PDF parser module exists',
        test: () => {
          try {
            // Check if the parser file exists and has PDF functionality
            const parserPath = join(projectRoot, 'src', 'parsers', 'index.ts');
            if (!existsSync(parserPath)) return false;
            
            const content = readFileSync(parserPath, 'utf8');
            return content.includes('pdf') || content.includes('PDF');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'PDF parser has required dependencies',
        test: () => {
          try {
            const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
            return pkg.dependencies && pkg.dependencies['pdf-parse'];
          } catch {
            return false;
          }
        }
      },
      {
        name: 'PDF parser handles errors gracefully',
        test: () => {
          // Create a fake PDF file to test error handling
          writeFileSync(join(testDataDir, 'fake.pdf'), 'Not a real PDF');
          
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            // Should not crash, but may show warnings
            return true;
          } catch (error) {
            // Check if it's a graceful handling (output in stderr)
            return error.stdout && error.stdout.includes('Warning');
          }
        }
      }
    ];

    this.results.step10 = await this.runTests(tests);
  }

  async testStep11_WordParser() {
    console.log('🔍 Step 11: Word Document Parser');
    
    const tests = [
      {
        name: 'Word parser module functionality exists',
        test: () => {
          try {
            const parserPath = join(projectRoot, 'src', 'parsers', 'index.ts');
            if (!existsSync(parserPath)) return false;
            
            const content = readFileSync(parserPath, 'utf8');
            return content.includes('docx') || content.includes('Word') || content.includes('mammoth');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Word parser has mammoth dependency',
        test: () => {
          try {
            const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
            return pkg.dependencies && pkg.dependencies['mammoth'];
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Word parser handles invalid files gracefully',
        test: () => {
          // Create a fake DOCX file
          writeFileSync(join(testDataDir, 'fake.docx'), 'Not a real DOCX');
          
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return true; // Should not crash
          } catch (error) {
            return error.stdout && error.stdout.includes('Warning');
          }
        }
      }
    ];

    this.results.step11 = await this.runTests(tests);
  }

  async testStep12_ExcelParser() {
    console.log('🔍 Step 12: Excel Parser');
    
    const tests = [
      {
        name: 'Excel parser module exists',
        test: () => {
          try {
            const parserPath = join(projectRoot, 'src', 'parsers', 'index.ts');
            if (!existsSync(parserPath)) return false;
            
            const content = readFileSync(parserPath, 'utf8');
            return content.includes('xlsx') || content.includes('Excel');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Excel parser has xlsx dependency',
        test: () => {
          try {
            const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
            return pkg.dependencies && pkg.dependencies['xlsx'];
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Excel parser handles invalid files gracefully',
        test: () => {
          writeFileSync(join(testDataDir, 'fake.xlsx'), 'Not a real Excel file');
          
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return true;
          } catch (error) {
            return error.stdout && error.stdout.includes('Warning');
          }
        }
      }
    ];

    this.results.step12 = await this.runTests(tests);
  }

  async testStep13_PowerPointParser() {
    console.log('🔍 Step 13: PowerPoint Parser');
    
    const tests = [
      {
        name: 'PowerPoint parser module exists',
        test: () => {
          try {
            const parserPath = join(projectRoot, 'src', 'parsers', 'index.ts');
            if (!existsSync(parserPath)) return false;
            
            const content = readFileSync(parserPath, 'utf8');
            return content.includes('pptx') || content.includes('PowerPoint');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'PowerPoint parser has required dependencies',
        test: () => {
          try {
            const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
            // Check for various PowerPoint parsing libraries
            return pkg.dependencies && (
              pkg.dependencies['jszip'] || 
              pkg.dependencies['xml2js'] || 
              pkg.dependencies['pizzip']
            );
          } catch {
            return false;
          }
        }
      },
      {
        name: 'PowerPoint parser handles invalid files gracefully',
        test: () => {
          writeFileSync(join(testDataDir, 'fake.pptx'), 'Not a real PowerPoint file');
          
          try {
            const output = execSync(`node dist/cli.js index "${testDataDir}" --skip-embeddings`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return true;
          } catch (error) {
            return error.stdout && error.stdout.includes('Warning');
          }
        }
      }
    ];

    this.results.step13 = await this.runTests(tests);
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
    console.log('\n📊 Phase 2 Test Results Summary');
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
      console.log('🎉 All Phase 2 tests passed! File parsing is working.');
    } else {
      console.log('⚠️  Some Phase 2 tests failed. Please review the implementation.');
    }
  }

  getStepName(step) {
    const names = {
      step9: 'Text File Parser',
      step10: 'PDF Parser Integration',
      step11: 'Word Document Parser',
      step12: 'Excel Parser',
      step13: 'PowerPoint Parser'
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

// Run tests
const tester = new Phase2Tester();
tester.runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });

export { Phase2Tester };
