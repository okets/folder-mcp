import { VisualElement } from '../VisualElement.js';
import { KeyBinding, KeyboardManager } from '../../keyboard/KeyboardManager.js';

export interface RoundBoxElementData {
  content: string;
  fullContent?: string;
}

export class RoundBoxElement extends VisualElement {
  private data: RoundBoxElementData;
  private scrollPosition: number = 0;

  constructor(id: string, data: RoundBoxElementData) {
    super(id);
    this.data = data;
  }

  processKeystroke(key: string): boolean {
    if (!this.active) {
      return false;
    }

    switch (key) {
      case 'up':
        return this.scrollUp();
      case 'down':
        return this.scrollDown();
      case 'escape':
      case 'left':
        // Deactivate this element and make parent active
        if (this._parent) {
          const keyboardManager = KeyboardManager.getInstance();
          keyboardManager.setActiveElement(this._parent);
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  getRenderContent(): string[] {
    if (!this.active || !this.data.fullContent) {
      const bullet = this.active ? '●' : this.focused ? '◦' : '•';
      const line = `${bullet} ${this.data.content}`;
      
      // Apply royal blue color to focused items (remove hardcoded first item bug)
      if (this.focused && !this.active) {
        return [`\x1b[38;2;65;105;225m${line}\x1b[0m`]; // Royal blue RGB(65,105,225)
      }
      
      return [line];
    }
    return this.getVisibleContent();
  }

  getRenderState() {
    return {
      id: this.id,
      content: this.data.content,
      fullContent: this.data.fullContent,
      active: this.active,
      scrollPosition: this.scrollPosition,
      // Visual indicator based on state
      bulletChar: this.active ? '●' : '•'
    };
  }

  getShortcuts(): KeyBinding[] {
    if (!this.active) {
      return [];
    }

    const shortcuts: KeyBinding[] = [
      { key: '↑↓', description: 'Scroll' },
      { key: '←/Esc', description: 'Back' }
    ];

    return shortcuts;
  }

  private scrollUp(): boolean {
    if (!this.data.fullContent) {
      return false;
    }

    if (this.scrollPosition > 0) {
      this.scrollPosition--;
      return true;
    }
    return false;
  }

  private scrollDown(): boolean {
    if (!this.data.fullContent) {
      return false;
    }

    const lines = this.data.fullContent.split('\n');
    const maxScroll = Math.max(0, lines.length - 3); // Assuming 3 visible lines

    if (this.scrollPosition < maxScroll) {
      this.scrollPosition++;
      return true;
    }
    return false;
  }

  getVisibleContent(): string[] {
    if (!this.active || !this.data.fullContent) {
      return [this.data.content];
    }

    const lines = this.data.fullContent.split('\n');
    return lines.slice(this.scrollPosition, this.scrollPosition + 3);
  }
}