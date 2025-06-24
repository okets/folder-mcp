import { IStatusBarService, IKeyBinding } from './interfaces.js';

export class StatusBarService implements IStatusBarService {
    private currentContext: 'form' | 'editing' | 'selecting' | 'filtering' = 'form';
    private keyBindings: IKeyBinding[] = [];
    private defaultBindings: Record<string, IKeyBinding[]> = {
        form: [
            { key: '↑↓', description: 'Navigate' },
            { key: '→/Enter', description: 'Edit' },
            { key: 'Tab', description: 'Switch Panel' },
            { key: 'q', description: 'Quit' }
        ],
        editing: [
            { key: '←→', description: 'Move cursor' },
            { key: 'Backspace', description: 'Delete' },
            { key: 'Esc', description: 'Cancel' },
            { key: 'Enter', description: 'Save' }
        ],
        selecting: [
            { key: '↑↓', description: 'Navigate' },
            { key: 'Space/Enter', description: 'Select' },
            { key: 'Esc', description: 'Cancel' }
        ],
        filtering: [
            { key: 'Type', description: 'Filter' },
            { key: '↑↓', description: 'Navigate' },
            { key: 'Enter', description: 'Select' },
            { key: 'Esc', description: 'Cancel' }
        ]
    };

    constructor() {
        this.keyBindings = this.defaultBindings.form;
    }

    setContext(context: 'form' | 'editing' | 'selecting' | 'filtering'): void {
        this.currentContext = context;
        this.keyBindings = this.defaultBindings[context];
    }

    setKeyBindings(bindings: IKeyBinding[]): void {
        this.keyBindings = bindings;
    }

    getKeyBindings(): IKeyBinding[] {
        return this.keyBindings;
    }

    getCurrentContext(): string {
        return this.currentContext;
    }
}