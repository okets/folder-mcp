import blessed from 'neo-blessed';

/**
 * Base class for all visual elements in the TUI
 * Maps our VisualElement architecture to neo-blessed's widget system
 */
export abstract class VisualElement {
    protected element: blessed.Widgets.BoxElement;
    protected _isActive: boolean = false;
    protected _isFocused: boolean = false;
    public _parent: VisualElement | null = null;
    protected _children: VisualElement[] = [];

    constructor(options: blessed.Widgets.BoxOptions = {}) {
        this.element = blessed.box({
            ...options,
            keys: true,
            mouse: false,
            tags: true,
            style: {
                ...options.style,
                // Default focus style - royal blue border
                focus: {
                    border: { fg: '#4169E1' },
                    ...options.style?.focus
                }
            }
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Hook into blessed's focus system to map to our Active concept
        this.element.on('focus', () => {
            this._isActive = true;
            this.onActivated();
            this.propagateFocusUp();
        });

        this.element.on('blur', () => {
            this._isActive = false;
            this.onDeactivated();
        });

        // Map blessed's focus events to our focused concept
        this.element.on('focus', () => {
            this._isFocused = true;
            this.onFocused();
        });

        this.element.on('blur', () => {
            this._isFocused = false;
            this.onBlurred();
        });
    }

    // Abstract methods - must be implemented by subclasses
    abstract onActivated(): void;
    abstract onDeactivated(): void;
    abstract onFocused(): void;
    abstract onBlurred(): void;
    abstract getKeyboardShortcuts(): KeyboardShortcut[];

    // Active element getter
    get active(): boolean {
        return this._isActive;
    }

    // Focused element getter
    get focused(): boolean {
        return this._isFocused;
    }

    // Get the underlying blessed element
    get blessedElement(): blessed.Widgets.BoxElement {
        return this.element;
    }

    /**
     * Propagate focus up the parent chain
     * This implements the "Focus propagates up the entire parent chain" principle
     */
    protected propagateFocusUp(): void {
        let current = this._parent;
        while (current) {
            current._isFocused = true;
            current.onFocused();
            current = current._parent;
        }
    }

    /**
     * Set this element as active (focus the blessed element)
     */
    focus(): void {
        this.element.focus();
    }

    /**
     * Add a key handler
     */
    key(keys: string | string[], listener: (ch?: any, key?: any) => void): void {
        this.element.key(keys, listener);
    }

    /**
     * Set content of the element
     */
    setContent(content: string): void {
        this.element.setContent(content);
    }

    /**
     * Get screen reference
     */
    get screen(): blessed.Widgets.Screen | undefined {
        return this.element.screen;
    }

    /**
     * Add a child element
     */
    addChild(child: VisualElement): void {
        this._children.push(child);
        child._parent = this;
    }

    /**
     * Remove a child element
     */
    removeChild(child: VisualElement): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
            child._parent = null;
        }
    }

    /**
     * Process keystroke - default implementation passes to parent
     * Override in subclasses to handle specific keys
     */
    processKeystroke(key: string): boolean {
        // Pass to parent by default
        return this._parent?.processKeystroke(key) ?? false;
    }

    /**
     * Deactivate this element and activate parent
     */
    protected deactivateToParent(): void {
        if (this._parent) {
            this._parent.focus();
        }
    }
}

export interface KeyboardShortcut {
    key: string;
    description: string;
}