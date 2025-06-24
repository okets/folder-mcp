import { 
    ThemeColors, 
    ThemeSymbols, 
    BorderStyle,
    NavigationState,
    FocusedPanel,
    StatusItem,
    TerminalSize
} from '../models/types.js';

export interface IThemeService {
    getColors(): ThemeColors;
    getSymbols(): ThemeSymbols;
    getBorderStyle(): BorderStyle;
}

export interface INavigationService {
    getState(): NavigationState;
    switchFocus(): void;
    moveSelection(panel: FocusedPanel, direction: 'up' | 'down'): void;
    getSelectedIndex(panel: FocusedPanel): number;
}

export interface IDataService {
    getConfigItems(): string[];
    getStatusItems(): StatusItem[];
}

export interface ITerminalService {
    getSize(): TerminalSize;
    isNarrow(): boolean;
}

export interface IContentService {
    measureText(text: string): number;
    truncateText(text: string, maxWidth: number, ellipsis?: string): string;
    wrapText(text: string, maxWidth: number): string[];
}

export interface IDebugService {
    isEnabled(): boolean;
    log(component: string, message: string): void;
    logLayout(component: string, constraints: { width: number; height: number }): void;
    renderLayoutBoundaries(width: number, height: number): string;
}

// Configuration-related services
import type { ConfigurationNode, IValidationRule } from '../models/configuration.js';
import type { IValidationResult } from '../models/validation.js';

export interface IConfigurationService {
    // Initialize with nodes
    initialize(nodes: ConfigurationNode[]): void;
    
    // Node management
    getNodes(): ConfigurationNode[];
    getNode(id: string): ConfigurationNode | undefined;
    updateNodeValue(id: string, value: any): void;
    
    // Validation
    validateNode(id: string): IValidationResult;
    validateAll(): IValidationResult[];
    
    // Serialization
    getConfiguration(): Record<string, any>;
    loadConfiguration(config: Record<string, any>): void;
}

export interface IFormNavigationService {
    // Initialize with node IDs
    setNodeIds(nodeIds: string[]): void;
    
    // Node navigation
    getCurrentNodeId(): string | null;
    expandNode(nodeId: string): void;
    collapseNode(): void;
    isNodeExpanded(nodeId: string): boolean;
    
    // Within-node navigation
    getSelectedOptionIndex(): number;
    selectOption(index: number): void;
    
    // Form-level navigation
    moveToNextNode(): void;
    moveToPreviousNode(): void;
    
    // Helper methods
    getCurrentNodeIndex(): number;
    setCurrentNodeIndex(index: number): void;
    isAnyNodeExpanded(): boolean;
    reset(): void;
}

export interface IInputService {
    // Text input management
    getCursorPosition(): number;
    setCursorPosition(position: number): void;
    insertText(text: string): void;
    deleteText(count: number, direction: 'left' | 'right'): void;
    
    // Filter input
    getFilterText(): string;
    setFilterText(text: string): void;
    clearFilter(): void;
    
    // Helper methods
    getCurrentText(): string;
    setCurrentText(text: string): void;
    moveCursorLeft(): void;
    moveCursorRight(): void;
    moveCursorToStart(): void;
    moveCursorToEnd(): void;
}

export interface IValidationService {
    registerRule<T>(rule: IValidationRule<T>): void;
    validate<T>(value: T, rules: IValidationRule<T>[]): IValidationResult;
}

export interface IStatusBarService {
    // Update status bar based on current context
    setContext(context: 'form' | 'editing' | 'selecting' | 'filtering'): void;
    
    // Set custom key bindings for current state
    setKeyBindings(bindings: IKeyBinding[]): void;
    
    // Get current key bindings to display
    getKeyBindings(): IKeyBinding[];
}

export interface IKeyBinding {
    key: string;
    description: string;
}