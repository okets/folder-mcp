#!/usr/bin/env node

/**
 * Sprint 4: MCP Endpoint Test Suite
 * 
 * This script tests the MCP server endpoints directly by simulating
 * the MCP protocol communication.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const MCP_SERVER_PATH = path.join(__dirname, '..', '..', 'dist', 'src', 'mcp-server.js');
const TEST_TIMEOUT = 5000;

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

class MCPTestRunner {
  constructor() {
    this.server = null;
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  /**
   * Start the MCP server process
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      console.log(`${colors.blue}Starting MCP server...${colors.reset}`);
      
      this.server = spawn('node', [MCP_SERVER_PATH], {
        env: {
          ...process.env,
          FOLDER_MCP_DEVELOPMENT_ENABLED: 'true'
        }
      });

      let initialized = false;
      
      this.server.stderr.on('data', (data) => {
        const output = data.toString();
        if (!initialized && output.includes('MCP server started')) {
          initialized = true;
          console.log(`${colors.green}✓ MCP server started successfully${colors.reset}\n`);
          setTimeout(() => resolve(), 1000); // Give it a moment to fully initialize
        }
        // Log errors in gray for debugging
        if (output.includes('ERROR')) {
          console.log(`${colors.gray}${output.trim()}${colors.reset}`);
        }
      });

      this.server.on('error', (err) => {
        reject(new Error(`Failed to start MCP server: ${err.message}`));
      });

      // Timeout if server doesn't start
      setTimeout(() => {
        if (!initialized) {
          reject(new Error('MCP server failed to start within timeout'));
        }
      }, TEST_TIMEOUT);
    });
  }

  /**
   * Send a JSON-RPC request to the server
   */
  async sendRequest(method, params = {}, id = null) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        ...(id !== null && { id })
      };

      const requestStr = JSON.stringify(request);
      let responseData = '';
      let responseTimeout;

      const handleResponse = (data) => {
        responseData += data.toString();
        
        // Try to parse response
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('{')) {
              const response = JSON.parse(line);
              clearTimeout(responseTimeout);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Continue accumulating data
        }
      };

      this.server.stdout.once('data', handleResponse);
      
      responseTimeout = setTimeout(() => {
        this.server.stdout.removeListener('data', handleResponse);
        reject(new Error(`Timeout waiting for response to ${method}`));
      }, TEST_TIMEOUT);

      this.server.stdin.write(requestStr + '\n');
    });
  }

  /**
   * Test MCP initialization
   */
  async testInitialization() {
    console.log(`${colors.blue}Test 1: MCP Initialization${colors.reset}`);
    this.totalTests++;
    
    try {
      const response = await this.sendRequest('initialize', {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }, 1);

      if (response.result && response.result.protocolVersion) {
        console.log(`${colors.green}✓ Initialization successful${colors.reset}`);
        console.log(`  Protocol: ${response.result.protocolVersion}`);
        console.log(`  Server: ${response.result.serverInfo?.name} v${response.result.serverInfo?.version}`);
        this.passedTests++;
        this.testResults.push({ test: 'initialization', status: 'passed', response });
        return true;
      } else {
        throw new Error('Invalid initialization response');
      }
    } catch (error) {
      console.log(`${colors.red}✗ Initialization failed: ${error.message}${colors.reset}`);
      this.testResults.push({ test: 'initialization', status: 'failed', error: error.message });
      return false;
    }
  }

  /**
   * Test tools/list request
   */
  async testToolsList() {
    console.log(`\n${colors.blue}Test 2: List Available Tools${colors.reset}`);
    this.totalTests++;
    
    try {
      const response = await this.sendRequest('tools/list', {}, 2);
      
      if (response.result && Array.isArray(response.result.tools)) {
        const tools = response.result.tools;
        console.log(`${colors.green}✓ Tools list retrieved${colors.reset}`);
        console.log(`  Available tools: ${tools.length}`);
        tools.forEach(tool => {
          console.log(`    - ${tool.name}: ${tool.description?.substring(0, 50)}...`);
        });
        this.passedTests++;
        this.testResults.push({ test: 'tools/list', status: 'passed', tools });
        return tools;
      } else {
        throw new Error('Invalid tools list response');
      }
    } catch (error) {
      console.log(`${colors.red}✗ Tools list failed: ${error.message}${colors.reset}`);
      this.testResults.push({ test: 'tools/list', status: 'failed', error: error.message });
      return [];
    }
  }

  /**
   * Test get_server_info tool
   */
  async testServerInfo() {
    console.log(`\n${colors.blue}Test 3: Get Server Info${colors.reset}`);
    this.totalTests++;
    
    try {
      const startTime = Date.now();
      const response = await this.sendRequest('tools/call', {
        name: 'get_server_info',
        arguments: {}
      }, 3);
      const responseTime = Date.now() - startTime;
      
      if (response.result) {
        console.log(`${colors.green}✓ Server info retrieved (${responseTime}ms)${colors.reset}`);
        const content = response.result.content?.[0]?.text;
        if (content) {
          // Parse the text response
          const lines = content.split('\n').slice(0, 5);
          lines.forEach(line => console.log(`  ${line}`));
        }
        this.passedTests++;
        this.testResults.push({ 
          test: 'get_server_info', 
          status: 'passed', 
          responseTime,
          content 
        });
        return true;
      } else {
        throw new Error('Invalid server info response');
      }
    } catch (error) {
      console.log(`${colors.red}✗ Server info failed: ${error.message}${colors.reset}`);
      this.testResults.push({ test: 'get_server_info', status: 'failed', error: error.message });
      return false;
    }
  }

  /**
   * Test list_folders tool
   */
  async testListFolders() {
    console.log(`\n${colors.blue}Test 4: List Folders${colors.reset}`);
    this.totalTests++;
    
    try {
      const startTime = Date.now();
      const response = await this.sendRequest('tools/call', {
        name: 'list_folders',
        arguments: {}
      }, 4);
      const responseTime = Date.now() - startTime;
      
      if (response.result) {
        console.log(`${colors.green}✓ Folders list retrieved (${responseTime}ms)${colors.reset}`);
        const content = response.result.content?.[0]?.text;
        if (content) {
          const lines = content.split('\n').slice(0, 10);
          lines.forEach(line => console.log(`  ${line}`));
        }
        this.passedTests++;
        this.testResults.push({ 
          test: 'list_folders', 
          status: 'passed', 
          responseTime,
          content 
        });
        return true;
      } else {
        throw new Error('Invalid folders list response');
      }
    } catch (error) {
      console.log(`${colors.red}✗ List folders failed: ${error.message}${colors.reset}`);
      this.testResults.push({ test: 'list_folders', status: 'failed', error: error.message });
      return false;
    }
  }

  /**
   * Test search tool (placeholder expected)
   */
  async testSearch() {
    console.log(`\n${colors.blue}Test 5: Search (Placeholder)${colors.reset}`);
    this.totalTests++;
    
    try {
      const startTime = Date.now();
      const response = await this.sendRequest('tools/call', {
        name: 'search',
        arguments: {
          query: 'test query'
        }
      }, 5);
      const responseTime = Date.now() - startTime;
      
      if (response.result) {
        console.log(`${colors.green}✓ Search response received (${responseTime}ms)${colors.reset}`);
        const content = response.result.content?.[0]?.text;
        if (content && content.includes('Sprint 7')) {
          console.log(`  ${colors.yellow}Placeholder response as expected${colors.reset}`);
          console.log(`  ${content}`);
        }
        this.passedTests++;
        this.testResults.push({ 
          test: 'search', 
          status: 'passed', 
          responseTime,
          content 
        });
        return true;
      } else {
        throw new Error('Invalid search response');
      }
    } catch (error) {
      console.log(`${colors.red}✗ Search failed: ${error.message}${colors.reset}`);
      this.testResults.push({ test: 'search', status: 'failed', error: error.message });
      return false;
    }
  }

  /**
   * Test performance with multiple calls
   */
  async testPerformance() {
    console.log(`\n${colors.blue}Test 6: Performance (5 sequential calls)${colors.reset}`);
    this.totalTests++;
    
    const times = [];
    let allPassed = true;
    
    for (let i = 0; i < 5; i++) {
      try {
        const startTime = Date.now();
        await this.sendRequest('tools/call', {
          name: 'get_server_info',
          arguments: {}
        }, 10 + i);
        const responseTime = Date.now() - startTime;
        times.push(responseTime);
        console.log(`  Call ${i + 1}: ${responseTime}ms`);
      } catch (error) {
        console.log(`  Call ${i + 1}: Failed`);
        allPassed = false;
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log(`${colors.green}✓ Performance test completed${colors.reset}`);
      console.log(`  Average: ${avgTime.toFixed(0)}ms`);
      console.log(`  Min: ${minTime}ms, Max: ${maxTime}ms`);
      
      if (avgTime < 500) {
        this.passedTests++;
        this.testResults.push({ 
          test: 'performance', 
          status: 'passed', 
          avgTime,
          times 
        });
      } else {
        console.log(`  ${colors.yellow}⚠ Average time exceeds 500ms threshold${colors.reset}`);
        this.testResults.push({ 
          test: 'performance', 
          status: 'warning', 
          avgTime,
          times 
        });
      }
    } else {
      this.testResults.push({ test: 'performance', status: 'failed' });
    }
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
    console.log(`${'='.repeat(60)}`);
    
    const passRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    const statusColor = this.passedTests === this.totalTests ? colors.green : 
                       this.passedTests > 0 ? colors.yellow : colors.red;
    
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${colors.green}${this.passedTests}${colors.reset}`);
    console.log(`Failed: ${colors.red}${this.totalTests - this.passedTests}${colors.reset}`);
    console.log(`Pass Rate: ${statusColor}${passRate}%${colors.reset}`);
    
    console.log(`\nDetailed Results:`);
    this.testResults.forEach(result => {
      const status = result.status === 'passed' ? `${colors.green}✓${colors.reset}` :
                    result.status === 'warning' ? `${colors.yellow}⚠${colors.reset}` :
                    `${colors.red}✗${colors.reset}`;
      const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
      console.log(`  ${status} ${result.test}${time}`);
      if (result.error) {
        console.log(`    ${colors.gray}Error: ${result.error}${colors.reset}`);
      }
    });
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = path.join(__dirname, `test-results-${timestamp}.json`);
    require('fs').writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: this.totalTests,
        passed: this.passedTests,
        failed: this.totalTests - this.passedTests,
        passRate
      },
      results: this.testResults
    }, null, 2));
    
    console.log(`\n${colors.gray}Results saved to: ${resultsPath}${colors.reset}`);
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup() {
    if (this.server) {
      console.log(`\n${colors.blue}Shutting down MCP server...${colors.reset}`);
      this.server.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    try {
      console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
      console.log(`${colors.blue}MCP ENDPOINT TEST SUITE - SPRINT 4${colors.reset}`);
      console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
      
      // Start server
      await this.startServer();
      
      // Run tests
      const initialized = await this.testInitialization();
      
      if (initialized) {
        await this.testToolsList();
        await this.testServerInfo();
        await this.testListFolders();
        await this.testSearch();
        await this.testPerformance();
      }
      
      // Generate summary
      this.generateSummary();
      
    } catch (error) {
      console.error(`${colors.red}Test suite failed: ${error.message}${colors.reset}`);
    } finally {
      await this.cleanup();
      process.exit(this.passedTests === this.totalTests ? 0 : 1);
    }
  }
}

// Check if daemon is running before starting tests
async function checkDaemon() {
  try {
    const response = await fetch('http://localhost:3002/api/v1/health');
    const data = await response.json();
    if (data.status === 'healthy') {
      console.log(`${colors.green}✓ Daemon is running and healthy${colors.reset}\n`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Daemon is not running or not accessible${colors.reset}`);
    console.log(`${colors.yellow}Please start the daemon with: npm run daemon:restart${colors.reset}`);
    return false;
  }
}

// Main execution
async function main() {
  const daemonRunning = await checkDaemon();
  if (!daemonRunning) {
    process.exit(1);
  }
  
  const runner = new MCPTestRunner();
  await runner.runAllTests();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}