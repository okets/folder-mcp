/**
 * Temporary stub for config resolver
 * TODO: Remove when all imports are updated to use SimpleConfigLoader
 */

import { ResolvedConfig } from './schema.js';

export async function resolveConfig(folderPath: string, cliArgs: any = {}): Promise<ResolvedConfig> {
  // Delegate to the new DEAD SIMPLE configuration system
  const { loadSimpleConfiguration, convertToResolvedConfig } = await import('../application/config/SimpleConfigLoader.js');
  const simpleConfig = await loadSimpleConfiguration(folderPath);
  return convertToResolvedConfig(simpleConfig);
}

export function validateResolvedConfig(config: ResolvedConfig): any[] {
  // TODO: Implement proper validation
  return [];
}

export { ResolvedConfig };