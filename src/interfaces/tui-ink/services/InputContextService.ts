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
    private changeListeners: Array<() => void> = [];
    
    constructor(
        private focusChainService: IFocusChainService
    ) {}
    
    /**
     * Add a listener for key binding changes
     * Returns a cleanup function to remove the listener
     */
    addChangeListener(listener: () => void): () => void {
        this.changeListeners.push(listener);
        return () => {
            const index = this.changeListeners.indexOf(listener);
            if (index >= 0) {
                this.changeListeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Notify all listeners that key bindings have changed
     */
    private notifyChange(): void {
        this.changeListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                // Silently ignore listener errors
            }
        });
    }
    
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
        this.notifyChange();
    }
    
    /**
     * Unregister an input handler
     */
    unregisterHandler(elementId: string): void {
        this.handlers.delete(elementId);
        this.notifyChange();
    }
    
    /**
     * Route input through registered handlers based on focus chain
     * Returns true if any handler consumed the input
     */
    handleInput(input: string, key: Key): boolean {
        const focusChain = this.focusChainService.getFocusChain();
        
        // Get all registered handlers and sort by priority
        // This allows handlers to work even if not in the strict focus chain
        const allHandlers = Array.from(this.handlers.values())
            .sort((a, b) => b.priority - a.priority);
        
        // Try each handler in priority order
        for (const handler of allHandlers) {
            try {
                if (handler.handler(input, key)) {
                    return true; // Input was handled
                }
            } catch (error) {
                // Silently ignore handler errors
            }
        }
        
        return false; // No handler consumed the input
    }
    
    /**
     * Get active key bindings from all focused elements
     * Used to update the status bar
     * 
     * CONTEXT ISOLATION: Only returns bindings from the highest priority active handler
     * to prevent context leakage (e.g., edit mode showing navigation keys)
     */
    getActiveKeyBindings(): IKeyBinding[] {
        const focusChain = this.focusChainService.getFocusChain();
        
        // Find the highest priority handler in the focus chain
        let highestPriorityHandler: RegisteredHandler | null = null;
        let highestPriority = -Infinity;
        
        for (const elementId of focusChain) {
            const handler = this.handlers.get(elementId);
            if (handler && handler.priority > highestPriority) {
                highestPriority = handler.priority;
                highestPriorityHandler = handler;
            }
        }
        
        // Return bindings only from the highest priority context
        // This ensures context isolation (edit mode doesn't show navigation keys)
        if (highestPriorityHandler && highestPriorityHandler.keyBindings.length > 0) {
            return [...highestPriorityHandler.keyBindings];
        }
        
        // Fallback: collect from all if no single handler has bindings
        // This preserves backward compatibility for cases where handlers don't have bindings
        const bindings: IKeyBinding[] = [];
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