import blessed from 'neo-blessed';
import { VisualElement, KeyboardShortcut } from './VisualElement.js';
import { modernTheme } from '../design/modernTheme.js';

/**
 * ModernContainer - Beautiful container with enhanced visual design
 */
export class ModernContainer extends VisualElement {
    private items: ModernContainerItem[] = [];
    private selectedIndex: number = 0;
    private activeChild: VisualElement | null = null;
    private title: string;
    private subtitle: string | undefined;

    constructor(options: ModernContainerOptions) {
        // Create container with modern styling
        super({
            ...options,
            label: options.title,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: modernTheme.colors.border
                },
                focus: {
                    border: {
                        fg: modernTheme.colors.borderFocus
                    }
                },
                bg: modernTheme.colors.background,
                fg: modernTheme.colors.textPrimary,
                ...options.style
            },
            scrollable: true,
            alwaysScroll: true,
            keys: true,
            mouse: false
        });

        this.title = options.title;
        this.subtitle = options.subtitle;
        this.setupKeyboardHandlers();
    }

    private setupKeyboardHandlers(): void {
        // Smooth navigation with modern feedback
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

    addItem(item: ModernContainerItem): void {
        this.items.push(item);
        
        if (item.element) {
            this.addChild(item.element);
        }
        
        this.updateDisplay();
    }

    private selectPrevious(): void {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateDisplay();
        }
    }

    private selectNext(): void {
        if (this.selectedIndex < this.items.length - 1) {
            this.selectedIndex++;
            this.updateDisplay();
        }
    }

    private activateSelected(): void {
        const selected = this.items[this.selectedIndex];
        if (selected) {
            this.activeChild = selected.element || null;
            this.updateDisplay();
        }
    }

    private deactivateChild(): void {
        this.activeChild = null;
        this.focus();
    }

    private updateDisplay(): void {
        const content: string[] = [];

        // Add subtitle if present
        if (this.subtitle) {
            content.push(`{${modernTheme.colors.textMuted}-fg}${this.subtitle}{/}`);
            content.push(''); // Empty line for spacing
        }

        // Render items with beautiful styling
        const itemContent = this.items.map((item, index) => {
            const isSelected = index === this.selectedIndex;
            const isActive = !!(this.activeChild && item.element === this.activeChild);
            
            return this.renderItem(item, isSelected, isActive);
        });

        content.push(...itemContent);

        this.setContent(content.join('\n'));
        
        if (this.screen) {
            this.screen.render();
        }
    }

    private renderItem(item: ModernContainerItem, isSelected: boolean, isActive: boolean): string {
        // Choose modern symbol based on state
        let symbol: string;
        let statusColor = '';

        if (isActive) {
            symbol = modernTheme.symbols.expanded;
            statusColor = modernTheme.colors.purple;
        } else if (isSelected && this._isActive) {
            symbol = modernTheme.symbols.selected;
            statusColor = modernTheme.colors.selection;
        } else {
            symbol = modernTheme.symbols.unselected;
            statusColor = '';
        }

        // Add status indicator if present
        const statusIndicator = item.status ? this.getStatusIndicator(item.status) : '';
        
        if (isActive && item.fullContent) {
            // Expanded view with beautiful formatting
            const lines = item.fullContent.split('\n');
            const formattedLines = lines.map((line, lineIndex) => {
                if (lineIndex === 0) {
                    const mainLine = `${symbol} ${line} ${statusIndicator}`;
                    return `{${statusColor}-bg}{${modernTheme.colors.textPrimary}-fg} ${mainLine} {/}`;
                } else {
                    const indent = '  ';
                    return `{${modernTheme.colors.surface}-bg}{${modernTheme.colors.textSecondary}-fg} ${indent}${line} {/}`;
                }
            });
            return formattedLines.join('\n');
        } else {
            // Compact view
            const line = `${symbol} ${item.content} ${statusIndicator}`;
            
            if (isSelected && this._isActive) {
                return `{${statusColor}-bg}{${modernTheme.colors.textPrimary}-fg} ${line} {/}`;
            } else {
                return `{${modernTheme.colors.textSecondary}-fg}${line}{/}`;
            }
        }
    }

    private getStatusIndicator(status: 'success' | 'error' | 'warning' | 'loading'): string {
        const indicators = {
            success: `{${modernTheme.colors.successGreen}-fg}${modernTheme.symbols.success}{/}`,
            error: `{${modernTheme.colors.errorRed}-fg}${modernTheme.symbols.error}{/}`,
            warning: `{${modernTheme.colors.warningOrange}-fg}${modernTheme.symbols.warning}{/}`,
            loading: `{${modernTheme.colors.accent}-fg}${modernTheme.symbols.loading}{/}`
        };
        
        return indicators[status];
    }

    // VisualElement implementation
    onActivated(): void {
        if (this.element.style && this.element.style.border) {
            this.element.style.border.fg = modernTheme.colors.borderFocus;
        }
        this.updateDisplay();
    }

    onDeactivated(): void {
        if (this.element.style && this.element.style.border) {
            this.element.style.border.fg = modernTheme.colors.border;
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
        return [
            { key: '↑↓', description: 'Navigate' },
            { key: '→/Enter', description: 'Expand' },
            { key: 'Tab', description: 'Switch Focus' },
            { key: '←/Esc', description: 'Back' }
        ];
    }

    processKeystroke(key: string): boolean {
        return false;
    }

    setLabel(label: string): void {
        this.element.setLabel(label);
    }
}

export interface ModernContainerItem {
    content: string;
    fullContent?: string;
    element?: VisualElement;
    status?: 'success' | 'error' | 'warning' | 'loading';
}

export interface ModernContainerOptions extends blessed.Widgets.BoxOptions {
    title: string;
    subtitle?: string;
}