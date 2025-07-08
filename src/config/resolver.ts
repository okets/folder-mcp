/**
 * Temporary stub for config resolver
 * TODO: Remove when all imports are updated to use HybridConfigLoader
 */

import { ResolvedConfig } from './schema.js';

export async function resolveConfig(folderPath: string, cliArgs: any = {}): Promise<ResolvedConfig> {
  // Delegate to the new DEAD SIMPLE configuration system
  const { loadHybridConfiguration, convertToResolvedConfig } = await import('../application/config/HybridConfigLoader.js');
  const hybridConfig = await loadHybridConfiguration(folderPath);
  return convertToResolvedConfig(hybridConfig);
}

export function validateResolvedConfig(config: ResolvedConfig): any[] {
  // TODO: Implement proper validation
  return [];
}

export { ResolvedConfig };