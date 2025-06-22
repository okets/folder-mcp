import { Shortcut, ShortcutContext, ShortcutProvider } from '../types.js';

export class TextboxProvider implements ShortcutProvider {
  constructor(private textboxId: string) {}

  getShortcuts(context: ShortcutContext): Shortcut[] {
    // Only show shortcuts if this specific textbox is focused
    const isFocused = context.focusHierarchy.some(
      element => element.type === 'textbox' && element.id === this.textboxId
    );
    
    if (!isFocused) return [];
    
    return [
      { key: 'Esc', description: 'Cancel Edit', priority: 10 },      // Overrides parent Esc
      { key: 'Enter', description: 'Confirm', priority: 10 },        // Overrides parent Enter
      { key: 'Tab', description: 'Next Field', priority: 8 },        // Overrides parent Tab
      { key: '←→', description: 'Move Cursor', priority: 7 }
    ];
  }
}