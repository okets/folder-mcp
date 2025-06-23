import blessed from 'neo-blessed';
import { VisualElement, KeyboardShortcut } from './VisualElement.js';
import { theme } from '../design/theme.js';

/**
 * ListItem - Individual item that can be activated and expanded
 * Implements the content control pattern from frontend.md
 */
export class ListItem extends VisualElement {
    private itemContent: string;
    private fullContent: string;
    private collapsed: boolean = true;
    private selected: boolean = false;
    private scrollPosition: number = 0;

    constructor(options: ListItemOptions) {
        super({
            ...options,
            height: 'shrink',
            style: {
                fg: theme.colors.textSecondary,
                focus: {
                    fg: theme.colors.royalBlue,
                    bg: theme.colors.accentCyan,
                    bold: true
                },
                ...options.style
            }
        });

        this.itemContent = options.content;
        this.fullContent = options.fullContent || options.content;

        this.setupKeyboardHandlers();
        this.updateContent();
    }

    private setupKeyboardHandlers(): void {
        // Content scrolling when active
        this.key(['up', 'k'], () => {
            if (this._isActive) {
                this.scrollUp();
            }
        });

        this.key(['down', 'j'], () => {
            if (this._isActive) {
                this.scrollDown();
            }
        });

        // Return to parent container
        this.key(['left', 'escape', 'h'], () => {
            if (this._isActive) {
                this.deactivateToParent();
            }
        });

        // Enter key for expansion
        this.key(['enter', 'right', 'l'], () => {
            if (this._isActive && this.collapsed) {
                this.expand();
            }
        });
    }

    /**
     * Set whether this item is selected (by parent container)
     */
    setSelected(selected: boolean): void {
        this.selected = selected;
        this.updateContent();
    }

    /**
     * Scroll content up when active
     */
    private scrollUp(): void {
        if (this.scrollPosition > 0) {
            this.scrollPosition--;
            this.updateContent();
        }
    }

    /**
     * Scroll content down when active
     */
    private scrollDown(): void {
        const lines = this.getContentLines();
        const maxScroll = Math.max(0, lines.length - (this.element.height as number || 10));
        if (this.scrollPosition < maxScroll) {
            this.scrollPosition++;
            this.updateContent();
        }
    }

    /**
     * Expand item to show full content
     */
    private expand(): void {
        this.collapsed = false;
        this.updateContent();
    }

    /**
     * Collapse item to show only summary
     */
    private collapse(): void {
        this.collapsed = true;
        this.scrollPosition = 0;
        this.updateContent();
    }

    /**
     * Get content lines for scrolling
     */
    private getContentLines(): string[] {
        if (this.collapsed) {
            return [this.getFormattedContent()];
        } else {
            return this.fullContent.split('\n');
        }
    }

    /**
     * Get formatted content with appropriate bullet
     */
    private getFormattedContent(): string {
        let bullet: string;

        if (this._isActive) {
            bullet = theme.symbols.bullets.heavy; // ● (active)
        } else if (this.selected) {
            bullet = theme.symbols.bullets.arrow; // → (selected by parent)
        } else {
            bullet = theme.symbols.bullets.light; // ◦ (normal)
        }

        return `${bullet} ${this.itemContent}`;
    }

    /**
     * Update the visual content
     */
    private updateContent(): void {
        if (this.collapsed) {
            // Show single line with bullet
            const content = this.getFormattedContent();
            this.setContent(content);
        } else {
            // Show full content with scrolling
            const lines = this.getContentLines();
            const visibleLines = lines.slice(
                this.scrollPosition, 
                this.scrollPosition + (this.element.height as number || 10)
            );
            this.setContent(visibleLines.join('\n'));
        }

        if (this.screen) {
            this.screen.render();
        }
    }

    // VisualElement implementation
    onActivated(): void {
        // When activated, expand to show full content
        this.collapsed = false;
        this.updateContent();
    }

    onDeactivated(): void {
        // When deactivated, collapse back to summary
        this.collapsed = true;
        this.scrollPosition = 0;
        this.updateContent();
    }

    onFocused(): void {
        this.updateContent();
    }

    onBlurred(): void {
        this.updateContent();
    }

    getKeyboardShortcuts(): KeyboardShortcut[] {
        const shortcuts: KeyboardShortcut[] = [];

        if (this._isActive) {
            if (!this.collapsed) {
                shortcuts.push(
                    { key: '↑↓', description: 'Scroll' },
                );
            }
            shortcuts.push(
                { key: '←/Esc', description: 'Back' }
            );
        }

        return shortcuts;
    }

    processKeystroke(key: string): boolean {
        // Let blessed handle keys through key() handlers
        return false;
    }
}

export interface ListItemOptions extends blessed.Widgets.BoxOptions {
    content: string;
    fullContent?: string;
}