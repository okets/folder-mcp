# Environment Error Handling

## Overview

This document describes the environment error detection and handling system that prevents data loss when Node.js native modules are incompatible with the current runtime.

## Problem Statement

When Node.js is upgraded (e.g., via `brew upgrade`), native modules like `better-sqlite3` and `sqlite-vec` may become incompatible because they were compiled against a different Node.js version. This results in errors like:

```
The module was compiled against a different Node.js version using
NODE_MODULE_VERSION 137. This version of Node.js requires
NODE_MODULE_VERSION 141. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```

**Critical Issue (Fixed Dec 2024)**: Previously, when database initialization failed due to this error, the cleanup logic would:
1. Delete the `.folder-mcp` directory containing all indexed data
2. Remove the folder from configuration

This was **catastrophic** for an environment error that is NOT the user's fault.

## Solution Architecture

### 1. Environment Error Detection

The `isEnvironmentError()` function in `monitored-folders-orchestrator.ts` detects environment-related errors:

```typescript
function isEnvironmentError(error: Error | string): boolean {
  // Detects:
  // - NODE_MODULE_VERSION mismatch
  // - Native module loading failures (dlopen)
  // - better-sqlite3 / sqlite-vec specific issues
  // - Python environment issues
}
```

### 2. Data Preservation on Environment Errors

The `performResourceCleanup()` function now accepts an `originalError` parameter:

```typescript
private async performResourceCleanup(
  folderPath: string,
  reason: string,
  originalError?: Error
): Promise<void>
```

When an environment error is detected:
- **DO NOT** delete the `.folder-mcp` directory (preserves indexed data)
- **DO NOT** remove folder from configuration (allows retry after fix)
- Clean up only transient resources (managers, watchers, pending operations)
- Log clear message about what to do to fix

### 3. Early Environment Validation

The daemon startup (`daemon/index.ts`) now validates native modules before any folder operations:

```typescript
async function validateEnvironment(): Promise<EnvironmentValidationResult> {
  // Tests better-sqlite3 and sqlite-vec by creating in-memory databases
  // Returns success status and detailed error messages
}
```

If validation fails:
- Prominent warning is logged
- Daemon continues to start (so TUI can display error)
- Folder operations will fail gracefully
- User sees clear instructions on how to fix

## Error Categories

### Environment Errors (Data Preserved)
- Native module version mismatch (`NODE_MODULE_VERSION`)
- Native module loading failures (`dlopen`, `cannot load such file`)
- Python environment issues (for GPU models)

### Folder Errors (Cleanup Allowed)
- Folder doesn't exist
- Permission denied
- Invalid path

## User-Facing Messages

When environment errors occur, users see:

```
========================================================
NATIVE MODULE ISSUES DETECTED
Folder indexing will fail until this is fixed.
Your existing indexed data will be PRESERVED.

To fix, run one of:
  npm rebuild
  npm rebuild better-sqlite3
========================================================
```

## Files Modified

- `src/daemon/services/monitored-folders-orchestrator.ts`
  - Added `isEnvironmentError()` function
  - Added `getEnvironmentErrorMessage()` function
  - Modified `performResourceCleanup()` to preserve data on env errors

- `src/daemon/index.ts`
  - Added `validateEnvironment()` function
  - Added early validation on daemon startup

## Testing

To test the fix:

1. Simulate environment error by upgrading Node.js without rebuilding modules
2. Start daemon and attempt to add a folder
3. Verify:
   - Error is logged clearly
   - `.folder-mcp` directory is NOT deleted
   - Folder remains in configuration
   - After running `npm rebuild`, folder works correctly
