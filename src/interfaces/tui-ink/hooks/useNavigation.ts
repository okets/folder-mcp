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
    
    console.error(`\\n=== USENAVIGATION HOOK RENDER ===`);
    console.error(`isBlocked: ${isBlocked}`);
    console.error(`configItemCount: ${configItemCount}`);
    console.error(`statusItemCount: ${statusItemCount}`);
    console.error(`=== END USENAVIGATION HOOK RENDER ===\\n`);
    
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
            
            console.error(`\\n=== NAVIGATION DOWN ===`);
            console.error(`Container: ${prev.activeContainer}`);
            console.error(`Current index: ${currentIndex}`);
            console.error(`Max items: ${maxItems}`);
            console.error(`New index: ${newIndex}`);
            console.error(`Index changed: ${currentIndex !== newIndex}`);
            console.error(`=== END NAVIGATION DOWN ===\\n`);
            
            // CRITICAL: Only update state if index actually changes!
            if (currentIndex === newIndex) {
                console.error(`\\n=== NAVIGATION STATE NOT CHANGED - SKIPPING UPDATE ===\\n`);
                return prev; // Return the same state object to prevent re-render
            }
            
            return {
                ...prev,
                [key]: newIndex
            };
        });
    }, [isBlocked, configItemCount, statusItemCount]);

    // Handle navigation input through focus chain
    const handleNavigationInput = useCallback((input: string, key: Key): boolean => {
        console.error(`\\n=== NAVIGATION INPUT ===`);
        console.error(`Input: "${input}", Key: ${JSON.stringify(key)}`);
        console.error(`isBlocked: ${isBlocked}`);
        console.error(`=== END NAVIGATION INPUT ===\\n`);
        
        if (isBlocked) return false;
        
        if (key.tab || (input === '\t')) {
            console.error(`TAB pressed - switching container`);
            switchContainer();
            return true;
        } else if (key.upArrow || input === 'k') {
            console.error(`UP ARROW pressed - navigating up`);
            navigateUp();
            return true;
        } else if (key.downArrow || input === 'j') {
            console.error(`DOWN ARROW pressed - navigating down`);
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
        isMainFocused: state.activeContainer === 'main',
        isStatusFocused: state.activeContainer === 'status'
    }), [state, switchContainer, navigateUp, navigateDown]);
};