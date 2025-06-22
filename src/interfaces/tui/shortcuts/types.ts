export interface Shortcut {
  key: string;           // 'Tab', 'Space', 'Enter', 'Esc', 'q', '↑↓', etc.
  description: string;   // 'Switch Focus', 'Select', 'Cancel Edit', etc.
  priority: number;      // Higher = more important (shown first in same hierarchy level)
}

export interface ShortcutProvider {
  getShortcuts(context: ShortcutContext): Shortcut[];
}

export interface FocusElement {
  id: string;                    // 'textbox-name', 'configuration-panel', 'window'
  type: 'textbox' | 'checkbox' | 'form' | 'panel' | 'window';
  provider: ShortcutProvider;
}

export interface ShortcutContext {
  focusHierarchy: FocusElement[];  // [textbox, form, configuration, window] - most specific first
  globalState: {
    canScroll: boolean;
    canNavigate: boolean;
    isEditing: boolean;
    currentFocus: 'main' | 'status' | null;
  };
}