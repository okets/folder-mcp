import { Shortcut, ShortcutContext, ShortcutProvider } from './types.js';

export class ShortcutRegistry {
  private providers: Map<string, ShortcutProvider> = new Map();

  register(id: string, provider: ShortcutProvider): void {
    this.providers.set(id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  getActiveShortcuts(context: ShortcutContext): Shortcut[] {
    const keyMap = new Map<string, Shortcut>();
    
    // Process hierarchy from least specific to most specific
    // Later entries override earlier ones for same keys (child precedence)
    for (const element of [...context.focusHierarchy].reverse()) {
      const shortcuts = element.provider.getShortcuts(context);
      
      for (const shortcut of shortcuts) {
        keyMap.set(shortcut.key.toLowerCase(), shortcut);
      }
    }
    
    // Return shortcuts sorted by priority (highest first)
    return Array.from(keyMap.values())
      .sort((a, b) => b.priority - a.priority);
  }

  formatShortcuts(shortcuts: Shortcut[]): string {
    return shortcuts
      .map(s => `${s.key}: ${s.description}`)
      .join(' • ');
  }
}