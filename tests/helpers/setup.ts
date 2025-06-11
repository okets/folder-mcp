/**
 * Basic test environment setup
 */

export function setupTestEnvironment(): void {
  // Basic setup for architectural tests - no complex configurations needed
  process.env.NODE_ENV = 'test';
}