import { Shortcut, ShortcutContext, ShortcutProvider } from '../types.js';

export class WindowProvider implements ShortcutProvider {
  getShortcuts(context: ShortcutContext): Shortcut[] {
    const shortcuts: Shortcut[] = [
      { key: 'q', description: 'Quit', priority: 1 }
    ];
    
    // Only show global navigation if no specific focus
    if (context.globalState.currentFocus === null) {
      shortcuts.push(
        { key: 'Tab', description: 'Focus Configuration', priority: 2 }
      );
    }
    
    return shortcuts;
  }
}