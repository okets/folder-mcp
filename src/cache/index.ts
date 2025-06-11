/**
 * DEPRECATED: Legacy cache module - Backward Compatibility Layer
 * 
 * This module provides backward compatibility during the migration to the new
 * infrastructure-based architecture. New code should import from:
 * 
 * import { CacheManager } from '../infrastructure/cache'
 */

// Re-export the main functions for backward compatibility
export { 
  setupCacheDirectory,
  loadPreviousIndex,
  detectCacheStatus,
  displayCacheStatus,
  saveFingerprintsToCache 
} from '../infrastructure/cache/manager.js';
