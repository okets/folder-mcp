import type { Key } from 'ink';
import type { IInputContextService, IKeyBinding, IFocusChainService, IStatusBarService } from './interfaces';
import { getTuiContainer } from '../di/setup';
import { ServiceTokens } from '../di/tokens';

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
    
    /**
     * NEW: Get key bindings respecting focus chain and StatusBar context
     * This is the proper implementation that fixes the architectural issue
     */
    getFocusAwareKeyBindings(): IKeyBinding[] {
        // Check StatusBarService context first
        try {
            const container = getTuiContainer();
            const statusBarService = container.resolve(ServiceTokens.StatusBarService) as IStatusBarService;
            const statusContext = statusBarService.getCurrentContext();
            
            // If in editing mode, return only editing bindings
            if (statusContext === 'editing') {
                return statusBarService.getKeyBindings();
            }
        } catch (error) {
            // StatusBarService not available or not in editing mode, continue with normal logic
        }
        
        const focusChain = this.focusChainService.getFocusChain();
        
        // Check for modal state in focus chain
        const modalHandler = this.findModalHandlerInChain(focusChain);
        if (modalHandler) {
            return modalHandler.keyBindings || [];
        }
        
        // Collect from focus chain + global handlers
        const bindings = this.collectBindingsFromChain(focusChain);
        
        // If we have no bindings and no active element, show all non-modal handlers
        if (bindings.length === 0 && focusChain.length === 0) {
            const allBindings: IKeyBinding[] = [];
            const seen = new Set<string>();
            
            for (const handler of this.handlers.values()) {
                if (handler.priority < 1000 && handler.keyBindings) {
                    for (const binding of handler.keyBindings) {
                        if (!seen.has(binding.key)) {
                            seen.add(binding.key);
                            allBindings.push(binding);
                        }
                    }
                }
            }
            return allBindings;
        }
        
        return bindings;
    }
    
    /**
     * Find modal handler (priority >= 1000) in focus chain
     */
    private findModalHandlerInChain(focusChain: string[]): RegisteredHandler | null {
        for (const elementId of focusChain) {
            const handler = this.handlers.get(elementId);
            if (handler && handler.priority >= 1000) {
                return handler;
            }
        }
        return null;
    }
    
    /**
     * Collect bindings from focus chain and global handlers
     */
    private collectBindingsFromChain(focusChain: string[]): IKeyBinding[] {
        const bindingsMap = new Map<string, IKeyBinding>();
        
        // Add bindings from focus chain (in order)
        for (const elementId of focusChain) {
            const handler = this.handlers.get(elementId);
            if (handler?.keyBindings) {
                for (const binding of handler.keyBindings) {
                    if (!bindingsMap.has(binding.key)) {
                        bindingsMap.set(binding.key, binding);
                    }
                }
            }
        }
        
        // Add global handlers (priority < 0)
        for (const handler of this.handlers.values()) {
            if (handler.priority < 0 && handler.keyBindings) {
                for (const binding of handler.keyBindings) {
                    if (!bindingsMap.has(binding.key)) {
                        bindingsMap.set(binding.key, binding);
                    }
                }
            }
        }
        
        return Array.from(bindingsMap.values());
    }
    
    /**
     * Check if currently in modal state
     */
    isModalState(): boolean {
        const focusChain = this.focusChainService.getFocusChain();
        return this.findModalHandlerInChain(focusChain) !== null;
    }
    
    /**
     * Manually trigger change listeners (for external context changes)
     */
    triggerChange(): void {
        this.notifyChange();
    }
}