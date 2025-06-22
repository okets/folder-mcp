import { useContext } from 'react';
import { ShortcutRegistry } from '../ShortcutRegistry.js';
import { ShortcutContext } from '../types.js';
import { DIContext } from '../../di/DIContext.js';

export const useShortcuts = (context: ShortcutContext) => {
  const diContainer = useContext(DIContext);
  const registry = diContainer?.get<ShortcutRegistry>('shortcutRegistry');
  
  if (!registry) {
    throw new Error('ShortcutRegistry not found in DI container');
  }
  
  return {
    shortcuts: registry.getActiveShortcuts(context),
    formatShortcuts: (shortcuts = registry.getActiveShortcuts(context)) => 
      registry.formatShortcuts(shortcuts)
  };
};