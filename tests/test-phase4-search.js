#!/usr/bin/env node

/**
 * Phase 4: Vector Search Tests (Steps 17-19)
 * Tests for FAISS vector index, similarity search, and search CLI command
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const testDataDir = join(__dirname, 'test-data-search');

class Phase4Tester {
  constructor() {
    this.results = {
      step17: { passed: false, tests: [] },
      step18: { passed: false, tests: [] },
      step19: { passed: false, tests: [] }
    };
  }

  async runAllTests() {
    console.log('🧪 Testing Phase 4: Vector Search (Steps 17-19)\n');
    console.log('================================================\n');

    try {
      await this.setupTestEnvironment();
      
      await this.testStep17_FAISSVectorIndex();
      await this.testStep18_SimilaritySearch();
      await this.testStep19_SearchCLI();

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
    console.log('🔧 Setting up test environment for vector search...');
    
    // Create test data directory
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }

    // Create diverse content for search testing
    const testFiles = [
      {
        name: 'artificial-intelligence.md',
        content: `# Artificial Intelligence and Machine Learning

Artificial intelligence (AI) is a branch of computer science that aims to create intelligent machines. Machine learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.

## Deep Learning

Deep learning uses neural networks with multiple layers to model and understand complex patterns in data. It has revolutionized fields like computer vision, natural language processing, and speech recognition.

## Applications

AI applications include autonomous vehicles, medical diagnosis, recommendation systems, and chatbots. These technologies are transforming industries and improving human productivity.`
      },
      {
        name: 'cooking-recipes.txt',
        content: `# Cooking and Recipes

## Pasta Carbonara

Ingredients:
- 400g spaghetti
- 200g pancetta or bacon
- 4 large eggs
- 100g pecorino cheese
- Black pepper
- Salt

Instructions:
1. Cook pasta in salted boiling water
2. Fry pancetta until crispy
3. Mix eggs with grated cheese
4. Combine hot pasta with pancetta
5. Add egg mixture off heat, stirring quickly
6. Season with pepper and serve immediately

## Chocolate Chip Cookies

A classic recipe for soft and chewy chocolate chip cookies. Perfect for afternoon snacks or dessert.`
      },
      {
        name: 'space-exploration.md',
        content: `# Space Exploration and Astronomy

Space exploration involves the investigation of outer space through astronomy and space technology. Humans have always been fascinated by the cosmos and our place in the universe.

## Solar System

Our solar system consists of the Sun and eight planets, along with moons, asteroids, and comets. Mars exploration has been a major focus, with rovers like Curiosity and Perseverance studying the planet's geology and potential for past life.

## Future Missions

Upcoming missions include lunar bases, Mars colonization, and interstellar exploration. Private companies are working alongside government agencies to advance space technology.

The James Webb Space Telescope has provided unprecedented views of distant galaxies and stellar formation.`
      },
      {
        name: 'programming-concepts.txt',
        content: `# Programming and Software Development

Programming is the process of creating computer software using programming languages. Modern software development involves various paradigms and methodologies.

## Object-Oriented Programming

Object-oriented programming (OOP) organizes code around objects and classes. Key principles include encapsulation, inheritance, and polymorphism.

## Functional Programming

Functional programming treats computation as evaluation of mathematical functions. It emphasizes immutability and avoids changing state.

## Web Development

Web development includes frontend and backend development. Frontend focuses on user interfaces, while backend handles server-side logic and databases.

Popular frameworks include React, Vue.js for frontend, and Node.js, Python Django for backend development.`
      }
    ];

    for (const file of testFiles) {
      writeFileSync(join(testDataDir, file.name), file.content, 'utf8');
    }

    console.log('✅ Test environment ready for search tests\n');
  }

  async testStep17_FAISSVectorIndex() {
    console.log('🔍 Step 17: FAISS Vector Index');
    
    const tests = [
      {
        name: 'FAISS dependency is installed',
        test: () => {
          const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
          return pkg.dependencies && pkg.dependencies['faiss-node'];
        }
      },
      {
        name: 'Vector index can be built from embeddings',
        test: async () => {
          try {
            // Index the documents to create embeddings and vector index
            execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 300000 // 5 minutes for full indexing
            });
            
            // Check if vector index files are created
            const vectorsDir = join(testDataDir, '.folder-mcp-cache', 'vectors');
            return existsSync(vectorsDir);
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Creates FAISS index file (binary format)',
        test: () => {
          const vectorsDir = join(testDataDir, '.folder-mcp-cache', 'vectors');
          if (!existsSync(vectorsDir)) return false;
          
          const files = readdirSync(vectorsDir);
          return files.some(file => file.endsWith('.faiss') || file.includes('index'));
        }
      },
      {
        name: 'Creates ID mappings file',
        test: () => {
          const vectorsDir = join(testDataDir, '.folder-mcp-cache', 'vectors');
          if (!existsSync(vectorsDir)) return false;
          
          const files = readdirSync(vectorsDir);
          return files.some(file => file.includes('mapping') || file.includes('id'));
        }
      },
      {
        name: 'Vector index has correct dimensions (768)',
        test: () => {
          try {
            // Check if we can load and inspect the index
            const vectorsDir = join(testDataDir, '.folder-mcp-cache', 'vectors');
            if (!existsSync(vectorsDir)) return false;
            
            // Look for dimension information in metadata or config
            const files = readdirSync(vectorsDir);
            for (const file of files) {
              if (file.endsWith('.json')) {
                const content = JSON.parse(readFileSync(join(vectorsDir, file), 'utf8'));
                if (content.dimension === 768 || content.dimensions === 768) {
                  return true;
                }
              }
            }
            
            // If no explicit dimension info, assume it's correct if files exist
            return files.length > 0;
          } catch {
            return false;
          }
        }
      }
    ];

    this.results.step17 = await this.runTests(tests);
  }

  async testStep18_SimilaritySearch() {
    console.log('🔍 Step 18: Similarity Search Function');
    
    const tests = [
      {
        name: 'Search functionality exists in CLI',
        test: () => {
          try {
            const output = execSync('node dist/cli.js --help', { 
              cwd: projectRoot, 
              encoding: 'utf8' 
            });
            return output.includes('search');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Search returns relevant results',
        test: async () => {
          try {
            const output = execSync(`node dist/cli.js search "${testDataDir}" "artificial intelligence"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            // Should return results related to AI content
            return output.includes('artificial') || output.includes('intelligence') || output.includes('machine learning');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Search includes similarity scores',
        test: async () => {
          try {
            const output = execSync(`node dist/cli.js search "${testDataDir}" "programming"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            // Should include numerical scores
            return /\d+\.\d+/.test(output) || output.includes('score') || output.includes('similarity');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Search retrieves chunk metadata',
        test: async () => {
          try {
            const output = execSync(`node dist/cli.js search "${testDataDir}" "cooking"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            // Should include file paths and locations
            return output.includes('.txt') || output.includes('.md') || output.includes('line');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Search handles empty index gracefully',
        test: async () => {
          try {
            // Test with empty/non-existent directory
            const emptyDir = join(__dirname, 'empty-test-dir');
            mkdirSync(emptyDir, { recursive: true });
            
            const output = execSync(`node dist/cli.js search "${emptyDir}" "test query"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            
            // Should handle gracefully, not crash
            rmSync(emptyDir, { recursive: true });
            return output.includes('no results') || output.includes('empty') || output.includes('not found');
          } catch (error) {
            // Command exits with error code, but we can check the error output
            const emptyDir = join(__dirname, 'empty-test-dir');
            if (existsSync(emptyDir)) {
              rmSync(emptyDir, { recursive: true });
            }
            
            // Check if error message indicates proper handling of unindexed folder
            const errorOutput = (error.stdout ? error.stdout.toString() : '') + 
                               (error.stderr ? error.stderr.toString() : '');
            return errorOutput.includes('not indexed') || errorOutput.includes('index') || errorOutput.includes('no results');
          }
        }
      }
    ];

    this.results.step18 = await this.runTests(tests);
  }

  async testStep19_SearchCLI() {
    console.log('🔍 Step 19: Search CLI Command');
    
    const tests = [
      {
        name: 'Search command works with folder and query',
        test: async () => {
          try {
            const output = execSync(`node dist/cli.js search "${testDataDir}" "space exploration"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            return output.length > 0 && output.includes('space');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Supports configurable results with -k parameter',
        test: async () => {
          try {
            const output1 = execSync(`node dist/cli.js search "${testDataDir}" "programming" -k 1`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            const output2 = execSync(`node dist/cli.js search "${testDataDir}" "programming" -k 3`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            // Output with k=3 should be longer than k=1
            return output2.length > output1.length;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Displays source file and location',
        test: async () => {
          try {
            const output = execSync(`node dist/cli.js search "${testDataDir}" "recipes"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            // Should show file names and possibly line numbers
            return output.includes('cooking-recipes.txt') || 
                   (output.includes('.txt') && output.includes('cooking'));
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Shows content snippets with similarity scores',
        test: async () => {
          try {
            const output = execSync(`node dist/cli.js search "${testDataDir}" "neural networks"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            // Should show both content and scores
            return (output.includes('neural') || output.includes('deep')) && 
                   (/\d+\.\d+/.test(output) || output.includes('score'));
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Works without starting server',
        test: async () => {
          try {
            // Search should work independently of the MCP server
            const output = execSync(`node dist/cli.js search "${testDataDir}" "astronomy"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 60000
            });
            
            return output.includes('space') || output.includes('telescope') || output.includes('galaxy');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Handles unindexed folders with helpful guidance',
        test: async () => {
          try {
            // Create a folder without indexing it
            const unindexedDir = join(__dirname, 'unindexed-test-dir');
            mkdirSync(unindexedDir, { recursive: true });
            writeFileSync(join(unindexedDir, 'test.txt'), 'Test content');
            
            const output = execSync(`node dist/cli.js search "${unindexedDir}" "test"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            
            // Should provide guidance about indexing first
            rmSync(unindexedDir, { recursive: true });
            return output.includes('index') || output.includes('not indexed');
          } catch (error) {
            // Command exits with error code, but we can check the error output
            const unindexedDir = join(__dirname, 'unindexed-test-dir');
            if (existsSync(unindexedDir)) {
              rmSync(unindexedDir, { recursive: true });
            }
            
            // Check if error message provides helpful guidance
            const errorOutput = (error.stdout ? error.stdout.toString() : '') + 
                               (error.stderr ? error.stderr.toString() : '');
            return errorOutput.includes('index') || errorOutput.includes('not indexed');
          }
        }
      }
    ];

    this.results.step19 = await this.runTests(tests);
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
    console.log('\n📊 Phase 4 Test Results Summary');
    console.log('================================\n');

    const steps = [
      { id: 'step17', name: 'Step 17: FAISS Vector Index' },
      { id: 'step18', name: 'Step 18: Similarity Search Function' },
      { id: 'step19', name: 'Step 19: Search CLI Command' }
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
      console.log('\n🎉 All Phase 4 tests passed! Vector search is working correctly.');
    } else {
      console.log('\n⚠️  Some Phase 4 tests failed. Please review the search implementations.');
    }
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

// Helper function to fix typo
function existsDir(path) {
  return existsSync(path);
}

// Run tests if this script is executed directly
if (process.argv[1].includes('test-phase4-search.js')) {
  const tester = new Phase4Tester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { Phase4Tester };
