import blessed from 'neo-blessed';
import { modernTheme } from '../design/modernTheme.js';

/**
 * ModernHeader - Beautiful header with gradient-like effect and modern styling
 */
export class ModernHeader {
    private element: blessed.Widgets.BoxElement;

    constructor(options: blessed.Widgets.BoxOptions = {}) {
        this.element = blessed.box({
            ...options,
            top: 0,
            left: 0,
            width: '100%',
            height: 3,
            tags: true,
            padding: 0,
            style: {
                fg: modernTheme.colors.textPrimary,
                ...options.style
            }
        });

        this.render();
    }

    private render(): void {
        // Create a beautiful header with compact logo format
        const content = [
            `{${modernTheme.colors.accent}-fg}╭────────────────╮{/}`,
            `{${modernTheme.colors.accent}-fg}│ 📁 folder-mcp  │{/}`,
            `{${modernTheme.colors.accent}-fg}╰────────────────╯{/}`
        ].join('\n');

        this.element.setContent(content);
    }

    get blessedElement(): blessed.Widgets.BoxElement {
        return this.element;
    }

    /**
     * Update header with dynamic content
     */
    updateStatus(status: string): void {
        // Just use the clean logo without extra status box
        this.render();
    }
}