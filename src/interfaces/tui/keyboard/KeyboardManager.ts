export interface KeyBinding {
  key: string;
  description: string;
}

export interface IVisualElement {
  setActive(active: boolean): void;
  setFocused(focused: boolean): void;
  processKeystroke(key: string): boolean;
  getShortcuts(): KeyBinding[];
  getParent(): IVisualElement | null;
  getChildren(): IVisualElement[];
  getRoot(): IVisualElement;
  readonly focused: boolean;
}

export class KeyboardManager {
  private static instance: KeyboardManager;
  private activeElement: IVisualElement | null = null;
  private renderCallbacks: (() => void)[] = [];

  private constructor() {}

  public static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager();
    }
    return KeyboardManager.instance;
  }

  /**
   * Set the currently active element (only ONE can be active at any time)
   */
  public setActiveElement(element: IVisualElement | null): void {
    // Deactivate previous active element
    if (this.activeElement && this.activeElement !== element) {
      this.activeElement.setActive(false);
    }
    
    this.activeElement = element;
    
    // Activate new element and propagate focus up the chain
    if (element) {
      element.setActive(true);
      this.propagateFocusToParentChain(element);
    }
    
    // Trigger re-render
    this.triggerRender();
  }

  /**
   * Get the currently active element
   */
  public getActiveElement(): IVisualElement | null {
    return this.activeElement;
  }

  /**
   * Process a keystroke - route to active element
   */
  public processKeystroke(key: string): boolean {
    if (this.activeElement) {
      const handled = this.activeElement.processKeystroke(key);
      if (handled) {
        // Trigger re-render after successful keystroke handling
        this.triggerRender();
      }
      return handled;
    }
    return false;
  }

  /**
   * Get keyboard shortcuts from all focused elements in the hierarchy
   */
  public getStatusBarShortcuts(): KeyBinding[] {
    if (!this.activeElement) {
      return [];
    }

    const shortcuts: KeyBinding[] = [];
    const visited = new Set<IVisualElement>();
    
    // Collect shortcuts from entire focused chain
    this.collectShortcutsFromChain(this.activeElement, shortcuts, visited);
    
    return shortcuts;
  }

  /**
   * Propagate focus up the parent chain
   */
  private propagateFocusToParentChain(element: IVisualElement): void {
    // Clear focus from all elements first
    this.clearAllFocus(element.getRoot());
    
    // Set focus up the chain to root
    let current: IVisualElement | null = element;
    while (current) {
      current.setFocused(true);
      current = current.getParent();
    }
  }

  /**
   * Clear focus from all elements in the tree
   */
  private clearAllFocus(root: IVisualElement): void {
    const visited = new Set<IVisualElement>();
    this.clearFocusRecursive(root, visited);
  }

  private clearFocusRecursive(element: IVisualElement, visited: Set<IVisualElement>): void {
    if (visited.has(element)) return;
    visited.add(element);
    
    element.setFocused(false);
    
    for (const child of element.getChildren()) {
      this.clearFocusRecursive(child, visited);
    }
  }

  /**
   * Collect shortcuts from focused chain
   */
  private collectShortcutsFromChain(element: IVisualElement, shortcuts: KeyBinding[], visited: Set<IVisualElement>): void {
    if (visited.has(element)) return;
    visited.add(element);
    
    if (element.focused) {
      shortcuts.push(...element.getShortcuts());
    }
    
    const parent = element.getParent();
    if (parent) {
      this.collectShortcutsFromChain(parent, shortcuts, visited);
    }
  }

  /**
   * Add a render callback that will be called when UI updates are needed
   */
  public addRenderCallback(callback: () => void): void {
    this.renderCallbacks.push(callback);
  }

  /**
   * Remove a render callback
   */
  public removeRenderCallback(callback: () => void): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index !== -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  /**
   * Trigger all render callbacks
   */
  private triggerRender(): void {
    this.renderCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('KeyboardManager: Error in render callback:', error);
      }
    });
  }
}