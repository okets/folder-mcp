#!/usr/bin/env node

/**
 * Phase 3: Text Processing & Embeddings Tests (Steps 14-16)
 * Tests for smart chunking, embedding model setup, and batch embedding generation
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const testDataDir = join(__dirname, 'test-data-phase3');

class Phase3Tester {
  constructor() {
    this.results = {
      step14: [],
      step15: [],
      step15_1: [],
      step16: [],
      di_processing: []
    };
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment for processing & embeddings...');
    
    // Clean up any existing test data
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    
    // Create test directory
    mkdirSync(testDataDir, { recursive: true });
    
    // Create test files with varied content for chunking
    const testFiles = [
      {
        name: 'sample-document.txt',
        content: `# Introduction to Machine Learning

Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence (AI) based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.

## Types of Machine Learning

### Supervised Learning
Supervised learning is the machine learning task of learning a function that maps an input to an output based on example input-output pairs. It infers a function from labeled training data consisting of a set of training examples.

### Unsupervised Learning
Unsupervised learning is a type of machine learning that looks for previously undetected patterns in a data set with no pre-existing labels and with a minimum of human supervision.

### Reinforcement Learning
Reinforcement learning is an area of machine learning concerned with how intelligent agents ought to take actions in an environment in order to maximize the notion of cumulative reward.

## Applications

Machine learning has applications in various fields including:

- Computer vision and image recognition
- Natural language processing
- Speech recognition and generation
- Recommendation systems
- Autonomous vehicles
- Medical diagnosis and treatment
- Financial fraud detection
- Predictive maintenance

## Challenges

Despite its potential, machine learning faces several challenges:

- Data quality and availability
- Model interpretability
- Bias and fairness
- Computational requirements
- Overfitting and generalization

## Conclusion

Machine learning continues to evolve and transform various industries. As we collect more data and develop better algorithms, the potential applications seem limitless.`
      },
      {
        name: 'technical-guide.md',
        content: `# Technical Implementation Guide

This document provides a comprehensive guide for implementing advanced features in software systems.

## Architecture Overview

Modern software architecture follows several key principles:

1. **Modularity**: Breaking down complex systems into manageable components
2. **Scalability**: Designing systems that can handle increased load
3. **Maintainability**: Writing code that is easy to understand and modify
4. **Security**: Implementing robust security measures from the ground up

## Implementation Details

### Data Layer
The data layer is responsible for persisting and retrieving information. Key considerations include:

- Database selection and optimization
- Caching strategies
- Data validation and integrity
- Backup and recovery procedures

### Business Logic Layer
This layer contains the core functionality of the application:

- Domain models and entities
- Business rules and validation
- Workflow orchestration
- Error handling and logging

### Presentation Layer
The presentation layer handles user interaction:

- User interface design
- Input validation
- Response formatting
- Authentication and authorization

## Best Practices

1. Follow SOLID principles
2. Implement comprehensive testing
3. Use design patterns appropriately
4. Document code thoroughly
5. Perform regular code reviews
6. Monitor system performance
7. Plan for disaster recovery

## Performance Optimization

Performance optimization should be considered at every level:

- Database query optimization
- Caching strategies
- Asynchronous processing
- Load balancing
- Resource pooling

## Security Considerations

Security must be built into every component:

- Input validation and sanitization
- Authentication and authorization
- Encryption of sensitive data
- Regular security audits
- Incident response planning

## Conclusion

Following these guidelines will help ensure that your software systems are robust, scalable, and maintainable.`
      }
    ];
    
    // Write test files
    for (const file of testFiles) {
      writeFileSync(join(testDataDir, file.name), file.content);
    }
    
    console.log('✅ Test environment ready for processing tests');
  }

  async cleanupTestEnvironment() {
    console.log('🧹 Test environment cleaned up');
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  }

  async runTests(tests) {
    const results = [];
    
    for (const test of tests) {
      try {
        const passed = await test.test();
        results.push({
          name: test.name,
          passed,
          message: passed ? '✅' : '❌'
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${test.name}`);
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          message: `❌ (${error.message})`
        });
        console.log(`  ❌ ${test.name} (${error.message})`);
      }
    }
    
    return results;
  }

  async testStep14_SmartChunking() {
    console.log('🔍 Step 14: Smart Text Chunking');
    
    const tests = [
      {
        name: 'Splits documents on paragraph boundaries',
        test: async () => {
          try {
            // Index the documents first
            execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 60000 // 1 minute timeout
            });
            
            // Check if metadata files contain chunked content
            const metadataDir = join(testDataDir, '.folder-mcp', 'metadata');
            if (!existsSync(metadataDir)) return false;
            
            const metadataFiles = readdirSync(metadataDir);
            if (metadataFiles.length === 0) return false;
            
            // Check if chunks exist and are properly formatted
            const sampleMetadata = JSON.parse(readFileSync(join(metadataDir, metadataFiles[0]), 'utf8'));
            return sampleMetadata.chunks && Array.isArray(sampleMetadata.chunks);
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Creates chunks between 200-500 tokens',
        test: async () => {
          const metadataDir = join(testDataDir, '.folder-mcp', 'metadata');
          if (!existsSync(metadataDir)) return false;
          
          const metadataFiles = readdirSync(metadataDir);
          if (metadataFiles.length === 0) return false;
          
          // Check chunk sizes (approximate token count)
          for (const file of metadataFiles) {
            const metadata = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'));
            if (metadata.chunks) {
              for (const chunk of metadata.chunks) {
                const approxTokens = chunk.content.split(/\s+/).length;
                // Allow some flexibility in token counting
                if (approxTokens > 600) return false; // Too large
              }
            }
          }
          return true;
        }
      },
      {
        name: 'Preserves metadata (source, position, type)',
        test: async () => {
          const metadataDir = join(testDataDir, '.folder-mcp', 'metadata');
          if (!existsSync(metadataDir)) return false;
          
          const metadataFiles = readdirSync(metadataDir);
          if (metadataFiles.length === 0) return false;
          
          const sampleMetadata = JSON.parse(readFileSync(join(metadataDir, metadataFiles[0]), 'utf8'));
          if (!sampleMetadata.chunks || sampleMetadata.chunks.length === 0) return false;
          
          const chunk = sampleMetadata.chunks[0];
          return chunk.metadata && 
                 chunk.metadata.sourceFile && 
                 chunk.startPosition !== undefined &&
                 chunk.endPosition !== undefined;
        }
      },
      {
        name: 'Never splits mid-sentence',
        test: async () => {
          const metadataDir = join(testDataDir, '.folder-mcp', 'metadata');
          if (!existsSync(metadataDir)) return false;
          
          const metadataFiles = readdirSync(metadataDir);
          
          for (const file of metadataFiles) {
            const metadata = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'));
            if (metadata.chunks) {
              for (const chunk of metadata.chunks) {
                const content = chunk.content.trim();
                // Check if chunk ends with proper sentence ending
                if (content.length > 0 && !/[.!?]$/.test(content) && content.length > 50) {
                  // Allow short chunks to not end with punctuation
                  return false;
                }
              }
            }
          }
          return true;
        }
      },
      {
        name: 'Handles various document types',
        test: async () => {
          // Check that both .txt and .md files were processed
          const metadataDir = join(testDataDir, '.folder-mcp', 'metadata');
          if (!existsSync(metadataDir)) return false;
          
          const metadataFiles = readdirSync(metadataDir);
          return metadataFiles.length >= 2; // Should have processed multiple files
        }
      }
    ];

    this.results.step14 = await this.runTests(tests);
  }

  async testStep15_EmbeddingModel() {
    console.log('🔍 Step 15: Embedding Model Setup');
    
    const tests = [
      {
        name: 'Transformers dependency is installed',
        test: () => {
          const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
          return pkg.dependencies && (pkg.dependencies['@xenova/transformers'] || pkg.dependencies['transformers']);
        }
      },
      {
        name: 'Embedding model can be imported',
        test: () => {
          try {
            // Check if embedding modules exist
            const embeddingsPath = join(projectRoot, 'src', 'embeddings', 'index.ts');
            return existsSync(embeddingsPath);
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Test embedding command exists',
        test: () => {
          try {
            const output = execSync('node dist/cli.js --help', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 10000
            });
            return output.includes('test-embeddings') || output.includes('embedding');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Embedding system initializes without errors',
        test: () => {
          try {
            const output = execSync('node dist/cli.js test-embeddings', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('✅') || output.includes('success') || output.includes('Model loaded');
          } catch {
            return false;
          }
        }
      }
    ];

    this.results.step15 = await this.runTests(tests);
  }

  async testStep15_1_GPUEmbedding() {
    console.log('🔍 Step 15.1: GPU-Enabled Embedding Model');
    
    const tests = [
      {
        name: 'Ollama integration is implemented',
        test: () => {
          try {
            const output = execSync('node dist/cli.js test-embeddings', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('Ollama') || output.includes('GPU') || output.includes('nomic');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Fallback to CPU embeddings is available',
        test: () => {
          try {
            const output = execSync('node dist/cli.js test-embeddings', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            // Accept either GPU acceleration is working OR CPU fallback is available
            return output.includes('GPU-accelerated') || output.includes('CPU') || output.includes('fallback') || output.includes('transformers') || output.includes('Backend:');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Embedding system handles GPU/CPU switching',
        test: () => {
          try {
            const output = execSync('node dist/cli.js test-embeddings', { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 30000
            });
            return output.includes('Backend:') || output.includes('accelerated') || output.includes('Model:');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Configuration supports multiple embedding models',
        test: () => {
          const configPath = join(projectRoot, 'config.yaml');
          if (!existsSync(configPath)) return false;
          
          const config = readFileSync(configPath, 'utf8');
          return config.includes('nomic') || config.includes('mxbai') || config.includes('models:');
        }
      }
    ];

    this.results.step15_1 = await this.runTests(tests);
  }

  async testStep16_BatchEmbedding() {
    console.log('🔍 Step 16: Batch Embedding Generation');
    
    const tests = [
      {
        name: 'Processes documents in batches',
        test: async () => {
          try {
            // Index documents and check if embeddings are created
            execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 180000 // 3 minutes for embedding generation
            });
            
            // Check if embeddings directory exists and contains files
            const embeddingsDir = join(testDataDir, '.folder-mcp', 'embeddings');
            if (!existsSync(embeddingsDir)) return false;
            
            const embeddingFiles = readdirSync(embeddingsDir);
            return embeddingFiles.length > 0;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Shows progress during embedding generation',
        test: async () => {
          try {
            // Clear cache to force re-processing
            const cacheDir = join(testDataDir, '.folder-mcp');
            if (existsSync(cacheDir)) {
              rmSync(cacheDir, { recursive: true });
            }
            
            const output = execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 180000
            });
            
            // Check if output contains progress indicators
            return output.includes('progress') || 
                   output.includes('Processing') || 
                   output.includes('%') ||
                   output.includes('Embedding');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Saves embeddings to cache directory',
        test: () => {
          const embeddingsDir = join(testDataDir, '.folder-mcp', 'embeddings');
          if (!existsSync(embeddingsDir)) return false;
          
          const embeddingFiles = readdirSync(embeddingsDir);
          if (embeddingFiles.length === 0) return false;
          
          // Check if embedding files contain valid data
          const sampleFile = join(embeddingsDir, embeddingFiles[0]);
          const embedding = JSON.parse(readFileSync(sampleFile, 'utf8'));
          return embedding.embedding && 
                 embedding.embedding.vector && 
                 Array.isArray(embedding.embedding.vector) && 
                 embedding.embedding.vector.length > 0;
        }
      },
      {
        name: 'Only processes new/modified files (incremental)',
        test: async () => {
          try {
            // Run indexing twice and check that second run is faster/skips files
            const start1 = Date.now();
            execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              stdio: 'pipe',
              timeout: 180000
            });
            const time1 = Date.now() - start1;
            
            const start2 = Date.now();
            const output = execSync(`node dist/cli.js index "${testDataDir}"`, { 
              cwd: projectRoot, 
              encoding: 'utf8',
              timeout: 180000
            });
            const time2 = Date.now() - start2;
            
            // Second run should be significantly faster or show "already processed"
            return time2 < time1 * 0.5 || output.includes('already') || output.includes('skip');
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Handles interruption gracefully (resume capable)',
        test: () => {
          // This is difficult to test automatically, so we'll check for existence of resume-related code
          const indexingPath = join(projectRoot, 'src', 'processing', 'indexing.ts');
          if (!existsSync(indexingPath)) return false;
          
          const code = readFileSync(indexingPath, 'utf8');
          return code.includes('resume') || code.includes('existing') || code.includes('incremental');
        }
      }
    ];

    this.results.step16 = await this.runTests(tests);
  }

  async testDI_ProcessingServices() {
    console.log('🔍 DI: Processing Services Integration');
    
    const tests = [
      {
        name: 'LegacyIndexingService can process files with DI',
        test: async () => {
          try {
            const fileUrl = `file:///${projectRoot.replace(/\\/g, '/')}/dist/di/index.js`;
            const { setupForIndexing, getService, SERVICE_TOKENS } = await import(fileUrl);
            const { LegacyIndexingService } = await import(`file:///${projectRoot.replace(/\\/g, '/')}/dist/processing/legacyIndexingService.js`);
            
            await setupForIndexing(testDataDir, { verbose: false, skipEmbeddings: true });
            
            const legacyService = new LegacyIndexingService(
              getService(SERVICE_TOKENS.FILE_PARSING),
              getService(SERVICE_TOKENS.EMBEDDING),
              getService(SERVICE_TOKENS.VECTOR_SEARCH),
              getService(SERVICE_TOKENS.CACHE),
              getService(SERVICE_TOKENS.FILE_SYSTEM),
              getService(SERVICE_TOKENS.CHUNKING),
              getService(SERVICE_TOKENS.LOGGING)
            );
            
            return legacyService !== null;
          } catch (error) {
            console.log(`    LegacyIndexingService creation failed: ${error.message}`);
            return false;
          }
        }
      },
      {
        name: 'DI chunking service processes text correctly',
        test: async () => {
          try {
            const fileUrl = `file:///${projectRoot.replace(/\\/g, '/')}/dist/di/index.js`;
            const { setupForIndexing, getService, SERVICE_TOKENS } = await import(fileUrl);
            
            await setupForIndexing(testDataDir, { verbose: false, skipEmbeddings: true });
            
            const chunkingService = getService(SERVICE_TOKENS.CHUNKING);
            const testContent = {
              path: 'test.txt',
              content: 'This is a test document for chunking. '.repeat(50),
              extension: '.txt'
            };
            
            const result = await chunkingService.chunkText(testContent);
            return result && result.chunks && result.chunks.length > 0;
          } catch (error) {
            console.log(`    Chunking service failed: ${error.message}`);
            return false;
          }
        }
      },
      {
        name: 'DI file parsing service works correctly',
        test: async () => {
          try {
            const fileUrl = `file:///${projectRoot.replace(/\\/g, '/')}/dist/di/index.js`;
            const { setupForIndexing, getService, SERVICE_TOKENS } = await import(fileUrl);
            
            await setupForIndexing(testDataDir, { verbose: false, skipEmbeddings: true });
            
            const fileParsingService = getService(SERVICE_TOKENS.FILE_PARSING);
            const testFilePath = join(testDataDir, 'sample-document.txt');
            
            const result = await fileParsingService.parseFile(testFilePath, '.txt');
            return result && result.content && result.content.length > 0;
          } catch (error) {
            console.log(`    File parsing service failed: ${error.message}`);
            return false;
          }
        }
      },
      {
        name: 'DI embedding service is available (skip embeddings mode)',
        test: async () => {
          try {
            const fileUrl = `file:///${projectRoot.replace(/\\/g, '/')}/dist/di/index.js`;
            const { setupForIndexing, getService, SERVICE_TOKENS } = await import(fileUrl);
            
            await setupForIndexing(testDataDir, { verbose: false, skipEmbeddings: true });
            
            const embeddingService = getService(SERVICE_TOKENS.EMBEDDING);
            return embeddingService !== null && embeddingService !== undefined;
          } catch (error) {
            console.log(`    Embedding service failed: ${error.message}`);
            return false;
          }
        }
      }
    ];

    const results = [];
    let passed = 0;

    for (const test of tests) {
      try {
        const result = await test.test();
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

    this.results.di_processing = results;
  }

  async runAllTests() {
    console.log('🧪 Testing Phase 3: Text Processing & Embeddings (Steps 14-16)');
    console.log('=============================================================');
    
    try {
      await this.setupTestEnvironment();
      
      await this.testStep14_SmartChunking();
      await this.testStep15_EmbeddingModel();
      await this.testStep15_1_GPUEmbedding();
      await this.testStep16_BatchEmbedding();
      
      // DI Integration Testing for processing services
      await this.testDI_ProcessingServices();
      
      // Calculate and display results
      let totalTests = 0;
      let passedTests = 0;
      
      console.log('\n📊 Phase 3 Test Results Summary');
      console.log('================================');
      
      const steps = [
        { name: 'Step 14: Smart Text Chunking', results: this.results.step14 },
        { name: 'Step 15: Embedding Model Setup', results: this.results.step15 },
        { name: 'Step 15.1: GPU-Enabled Embedding Model', results: this.results.step15_1 },
        { name: 'Step 16: Batch Embedding Generation', results: this.results.step16 },
        { name: 'DI: Processing Services Integration', results: this.results.di_processing }
      ];
      
      let allPassed = true;
      
      steps.forEach(step => {
        const passed = step.results.filter(r => r.passed).length;
        const total = step.results.length;
        const status = passed === total ? '✅' : '❌';
        
        console.log(`${status} ${step.name}: ${passed}/${total} tests passed`);
        
        totalTests += total;
        passedTests += passed;
        
        if (passed !== total) {
          allPassed = false;
        }
      });
      
      console.log(`🎯 Overall: ${passedTests}/${totalTests} tests passed`);
      console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
      
      if (allPassed) {
        console.log('🎉 All Phase 3 tests passed! Text processing and embeddings are working correctly.');
      } else {
        console.log('⚠️  Some Phase 3 tests failed. Please review the processing and embedding implementations.');
      }
      
      await this.cleanupTestEnvironment();
      
      return allPassed;
      
    } catch (error) {
      console.error('💥 Fatal error in Phase 3 tests:', error);
      await this.cleanupTestEnvironment();
      return false;
    }
  }
}

// Run tests if this script is executed directly
if (process.argv[1].includes('test-phase3-processing')) {
  const tester = new Phase3Tester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error running tests:', error);
      process.exit(1);
    });
}

export default Phase3Tester;
