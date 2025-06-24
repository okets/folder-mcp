import type { Key } from 'ink';
import type { IInputContextService, IKeyBinding, IFocusChainService } from './interfaces.js';

export type InputHandler = (input: string, key: Key) => boolean;

interface RegisteredHandler {
    elementId: string;
    handler: InputHandler;
    priority: number;
    keyBindings: IKeyBinding[];
}

/**
 * Service that manages keyboard input routing based on focus chain.
 * Elements in the focus chain can register handlers with priorities.
 * Input is routed through handlers from highest to lowest priority.
 */
export class InputContextService implements IInputContextService {
    private handlers = new Map<string, RegisteredHandler>();
    
    constructor(
        private focusChainService: IFocusChainService
    ) {}
    
    /**
     * Register an input handler for an element
     * Higher priority handlers get input first
     */
    registerHandler(
        elementId: string, 
        handler: InputHandler, 
        priority: number,
        keyBindings?: IKeyBinding[]
    ): void {
        this.handlers.set(elementId, {
            elementId,
            handler,
            priority,
            keyBindings: keyBindings || []
        });
    }
    
    /**
     * Unregister an input handler
     */
    unregisterHandler(elementId: string): void {
        this.handlers.delete(elementId);
    }
    
    /**
     * Route input through registered handlers based on focus chain
     * Returns true if any handler consumed the input
     */
    handleInput(input: string, key: Key): boolean {
        const focusChain = this.focusChainService.getFocusChain();
        
        // Get handlers for elements in focus chain
        const activeHandlers = focusChain
            .map(elementId => this.handlers.get(elementId))
            .filter((handler): handler is RegisteredHandler => handler !== undefined)
            .sort((a, b) => b.priority - a.priority);
        
        // Try each handler in priority order
        for (const handler of activeHandlers) {
            if (handler.handler(input, key)) {
                return true; // Input was handled
            }
        }
        
        return false; // No handler consumed the input
    }
    
    /**
     * Get active key bindings from all focused elements
     * Used to update the status bar
     */
    getActiveKeyBindings(): IKeyBinding[] {
        const focusChain = this.focusChainService.getFocusChain();
        const bindings: IKeyBinding[] = [];
        
        // Collect bindings from all focused elements
        for (const elementId of focusChain) {
            const handler = this.handlers.get(elementId);
            if (handler) {
                bindings.push(...handler.keyBindings);
            }
        }
        
        // Remove duplicates (keep first occurrence)
        const seen = new Set<string>();
        return bindings.filter(binding => {
            if (seen.has(binding.key)) {
                return false;
            }
            seen.add(binding.key);
            return true;
        });
    }
}