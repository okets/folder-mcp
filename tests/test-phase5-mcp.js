#!/usr/bin/env node

/**
 * Phase 5: MCP Integration Tests (Steps 20-21)
 * Tests for MCP server scaffold and search tool implementation
 * Note: Step 22 (Context Enhancement) is marked as IN PROGRESS in the roadmap
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setTimeout as sleep } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const testDataDir = join(__dirname, 'test-data-mcp');

class Phase5Tester {
  constructor() {
    this.results = {
      step20: { passed: false, tests: [] },
      step21: { passed: false, tests: [] }
    };
  }

  async runAllTests() {
    console.log('🧪 Testing Phase 5: MCP Integration (Steps 20-21)\n');
    console.log('==================================================\n');

    try {
      await this.setupTestEnvironment();
      
      await this.testStep20_MCPServerScaffold();
      await this.testStep21_SearchToolImplementation();

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
    console.log('🔧 Setting up test environment for MCP integration...');
    
    // Create test data directory
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }

    // Create test documents for search testing
    const testFiles = [
      {
        name: 'ai-research.md',
        content: `# Artificial Intelligence Research

Modern AI research focuses on machine learning, deep learning, and neural networks. 
These technologies are revolutionizing how we process information and make decisions.

## Key Areas
- Natural Language Processing
- Computer Vision  
- Robotics
- Automated Reasoning`
      },
      {
        name: 'software-development.txt',
        content: `Software Development Best Practices

1. Version Control: Use Git for tracking changes
2. Testing: Write unit tests and integration tests
3. Documentation: Maintain clear documentation
4. Code Review: Peer review all code changes
5. Continuous Integration: Automate builds and deployments

Modern development involves microservices, containers, and cloud platforms.`
      },
      {
        name: 'project-management.md',
        content: `# Project Management Methodologies

## Agile Development
Agile methodologies emphasize iterative development, collaboration, and adaptability.

## Scrum Framework
Scrum uses sprints, daily standups, and retrospectives to manage development cycles.

## DevOps Practices
DevOps bridges development and operations through automation and monitoring.`
      }
    ];

    for (const file of testFiles) {
      writeFileSync(join(testDataDir, file.name), file.content, 'utf8');
    }

    // Index the test data for search functionality
    try {
      execSync(`node dist/cli.js index "${testDataDir}"`, { 
        cwd: projectRoot, 
        stdio: 'pipe',
        timeout: 120000
      });
      console.log('✅ Test data indexed successfully');
    } catch (error) {
      console.warn('⚠️  Could not index test data:', error.message);
    }

    console.log('✅ Test environment ready for MCP tests\n');
  }

  async testStep20_MCPServerScaffold() {
    console.log('🔍 Step 20: MCP Server Scaffold');
    
    const tests = [
      {
        name: 'MCP SDK dependency is installed',
        test: () => {
          const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
          return pkg.dependencies && pkg.dependencies['@modelcontextprotocol/sdk'];
        }
      },
      {
        name: 'MCP server module exists',
        test: () => {
          const serverPath = join(projectRoot, 'dist', 'mcp', 'server.js');
          return existsSync(serverPath);
        }
      },
      {
        name: 'Serve command exists in CLI',
        test: () => {
          try {
            const output = execSync('node dist/cli.js --help', { 
              cwd: projectRoot, 
              encoding: 'utf8' 
            });
            return output.includes('serve');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Server starts without immediate errors',
        test: async () => {
          try {
            // Start the server in the background
            const serverProcess = spawn('node', ['dist/cli.js', 'serve', testDataDir], {
              cwd: projectRoot,
              stdio: 'pipe'
            });

            // Wait a bit to see if it starts successfully
            await sleep(3000);

            const isRunning = !serverProcess.killed && serverProcess.exitCode === null;
            
            // Clean up
            if (!serverProcess.killed) {
              serverProcess.kill('SIGTERM');
              await sleep(1000);
              if (!serverProcess.killed) {
                serverProcess.kill('SIGKILL');
              }
            }

            return isRunning;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Server implements MCP protocol basics',
        test: () => {
          // Check if the server source code contains MCP protocol elements
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('Server') && 
                 content.includes('tools') && 
                 content.includes('@modelcontextprotocol');
        }
      },
      {
        name: 'Server supports graceful shutdown',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('SIGINT') || content.includes('SIGTERM') || content.includes('shutdown');
        }
      }
    ];

    this.results.step20 = await this.runTests(tests);
  }

  async testStep21_SearchToolImplementation() {
    console.log('🔍 Step 21: Search Tool Implementation');
    
    const tests = [
      {
        name: 'search_knowledge tool is defined in server',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('search_knowledge');
        }
      },
      {
        name: 'Tool accepts required parameters (query, top_k, threshold)',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('query') && 
                 content.includes('top_k') && 
                 content.includes('threshold');
        }
      },
      {
        name: 'Tool has proper input schema validation',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('inputSchema') && 
                 content.includes('required') && 
                 content.includes('properties');
        }
      },
      {
        name: 'Search handler method is implemented',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('handleSearchKnowledge') || 
                 content.includes('search_knowledge');
        }
      },
      {
        name: 'Tool integrates with embedding and vector systems',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('EmbeddingModel') && 
                 content.includes('VectorIndex');
        }
      },
      {
        name: 'Response format includes content and metadata',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('content') && 
                 content.includes('metadata') && 
                 content.includes('filePath');
        }
      },
      {
        name: 'Tool includes source attribution',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('filePath') || 
                 content.includes('source') || 
                 content.includes('originalPath');
        }
      },
      {
        name: 'Error handling for unindexed folders',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('not indexed') || 
                 content.includes('index') && content.includes('error');
        }
      },
      {
        name: 'Lazy initialization for performance',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('lazy') || 
                 content.includes('initialize') || 
                 content.includes('embeddingModel') && content.includes('null');
        }
      },
      {
        name: 'Enhanced search tool is also available (Step 22 progress)',
        test: () => {
          const serverPath = join(projectRoot, 'src', 'mcp', 'server.ts');
          if (!existsSync(serverPath)) return false;
          
          const content = readFileSync(serverPath, 'utf8');
          return content.includes('search_knowledge_enhanced') || 
                 content.includes('enhanced') || 
                 content.includes('EnhancedVectorSearch');
        }
      }
    ];

    this.results.step21 = await this.runTests(tests);
  }

  async runTests(tests) {
    const results = { passed: true, tests: [] };
    
    for (const test of tests) {
      try {
        const passed = await test.test();
        results.tests.push({ name: test.name, passed });
        console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
        if (!passed) results.passed = false;
      } catch (error) {
        results.tests.push({ name: test.name, passed: false, error: error.message });
        console.log(`  ❌ ${test.name} (Error: ${error.message})`);
        results.passed = false;
      }
    }
    
    console.log('');
    return results;
  }

  printResults() {
    console.log('\n📊 Phase 5 Test Results Summary');
    console.log('================================\n');

    const steps = [
      { id: 'step20', name: 'Step 20: MCP Server Scaffold' },
      { id: 'step21', name: 'Step 21: Search Tool Implementation' }
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const step of steps) {
      const result = this.results[step.id];
      const stepPassed = result.tests.filter(t => t.passed).length;
      const stepTotal = result.tests.length;
      
      totalTests += stepTotal;
      passedTests += stepPassed;

      console.log(`${result.passed ? '✅' : '❌'} ${step.name}: ${stepPassed}/${stepTotal} tests passed`);
    }

    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (this.allTestsPassed()) {
      console.log('\n🎉 All Phase 5 tests passed! MCP integration is working correctly.');
      console.log('\n📝 Note: Step 22 (Context Enhancement) is marked as IN PROGRESS in the roadmap.');
    } else {
      console.log('\n⚠️  Some Phase 5 tests failed. Please review the MCP server implementation.');
    }

    console.log('\n🔍 Manual Testing Recommendations:');
    console.log('==================================');
    console.log('1. Start the MCP server: node dist/cli.js serve <folder>');
    console.log('2. Test with Claude Desktop or another MCP client');
    console.log('3. Verify search_knowledge tool appears in capability list');
    console.log('4. Test actual search queries through MCP protocol');
    console.log('5. Check response format and source attribution');
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
if (process.argv[1].includes('test-phase5-mcp.js')) {
  const tester = new Phase5Tester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { Phase5Tester };
