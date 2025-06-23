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
    console.error(`KeyboardManager: setActiveElement called with ${element ? element.constructor.name + '(' + (element as any).id + ')' : 'null'}`);
    
    // Deactivate previous active element
    if (this.activeElement && this.activeElement !== element) {
      console.error(`KeyboardManager: Deactivating previous element ${this.activeElement.constructor.name}(${(this.activeElement as any).id})`);
      this.activeElement.setActive(false);
    }
    
    this.activeElement = element;
    
    // Activate new element and propagate focus up the chain
    if (element) {
      console.error(`KeyboardManager: Activating element ${element.constructor.name}(${(element as any).id})`);
      element.setActive(true);
      this.propagateFocusToParentChain(element);
    }
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
      return this.activeElement.processKeystroke(key);
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
}