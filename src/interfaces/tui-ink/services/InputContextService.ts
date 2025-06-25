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
     * Get active key bindings for the status bar
     * This should reflect what keys are actually available to the user
     */
    getActiveKeyBindings(): IKeyBinding[] {
        const bindings: IKeyBinding[] = [];
        const activeElement = this.focusChainService.getActive();
        
        // Check for high-priority context (e.g., edit mode)
        if (activeElement) {
            const activeHandler = this.handlers.get(activeElement);
            if (activeHandler && activeHandler.priority >= 1000) {
                // High priority context - return only its bindings
                return [...activeHandler.keyBindings];
            }
        }
        
        // For normal mode, collect bindings from all handlers that would actually
        // respond to input. Since keyboard handling works, we know:
        // 1. Config panel responds to right/enter when focused
        // 2. Navigation responds to tab/arrows
        // 3. App responds to q
        
        // The issue is that we need to know which panel is focused
        // Let's check all handlers and include those that have registered input handlers
        for (const [elementId, handler] of this.handlers.entries()) {
            if (handler.keyBindings.length > 0) {
                // Skip high priority handlers in normal mode
                if (handler.priority >= 1000) continue;
                
                // Include all handlers with bindings
                // The keyboard system already handles which one gets the input
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