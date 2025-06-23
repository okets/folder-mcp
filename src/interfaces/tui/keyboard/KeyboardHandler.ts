import { VisualElement } from '../components/VisualElement.js';

export class KeyboardHandler {
  private activeElement: VisualElement | null = null;

  setActiveElement(element: VisualElement | null): void {
    this.activeElement = element;
  }

  processKeystroke(key: string): boolean {
    if (this.activeElement) {
      return this.activeElement.processKeystroke(key);
    }
    return false;
  }

  getCurrentShortcuts(): Array<{key: string, description: string}> {
    if (this.activeElement) {
      return this.activeElement.getShortcuts();
    }
    return [{ key: 'q', description: 'Quit' }];
  }

  getActiveElement(): VisualElement | null {
    return this.activeElement;
  }
}