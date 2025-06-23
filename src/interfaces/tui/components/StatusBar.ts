import blessed from 'neo-blessed';
import { VisualElement, KeyboardShortcut } from './VisualElement.js';
import { modernTheme } from '../design/modernTheme.js';

/**
 * StatusBar - Shows keyboard shortcuts from active element and parent chain
 * Implements status bar pattern from target UI design
 */
export class StatusBar {
    private element: blessed.Widgets.BoxElement;
    private shortcuts: KeyboardShortcut[] = [];
    private messageTimeout: NodeJS.Timeout | null = null;
    private originalContent: string = '';

    constructor(options: blessed.Widgets.BoxOptions = {}) {
        this.element = blessed.box({
            ...options,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            style: {
                fg: modernTheme.colors.textPrimary,
                bg: modernTheme.colors.surface,
                ...options.style
            },
            tags: true
        });
    }

    /**
     * Get the blessed element for appending to screen
     */
    get blessedElement(): blessed.Widgets.BoxElement {
        return this.element;
    }

    /**
     * Update shortcuts based on currently active element
     */
    updateShortcuts(activeElement: VisualElement | null): void {
        this.shortcuts = [];

        if (activeElement) {
            // Collect shortcuts from active element and all focused parents
            let current: VisualElement | null = activeElement;
            while (current) {
                const elementShortcuts = current.getKeyboardShortcuts();
                // Add shortcuts, avoiding duplicates
                elementShortcuts.forEach(shortcut => {
                    if (!this.shortcuts.some(s => s.key === shortcut.key)) {
                        this.shortcuts.push(shortcut);
                    }
                });
                current = current._parent;
            }
        }

        // Add global shortcuts
        this.shortcuts.push({ key: 'q', description: 'Quit' });
        this.shortcuts.push({ key: 'h/?', description: 'Help' });

        this.render();
    }

    /**
     * Render the status bar content
     */
    private render(): void {
        const shortcutText = this.shortcuts
            .map(s => `[${s.key}] ${s.description}`)
            .join(' • ');

        this.element.setContent(` ${shortcutText}`);

        if (this.element.screen) {
            this.element.screen.render();
        }
    }

    /**
     * Set shortcuts directly (useful for custom states)
     */
    setShortcuts(shortcuts: KeyboardShortcut[]): void {
        this.shortcuts = shortcuts;
        this.render();
    }

    /**
     * Add a shortcut to the current list
     */
    addShortcut(shortcut: KeyboardShortcut): void {
        // Avoid duplicates
        if (!this.shortcuts.some(s => s.key === shortcut.key)) {
            this.shortcuts.push(shortcut);
            this.render();
        }
    }

    /**
     * Remove a shortcut from the current list
     */
    removeShortcut(key: string): void {
        this.shortcuts = this.shortcuts.filter(s => s.key !== key);
        this.render();
    }

    /**
     * Clear all shortcuts
     */
    clearShortcuts(): void {
        this.shortcuts = [];
        this.render();
    }

    /**
     * Show a temporary message, then restore shortcuts
     */
    showMessage(message: string, duration: number = 3000): void {
        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        // Store current content
        this.originalContent = this.element.content || '';

        // Show message
        this.element.setContent(` ${message}`);
        if (this.element.screen) {
            this.element.screen.render();
        }

        // Restore shortcuts after duration
        this.messageTimeout = setTimeout(() => {
            this.render();
            this.messageTimeout = null;
        }, duration);
    }
}