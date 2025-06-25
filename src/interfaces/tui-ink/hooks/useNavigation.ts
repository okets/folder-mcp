import { useState, useCallback, useEffect } from 'react';
import { Key } from 'ink';
import { useFocusChain } from './useFocusChain.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';

export type ContainerType = 'config' | 'status';

interface NavigationState {
    activeContainer: ContainerType;
    configSelectedIndex: number;
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
        activeContainer: 'config',
        configSelectedIndex: 0,
        statusSelectedIndex: 0
    });
    const di = useDI();

    const switchContainer = useCallback(() => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            activeContainer: prev.activeContainer === 'config' ? 'status' : 'config'
        }));
    }, [isBlocked]);

    const navigateUp = useCallback(() => {
        if (isBlocked) return;
        setState(prev => {
            const key = prev.activeContainer === 'config' ? 'configSelectedIndex' : 'statusSelectedIndex';
            return {
                ...prev,
                [key]: Math.max(0, prev[key] - 1)
            };
        });
    }, [isBlocked]);

    const navigateDown = useCallback(() => {
        if (isBlocked) return;
        setState(prev => {
            const key = prev.activeContainer === 'config' ? 'configSelectedIndex' : 'statusSelectedIndex';
            const maxItems = prev.activeContainer === 'config' ? configItemCount : statusItemCount;
            const currentIndex = prev[key];
            const newIndex = Math.min(maxItems - 1, currentIndex + 1);
            return {
                ...prev,
                [key]: newIndex
            };
        });
    }, [isBlocked, configItemCount, statusItemCount]);

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
        priority: 10  // Lower priority than active elements
    });

    return {
        ...state,
        switchContainer,
        navigateUp,
        navigateDown,
        isConfigFocused: state.activeContainer === 'config',
        isStatusFocused: state.activeContainer === 'status'
    };
};