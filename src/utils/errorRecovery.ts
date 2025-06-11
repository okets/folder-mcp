/**
 * DEPRECATED: Legacy error recovery module - Backward Compatibility Layer
 * 
 * This module provides backward compatibility during the migration to the new
 * infrastructure-based architecture. New code should import from:
 * 
 * import { ErrorRecoveryManager, AtomicFileOperations } from '../infrastructure/errors'
 */

// Re-export from infrastructure for backward compatibility
export * from '../infrastructure/errors/recovery.js';
