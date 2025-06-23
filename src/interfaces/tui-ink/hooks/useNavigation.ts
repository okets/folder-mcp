import { useState, useCallback } from 'react';
import { useInput } from 'ink';

export type ContainerType = 'config' | 'status';

interface NavigationState {
    activeContainer: ContainerType;
    configSelectedIndex: number;
    statusSelectedIndex: number;
    expandedItems: Set<string>;
}

export const useNavigation = () => {
    const [state, setState] = useState<NavigationState>({
        activeContainer: 'config',
        configSelectedIndex: 0,
        statusSelectedIndex: 0,
        expandedItems: new Set()
    });

    const switchContainer = useCallback(() => {
        setState(prev => ({
            ...prev,
            activeContainer: prev.activeContainer === 'config' ? 'status' : 'config'
        }));
    }, []);

    const navigateUp = useCallback(() => {
        setState(prev => {
            const key = prev.activeContainer === 'config' ? 'configSelectedIndex' : 'statusSelectedIndex';
            return {
                ...prev,
                [key]: Math.max(0, prev[key] - 1)
            };
        });
    }, []);

    const navigateDown = useCallback((maxItems: number) => {
        setState(prev => {
            const key = prev.activeContainer === 'config' ? 'configSelectedIndex' : 'statusSelectedIndex';
            const currentIndex = prev[key];
            return {
                ...prev,
                [key]: Math.min(maxItems - 1, currentIndex + 1)
            };
        });
    }, []);

    const toggleExpanded = useCallback((itemId: string) => {
        setState(prev => {
            const newExpanded = new Set(prev.expandedItems);
            if (newExpanded.has(itemId)) {
                newExpanded.delete(itemId);
            } else {
                newExpanded.add(itemId);
            }
            return { ...prev, expandedItems: newExpanded };
        });
    }, []);

    useInput((input, key) => {
        if (key.tab || (input === '\t')) {
            switchContainer();
        } else if (key.upArrow || input === 'k') {
            navigateUp();
        } else if (key.downArrow || input === 'j') {
            navigateDown(20); // Support more items
        } else if (key.return || key.rightArrow || input === 'l') {
            // Toggle expansion - needs item ID from context
        } else if (key.escape || key.leftArrow || input === 'h') {
            // Collapse or go back
        }
    });

    return {
        ...state,
        switchContainer,
        navigateUp,
        navigateDown,
        toggleExpanded,
        isConfigFocused: state.activeContainer === 'config',
        isStatusFocused: state.activeContainer === 'status'
    };
};