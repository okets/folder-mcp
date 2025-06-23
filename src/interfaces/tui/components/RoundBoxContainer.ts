import blessed from 'neo-blessed';
import { VisualElement, KeyboardShortcut } from './VisualElement.js';
import { theme, createRoundedBorder, getCurrentPositionStyle, getNormalItemStyle } from '../design/theme.js';

/**
 * RoundBoxContainer - Container with rounded borders and item navigation
 * Implements the container navigation pattern from frontend.md
 */
export class RoundBoxContainer extends VisualElement {
    private items: ContainerItem[] = [];
    private selectedIndex: number = 0;
    private activeChild: VisualElement | null = null;
    private title: string;

    constructor(options: RoundBoxContainerOptions) {
        super({
            ...options,
            label: options.title,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'magenta'
                },
                focus: {
                    border: {
                        fg: 'blue'
                    }
                },
                ...options.style
            }
        });

        this.title = options.title;

        // Set up keyboard navigation
        this.setupKeyboardHandlers();
    }

    private setupKeyboardHandlers(): void {
        // Navigation keys when this container is active
        this.key(['up', 'k'], () => {
            if (this._isActive && !this.activeChild) {
                this.selectPrevious();
            }
        });

        this.key(['down', 'j'], () => {
            if (this._isActive && !this.activeChild) {
                this.selectNext();
            }
        });

        this.key(['right', 'enter', 'l'], () => {
            if (this._isActive && !this.activeChild) {
                this.activateSelected();
            }
        });

        this.key(['left', 'escape', 'h'], () => {
            if (this.activeChild) {
                this.deactivateChild();
            } else {
                this.deactivateToParent();
            }
        });
    }

    /**
     * Add an item to this container
     */
    addItem(item: ContainerItem): void {
        this.items.push(item);
        
        // Add the element to our logical hierarchy (but not as blessed child)
        if (item.element) {
            this.addChild(item.element);
        }
        
        this.updateDisplay();
    }

    /**
     * Move selection to previous item
     */
    private selectPrevious(): void {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateDisplay();
        }
    }

    /**
     * Move selection to next item  
     */
    private selectNext(): void {
        if (this.selectedIndex < this.items.length - 1) {
            this.selectedIndex++;
            this.updateDisplay();
        }
    }

    /**
     * Activate the currently selected item (expand it in place)
     */
    private activateSelected(): void {
        const selected = this.items[this.selectedIndex];
        if (selected) {
            // Mark this item as active and expand its content
            this.activeChild = selected.element || null;
            this.updateDisplay(); // This will show expanded content
        }
    }

    /**
     * Deactivate child and return control to this container
     */
    private deactivateChild(): void {
        this.activeChild = null;
        this.focus(); // Return focus to this container
    }

    /**
     * Update the visual display of items
     */
    private updateDisplay(): void {
        const content = this.items.map((item, index) => {
            const isSelected = index === this.selectedIndex;
            const isActive = this.activeChild && item.element === this.activeChild;
            
            let bullet: string;

            if (isActive) {
                // Active item (has keyboard control)
                bullet = theme.symbols.bullets.heavy; // ●
            } else if (isSelected && this._isActive) {
                // Selected item when container is active
                bullet = theme.symbols.bullets.current; // ⏵
            } else {
                // Normal item
                bullet = theme.symbols.bullets.light; // ◦
            }

            // Show expanded content for active items
            if (isActive && item.fullContent) {
                const lines = item.fullContent.split('\n');
                const formattedLines = lines.map((line, lineIndex) => {
                    if (lineIndex === 0) {
                        return `{blue-bg}{white-fg}${bullet} ${line}{/}`;
                    } else {
                        return `{blue-bg}{white-fg}  ${line}{/}`;
                    }
                });
                return formattedLines.join('\n');
            } else {
                // Normal single-line display
                const line = `${bullet} ${item.content}`;
                
                if (isSelected && this._isActive && !isActive) {
                    // Use vibrant cyan background for current position
                    return `{cyan-bg}{white-fg}${line}{/}`;
                } else {
                    // Normal styling
                    return `{gray-fg}${line}{/}`;
                }
            }
        }).join('\n\n'); // Add spacing between items

        this.setContent(content);
        
        // Render the screen to update display
        if (this.screen) {
            this.screen.render();
        }
    }

    // VisualElement implementation
    onActivated(): void {
        // Update border color to royal blue when active
        if (this.element.style && this.element.style.border) {
            this.element.style.border.fg = 'blue';
        }
        this.updateDisplay();
    }

    onDeactivated(): void {
        // Reset border color when not active
        if (this.element.style && this.element.style.border) {
            this.element.style.border.fg = 'magenta';
        }
        this.updateDisplay();
    }

    onFocused(): void {
        this.updateDisplay();
    }

    onBlurred(): void {
        this.updateDisplay();
    }

    getKeyboardShortcuts(): KeyboardShortcut[] {
        const shortcuts: KeyboardShortcut[] = [
            { key: '↑↓', description: 'Navigate' },
            { key: '→/Enter', description: 'Select' },
            { key: 'Tab', description: 'Switch Focus' }
        ];

        if (this._parent) {
            shortcuts.push({ key: '←/Esc', description: 'Back' });
        }

        return shortcuts;
    }

    processKeystroke(key: string): boolean {
        // Let blessed handle the key events through our key() handlers
        // This method can be used for additional processing if needed
        return false; // Let blessed continue processing
    }

    /**
     * Set the title label with focus indicators
     */
    setLabel(label: string): void {
        this.element.setLabel(label);
    }
}

export interface ContainerItem {
    content: string;
    fullContent?: string;
    element?: VisualElement; // Associated element to activate
}

export interface RoundBoxContainerOptions extends blessed.Widgets.BoxOptions {
    title: string;
}