import { Shortcut, ShortcutContext, ShortcutProvider } from '../types.js';

export class PanelProvider implements ShortcutProvider {
  constructor(private panelType: 'configuration' | 'status') {}

  getShortcuts(context: ShortcutContext): Shortcut[] {
    const shortcuts: Shortcut[] = [];
    
    // Only show shortcuts if this panel is currently focused
    if (context.globalState.currentFocus === 'main' && this.panelType === 'configuration') {
      shortcuts.push(
        { key: 'Tab', description: 'Switch Focus', priority: 8 },
        { key: 'Tab+S', description: 'Focus Status', priority: 7 },
        { key: '↑↓/PgUp/PgDn', description: 'Scroll', priority: 6 },
        { key: 'Enter', description: 'Select Option', priority: 5 }
      );
    } else if (context.globalState.currentFocus === 'status' && this.panelType === 'status') {
      shortcuts.push(
        { key: 'Tab', description: 'Switch Focus', priority: 8 },
        { key: 'Tab+C', description: 'Focus Configuration', priority: 7 },
        { key: '↑↓/PgUp/PgDn', description: 'Scroll', priority: 6 }
      );
    }
    
    return shortcuts;
  }
}