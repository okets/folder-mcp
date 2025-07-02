import { IDebugService } from './interfaces';

export class DebugService implements IDebugService {
    private enabled: boolean;

    constructor() {
        this.enabled = process.env.TUI_DEBUG === 'true' || process.env.DEBUG_LAYOUT === 'true';
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    log(component: string, message: string): void {
        if (!this.enabled) return;
        console.error(`[${component}] ${message}`);
    }

    logLayout(component: string, constraints: { width: number; height: number }): void {
        if (!this.enabled) return;
        console.error(`[${component}] Layout: ${constraints.width}x${constraints.height}`);
    }

    renderLayoutBoundaries(width: number, height: number): string {
        if (!this.enabled) return '';
        
        // Create a visual representation of layout boundaries
        const horizontalLine = '─'.repeat(width - 2);
        const topBorder = `┌${horizontalLine}┐`;
        const bottomBorder = `└${horizontalLine}┘`;
        const middleLines = Array(height - 2).fill(`│${' '.repeat(width - 2)}│`);
        
        return [topBorder, ...middleLines, bottomBorder].join('\n');
    }
}