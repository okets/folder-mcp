import { IInputService } from './interfaces.js';

export class InputService implements IInputService {
    private cursorPosition = 0;
    private filterText = '';
    private currentText = '';

    // Text input management
    getCursorPosition(): number {
        return this.cursorPosition;
    }

    setCursorPosition(position: number): void {
        this.cursorPosition = Math.max(0, Math.min(position, this.currentText.length));
    }

    insertText(text: string): void {
        const before = this.currentText.slice(0, this.cursorPosition);
        const after = this.currentText.slice(this.cursorPosition);
        this.currentText = before + text + after;
        this.cursorPosition += text.length;
    }

    deleteText(count: number, direction: 'left' | 'right'): void {
        if (direction === 'left') {
            const deleteStart = Math.max(0, this.cursorPosition - count);
            const before = this.currentText.slice(0, deleteStart);
            const after = this.currentText.slice(this.cursorPosition);
            this.currentText = before + after;
            this.cursorPosition = deleteStart;
        } else {
            const before = this.currentText.slice(0, this.cursorPosition);
            const after = this.currentText.slice(this.cursorPosition + count);
            this.currentText = before + after;
        }
    }

    // Filter input
    getFilterText(): string {
        return this.filterText;
    }

    setFilterText(text: string): void {
        this.filterText = text;
    }

    clearFilter(): void {
        this.filterText = '';
    }

    // Helper methods
    getCurrentText(): string {
        return this.currentText;
    }

    setCurrentText(text: string): void {
        this.currentText = text;
        this.cursorPosition = Math.min(this.cursorPosition, text.length);
    }

    moveCursorLeft(): void {
        this.setCursorPosition(this.cursorPosition - 1);
    }

    moveCursorRight(): void {
        this.setCursorPosition(this.cursorPosition + 1);
    }

    moveCursorToStart(): void {
        this.setCursorPosition(0);
    }

    moveCursorToEnd(): void {
        this.setCursorPosition(this.currentText.length);
    }
}