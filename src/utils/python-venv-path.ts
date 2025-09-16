/**
 * Cross-platform Python venv path utility
 *
 * Provides platform-aware Python executable path resolution for the venv.
 * Critical for Windows compatibility while maintaining Unix support.
 */

import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Get the platform-specific Python executable path for the venv
 *
 * @returns The full path to the Python executable in the venv
 * @throws Error if venv is not found at expected location
 */
export function getVenvPythonPath(): string {
  const venvDir = join(process.cwd(), 'src/infrastructure/embeddings/python/venv');

  // Platform-specific Python executable
  const pythonExe = process.platform === 'win32'
    ? join('Scripts', 'python.exe')
    : join('bin', 'python3');

  const fullPath = join(venvDir, pythonExe);

  // Verify venv exists
  if (!existsSync(fullPath)) {
    // Provide helpful error message with platform info
    throw new Error(
      `Python venv not found at ${fullPath}. ` +
      `Platform: ${process.platform}. ` +
      `Please run the setup script to create the venv.`
    );
  }

  return fullPath;
}

/**
 * Check if Python venv exists without throwing
 *
 * @returns true if venv exists, false otherwise
 */
export function hasVenvPython(): boolean {
  try {
    getVenvPythonPath();
    return true;
  } catch {
    return false;
  }
}