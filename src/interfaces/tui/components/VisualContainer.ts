import { VisualElement } from './VisualElement.js';

export class VisualContainer extends VisualElement {
  private containerChildren: VisualElement[] = [];
  private focusedIndex: number = 0;
  private activeChild: VisualElement | null = null;

  setChildren(children: VisualElement[]): void {
    this.containerChildren = children;
    this.focusedIndex = children.length > 0 ? 0 : -1;
    this.updateChildFocus();
  }

  processKeystroke(key: string): boolean {
    // If a child is active, let it handle first
    if (this.activeChild && this.activeChild.processKeystroke(key)) {
      return true;
    }

    // Container-level navigation
    switch (key) {
      case 'up':
        return this.navigateUp();
      case 'down':
        return this.navigateDown();
      case 'enter':
      case 'right':
        return this.activateCurrentChild();
      case 'escape':
      case 'left':
        return this.deactivateCurrentChild();
      default:
        return false;
    }
  }

  getRenderContent(): string[] {
    return this.containerChildren.flatMap(child => child.getRenderContent());
  }

  getShortcuts() {
    if (this.activeChild) {
      return this.activeChild.getShortcuts();
    }
    return [
      { key: '↑↓/PgUp/PgDn', description: 'Next/Prev' },
      { key: '→/Enter', description: 'Open' }
    ];
  }

  private navigateUp(): boolean {
    if (this.containerChildren.length === 0) return false;
    
    if (this.focusedIndex > 0) {
      this.focusedIndex--;
      this.updateChildFocus();
      return true;
    }
    return false;
  }

  private navigateDown(): boolean {
    if (this.containerChildren.length === 0) return false;
    
    if (this.focusedIndex < this.containerChildren.length - 1) {
      this.focusedIndex++;
      this.updateChildFocus();
      return true;
    }
    return false;
  }

  private activateCurrentChild(): boolean {
    if (this.focusedIndex >= 0 && this.focusedIndex < this.containerChildren.length) {
      const child = this.containerChildren[this.focusedIndex];
      if (child) {
        this.activeChild = child;
        child.setActive(true);
        return true;
      }
    }
    return false;
  }

  private deactivateCurrentChild(): boolean {
    if (this.activeChild) {
      this.activeChild.setActive(false);
      this.activeChild = null;
      return true;
    }
    return false;
  }

  private updateChildFocus(): void {
    this.containerChildren.forEach((child, index) => {
      child.setFocused(index === this.focusedIndex && this.active && !this.activeChild);
    });
  }

  // Override setActive to update child focus
  setActive(active: boolean): void {
    super.setActive(active);
    this.updateChildFocus();
  }
}