import { KeyboardManager, IVisualElement, KeyBinding } from '../keyboard/KeyboardManager.js';

export abstract class VisualElement implements IVisualElement {
  protected _active: boolean = false;
  protected _focused: boolean = false;
  protected _id: string;
  protected _parent: VisualElement | null = null;
  protected _children: VisualElement[] = [];
  public keyboardManager: KeyboardManager;
  private listeners: Set<() => void> = new Set();

  constructor(id: string) {
    this._id = id;
    this.keyboardManager = KeyboardManager.getInstance();
  }

  // Core properties
  get id(): string { 
    return this._id; 
  }

  get active(): boolean { 
    return this._active; 
  }

  get focused(): boolean { 
    return this._focused; 
  }

  // Hierarchy management
  get parent(): VisualElement | null {
    return this._parent;
  }

  get children(): VisualElement[] {
    return [...this._children]; // Return copy for safety
  }

  getParent(): VisualElement | null {
    return this._parent;
  }

  getChildren(): VisualElement[] {
    return [...this._children];
  }

  getRoot(): VisualElement {
    let current: VisualElement = this;
    while (current._parent) {
      current = current._parent;
    }
    return current;
  }

  // State management - enforced by KeyboardManager
  setActive(active: boolean): void { 
    if (this._active !== active) {
      this._active = active;
      console.error(`VisualElement[${this.id}].setActive: ${active}, notifying ${this.listeners.size} listeners`);
      this.notifyChange();
    }
    // NOTE: Do NOT call keyboardManager.setActiveElement here as it creates circular dependency
    // KeyboardManager should call setActive directly
  }

  setFocused(focused: boolean): void { 
    if (this._focused !== focused) {
      this._focused = focused;
      this.notifyChange();
    }
  }

  // Child management
  addChild(child: VisualElement): void {
    if (!this._children.includes(child)) {
      this._children.push(child);
      child._parent = this;
    }
  }

  removeChild(child: VisualElement): void {
    const index = this._children.indexOf(child);
    if (index !== -1) {
      this._children.splice(index, 1);
      child._parent = null;
    }
  }

  // Event system for React integration
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected notifyChange(): void {
    this.listeners.forEach(listener => listener());
  }

  // Abstract methods that must be implemented
  abstract processKeystroke(key: string): boolean;
  abstract getRenderContent(): string[];
  abstract getShortcuts(): KeyBinding[];
}