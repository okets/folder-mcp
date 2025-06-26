import { useEffect, useCallback, useRef } from 'react';
import { useInput, Key } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import type { IKeyBinding, InputHandler } from '../services/interfaces.js';

interface UseFocusChainOptions {
    elementId: string;
    parentId?: string;
    isActive?: boolean;
    onInput?: InputHandler;
    keyBindings?: IKeyBinding[];
    priority?: number;
}

/**
 * Hook that integrates a component with the focus chain system
 */
export const useFocusChain = ({
    elementId,
    parentId,
    isActive = false,
    onInput,
    keyBindings,
    priority = 0
}: UseFocusChainOptions) => {
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    
    // Track if we're mounted
    const isMounted = useRef(true);
    
    // Register parent relationship
    useEffect(() => {
        if (parentId) {
            focusChainService.registerParent(elementId, parentId);
        }
        
        return () => {
            // Cleanup on unmount
            isMounted.current = false;
            focusChainService.unregisterElement(elementId);
            inputContextService.unregisterHandler(elementId);
        };
    }, [elementId, parentId, focusChainService, inputContextService]);
    
    // Update active state
    useEffect(() => {
        if (isActive) {
            focusChainService.setActive(elementId);
        } else if (focusChainService.getActive() === elementId) {
            // If we were active but no longer are, clear active state
            focusChainService.setActive(null);
        }
    }, [isActive, elementId, focusChainService]);
    
    // Register input handler
    useEffect(() => {
        if (onInput) {
            inputContextService.registerHandler(elementId, onInput, priority, keyBindings);
        } else {
            inputContextService.unregisterHandler(elementId);
        }
    }, [elementId, onInput, priority, keyBindings, inputContextService]);
    
    // Check if we're in the focus chain
    const isInFocusChain = focusChainService.isInFocusChain(elementId);
    
    // Helper to make parent active (useful for ESC handling)
    const makeParentActive = useCallback(() => {
        if (parentId) {
            focusChainService.setActive(parentId);
        }
    }, [parentId, focusChainService]);
    
    return {
        isInFocusChain,
        isActive: focusChainService.getActive() === elementId,
        makeParentActive
    };
};

/**
 * Hook that sets up the root input handler
 * Should be used once at the app level
 */
export const useRootInput = () => {
    const di = useDI();
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    
    useInput((input: string, key: Key) => {
        // Route all input through the input context service
        inputContextService.handleInput(input, key);
    });
};