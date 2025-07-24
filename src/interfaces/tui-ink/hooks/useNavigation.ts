import React, { useState, useCallback, useEffect } from 'react';
import { Key } from 'ink';
import { useFocusChain } from './useFocusChain';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';

export type ContainerType = 'main' | 'status';

interface NavigationState {
    activeContainer: ContainerType;
    mainSelectedIndex: number;
    statusSelectedIndex: number;
}

interface UseNavigationOptions {
    isBlocked?: boolean;  // Whether navigation should be blocked (e.g., when editing)
    configItemCount?: number;  // Number of configuration items
    statusItemCount?: number;  // Number of status items
}

export const useNavigation = (options: UseNavigationOptions = {}) => {
    const { isBlocked = false, configItemCount = 20, statusItemCount = 20 } = options;
    
    const [state, setState] = useState<NavigationState>({
        activeContainer: 'main',
        mainSelectedIndex: 0,
        statusSelectedIndex: 0
    });
    const di = useDI();

    const switchContainer = useCallback(() => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            activeContainer: prev.activeContainer === 'main' ? 'status' : 'main'
        }));
    }, [isBlocked]);

    const navigateUp = useCallback(() => {
        if (isBlocked) return;
        setState(prev => {
            const key = prev.activeContainer === 'main' ? 'mainSelectedIndex' : 'statusSelectedIndex';
            const currentIndex = prev[key];
            const newIndex = Math.max(0, currentIndex - 1);
            
            // Only update state if index actually changes
            if (currentIndex === newIndex) {
                return prev; // Return the same state object to prevent re-render
            }
            
            return {
                ...prev,
                [key]: newIndex
            };
        });
    }, [isBlocked]);

    const navigateDown = useCallback(() => {
        if (isBlocked) return;
        setState(prev => {
            const key = prev.activeContainer === 'main' ? 'mainSelectedIndex' : 'statusSelectedIndex';
            const maxItems = prev.activeContainer === 'main' ? configItemCount : statusItemCount;
            const currentIndex = prev[key];
            const newIndex = Math.min(maxItems - 1, currentIndex + 1);
            
            // CRITICAL: Only update state if index actually changes!
            if (currentIndex === newIndex) {
                return prev; // Return the same state object to prevent re-render
            }
            
            return {
                ...prev,
                [key]: newIndex
            };
        });
    }, [isBlocked, configItemCount, statusItemCount]);
    
    const setMainSelectedIndex = useCallback((index: number) => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            mainSelectedIndex: Math.max(0, Math.min(configItemCount - 1, index))
        }));
    }, [isBlocked, configItemCount]);

    // Handle navigation input through focus chain
    const handleNavigationInput = useCallback((input: string, key: Key): boolean => {
        if (isBlocked) return false;
        
        if (key.tab || (input === '\t')) {
            switchContainer();
            return true;
        } else if (key.upArrow || input === 'k') {
            navigateUp();
            return true;
        } else if (key.downArrow || input === 'j') {
            navigateDown();
            return true;
        }
        return false;
    }, [isBlocked, switchContainer, navigateUp, navigateDown]);

    // Use focus chain for navigation
    // Navigation should handle input but let children take priority when focused
    useFocusChain({
        elementId: 'navigation',
        parentId: 'app',
        isActive: false,  // Never mark as active to avoid conflicts with children
        onInput: handleNavigationInput,
        keyBindings: !isBlocked ? [
            { key: 'Tab', description: 'Switch Panel' },
            { key: '↑↓', description: 'Navigate' }
        ] : [],
        priority: -1  // Very low priority - panels should handle their own navigation
    });

    // Memoize the return value to prevent unnecessary re-renders
    return React.useMemo(() => ({
        ...state,
        switchContainer,
        navigateUp,
        navigateDown,
        setMainSelectedIndex,
        isMainFocused: state.activeContainer === 'main',
        isStatusFocused: state.activeContainer === 'status'
    }), [state, switchContainer, navigateUp, navigateDown, setMainSelectedIndex]);
};