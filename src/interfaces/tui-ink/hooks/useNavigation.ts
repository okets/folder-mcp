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
}

export const useNavigation = (options: UseNavigationOptions = {}) => {
    const { isBlocked = false } = options;
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

    const navigateDown = useCallback((maxItems: number) => {
        if (isBlocked) return;
        setState(prev => {
            const key = prev.activeContainer === 'config' ? 'configSelectedIndex' : 'statusSelectedIndex';
            const currentIndex = prev[key];
            const newIndex = Math.min(maxItems - 1, currentIndex + 1);
            return {
                ...prev,
                [key]: newIndex
            };
        });
    }, [isBlocked]);

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
            navigateDown(20); // TODO: This should be dynamic based on actual item count
            return true;
        }
        return false;
    }, [isBlocked, switchContainer, navigateUp, navigateDown]);

    // Use focus chain for navigation
    // Navigation is active by default when not blocked
    useFocusChain({
        elementId: 'navigation',
        parentId: 'app',
        isActive: !isBlocked,  // Active when not blocked (default state)
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