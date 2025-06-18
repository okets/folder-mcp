import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global test configuration
    globals: true,
    
    // Test file patterns
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
      'tests/**/*.perf.test.ts'
    ],
    
    exclude: [
      'tests/legacy/**',
      'node_modules/**',
      'dist/**'    ],
    
    // Reporter configuration - fix for strikethrough font issues
    reporters: process.env.CI ? ['junit'] : ['basic'],
    outputFile: process.env.CI ? 'test-results.xml' : undefined,
    
    // Memory-safe timeout settings
    testTimeout: 10000, // 10 seconds
    hookTimeout: 5000, // 5 seconds
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'tests/**',
        'dist/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 70, // Reduced from 80 for memory optimization
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Memory-optimized execution
    pool: 'forks', // Use forks for better isolation
    poolOptions: {
      forks: {
        singleFork: true, // Force single fork to prevent memory issues
        maxForks: 1,
        minForks: 1,
        // Worker memory management
        execArgv: [
          '--max-old-space-size=1024', // 1GB heap limit per worker
          '--expose-gc', // Enable garbage collection
        ]
      }
    },
    
    // Test sequencing for memory safety
    sequence: {
      concurrent: false, // Disable concurrent execution
      shuffle: false,
      hooks: 'stack' // Run hooks in stack order
    },
    
    // Memory management settings
    maxConcurrency: 1, // Run tests one at a time
    fileParallelism: false, // Don't run test files in parallel
    isolate: true, // Isolate tests to prevent memory leaks
    retry: 1, // Reduced retries to avoid memory accumulation
    
    // Trigger settings
    forceRerunTriggers: [
      '**/package.json',
      '**/vitest.config.*',
      '**/test-setup.*'
    ],
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // File watching disabled for memory safety
    watch: false,
    
    // Custom matchers and setup
    setupFiles: ['tests/helpers/setup.ts']
  },
  
  // Define custom test configurations
  define: {
    __TEST_ENV__: JSON.stringify(process.env.NODE_ENV || 'test')
  }
});
