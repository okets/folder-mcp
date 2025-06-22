import { Shortcut, ShortcutContext, ShortcutProvider } from '../types.js';

export class CheckboxProvider implements ShortcutProvider {
  constructor(private checkboxId: string) {}

  getShortcuts(context: ShortcutContext): Shortcut[] {
    // Only show shortcuts if this specific checkbox is focused
    const isFocused = context.focusHierarchy.some(
      element => element.type === 'checkbox' && element.id === this.checkboxId
    );
    
    if (!isFocused) return [];
    
    return [
      { key: 'Space', description: 'Toggle', priority: 10 },         // Checkbox-specific
      { key: 'Enter', description: 'Confirm Selection', priority: 9 }, // Overrides parent Enter
      { key: 'Tab', description: 'Next Option', priority: 8 },       // Overrides parent Tab
      { key: '↑↓', description: 'Navigate Options', priority: 7 }
    ];
  }
}