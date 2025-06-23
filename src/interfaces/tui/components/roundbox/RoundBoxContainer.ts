import { VisualElement } from '../VisualElement.js';
import { RoundBoxElement, RoundBoxElementData } from './RoundBoxElement.js';
import { KeyBinding } from '../../keyboard/KeyboardManager.js';

export class RoundBoxContainer extends VisualElement {
  private elements: RoundBoxElement[] = [];
  private focusedIndex: number = 0;
  private activeElement: RoundBoxElement | null = null;

  constructor(id: string) {
    super(id);
  }

  setElements(elementsData: RoundBoxElementData[]): void {
    this.elements = elementsData.map((data, index) => {
      const element = new RoundBoxElement(`${this.id}-element-${index}`, data);
      this.addChild(element); // Add as child in VisualElement hierarchy
      return element;
    });
    this.focusedIndex = this.elements.length > 0 ? 0 : -1;
    this.activeElement = null;
    this.updateElementFocus();
  }

  processKeystroke(key: string): boolean {
    // If an element is active, let it handle the keystroke first
    if (this.activeElement && this.activeElement.processKeystroke(key)) {
      return true;
    }

    // Handle container-level navigation
    switch (key) {
      case 'up':
        return this.navigateUp();
      case 'down':
        return this.navigateDown();
      case 'enter':
      case 'right':
        return this.activateCurrentElement();
      case 'escape':
      case 'left':
        return this.deactivateCurrentElement();
      default:
        return false;
    }
  }

  getRenderContent(): string[] {
    // Debug: log active state
    console.error(`RoundBoxContainer[${this.id}].getRenderContent: active=${this.active}, focusedIndex=${this.focusedIndex}`);
    
    return this.elements.flatMap((element, index) => {
      // When container is active and no child is active, show navigation arrows
      if (this.active && !this.activeElement && index === this.focusedIndex) {
        const content = element.getRenderContent();
        // Replace the bullet with navigation arrow for focused item and apply royal blue color
        return content.map(line => {
          // Remove any existing color codes first
          const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
          const lineWithArrow = cleanLine.replace(/^[•◦●]/, '→');
          // Apply royal blue color to the focused item
          return `\x1b[38;2;65;105;225m${lineWithArrow}\x1b[0m`;
        });
      }
      return element.getRenderContent();
    });
  }

  getRenderState() {
    const elementStates = this.elements.map((element, index) => {
      const state = element.getRenderState();
      const isFocused = index === this.focusedIndex && this.active && !this.activeElement;
      const bulletChar = element.active ? '●' : isFocused ? '→' : '•';
      
      return {
        ...state,
        focused: isFocused,
        bulletChar: bulletChar
      };
    });

    return {
      id: this.id,
      active: this.active,
      elements: elementStates,
      focusedIndex: this.focusedIndex,
      hasActiveElement: this.activeElement !== null
    };
  }

  getShortcuts(): KeyBinding[] {
    if (this.activeElement) {
      return this.activeElement.getShortcuts();
    }

    if (this.active) {
      return [
        { key: '↑↓', description: 'Navigate' },
        { key: '→/Enter', description: 'Select' },
        { key: '←/Esc', description: 'Back' }
      ];
    }

    return [];
  }

  private navigateUp(): boolean {
    if (this.elements.length === 0) {
      return false;
    }

    if (this.focusedIndex > 0) {
      this.focusedIndex--;
      this.updateElementFocus();
      this.notifyChange(); // Trigger React re-render
      return true;
    }
    return false;
  }

  private navigateDown(): boolean {
    if (this.elements.length === 0) {
      return false;
    }

    if (this.focusedIndex < this.elements.length - 1) {
      this.focusedIndex++;
      this.updateElementFocus();
      this.notifyChange(); // Trigger React re-render
      return true;
    }
    return false;
  }

  private activateCurrentElement(): boolean {
    if (this.elements.length === 0 || this.focusedIndex < 0 || this.focusedIndex >= this.elements.length) {
      return false;
    }
    
    const element = this.elements[this.focusedIndex];
    if (element) {
      this.activeElement = element;
      this.keyboardManager.setActiveElement(element);
      this.notifyChange(); // Trigger React re-render
      return true;
    }
    return false;
  }

  private deactivateCurrentElement(): boolean {
    if (this.activeElement) {
      this.activeElement.setActive(false);
      this.activeElement = null;
      // Return focus to this container
      this.keyboardManager.setActiveElement(this);
      this.notifyChange(); // Trigger React re-render
      return true;
    }
    return false;
  }

  getFocusedElement(): RoundBoxElement | null {
    if (this.focusedIndex >= 0 && this.focusedIndex < this.elements.length) {
      return this.elements[this.focusedIndex] || null;
    }
    return null;
  }

  getActiveElement(): RoundBoxElement | null {
    return this.activeElement;
  }

  getElements(): RoundBoxElement[] {
    return this.elements;
  }

  private updateElementFocus(): void {
    this.elements.forEach((element, index) => {
      // An element should be focused if it's the currently focused index and the container is active
      const shouldBeFocused = index === this.focusedIndex && this.active;
      element.setFocused(shouldBeFocused);
    });
  }

  // Override setActive to update element focus when container becomes active/inactive
  setActive(active: boolean): void {
    super.setActive(active);
    
    if (active && this.elements.length > 0) {
      // Ensure we have a valid focused index
      if (this.focusedIndex === -1 || this.focusedIndex >= this.elements.length) {
        this.focusedIndex = 0;
      }
    } else if (!active) {
      // When container becomes inactive, deactivate any active child
      if (this.activeElement) {
        this.activeElement.setActive(false);
        this.activeElement = null;
      }
    }
    
    this.updateElementFocus();
  }
}