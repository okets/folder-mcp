import { KeyboardManager, IVisualElement, KeyBinding } from '../keyboard/KeyboardManager.js';

export abstract class VisualElement implements IVisualElement {
  protected _active: boolean = false;
  protected _focused: boolean = false;
  protected _id: string;
  protected _parent: VisualElement | null = null;
  protected _children: VisualElement[] = [];
  public keyboardManager: KeyboardManager;

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
    this._active = active;
    // NOTE: Do NOT call keyboardManager.setActiveElement here as it creates circular dependency
    // KeyboardManager should call setActive directly
  }

  setFocused(focused: boolean): void { 
    this._focused = focused; 
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

  // Abstract methods that must be implemented
  abstract processKeystroke(key: string): boolean;
  abstract getRenderContent(): string[];
  abstract getShortcuts(): KeyBinding[];
}