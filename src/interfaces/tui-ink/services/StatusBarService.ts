import { IStatusBarService, IKeyBinding } from './interfaces';

export class StatusBarService implements IStatusBarService {
    private currentContext: 'form' | 'editing' | 'selecting' | 'filtering' = 'form';
    private keyBindings: IKeyBinding[] = [];
    private defaultBindings: Record<string, IKeyBinding[]> = {
        form: [
            { key: '↑↓', description: 'Navigate' },
            { key: '→/enter', description: 'Edit' },
            { key: 'tab', description: 'Switch Panel' },
            { key: 'esc', description: 'Quit' }
        ],
        editing: [
            { key: '←→', description: 'Move cursor' },
            { key: 'backspace', description: 'Delete' },
            { key: 'esc', description: 'Cancel' },
            { key: 'enter', description: 'Save' }
        ],
        selecting: [
            { key: '↑↓', description: 'Navigate' },
            { key: 'space/enter', description: 'Select' },
            { key: 'esc', description: 'Cancel' }
        ],
        filtering: [
            { key: 'type', description: 'Filter' },
            { key: '↑↓', description: 'Navigate' },
            { key: 'enter', description: 'Select' },
            { key: 'esc', description: 'Cancel' }
        ]
    };

    constructor() {
        this.keyBindings = this.defaultBindings['form'] ?? [];
    }

    setContext(context: 'form' | 'editing' | 'selecting' | 'filtering'): void {
        this.currentContext = context;
        this.keyBindings = this.defaultBindings[context] ?? this.defaultBindings['form'] ?? [];
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