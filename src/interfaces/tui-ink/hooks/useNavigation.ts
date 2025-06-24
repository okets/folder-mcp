import { useState, useCallback } from 'react';
import { useInput } from 'ink';

export type ContainerType = 'config' | 'status';

interface NavigationState {
    activeContainer: ContainerType;
    configSelectedIndex: number;
    statusSelectedIndex: number;
}

export const useNavigation = () => {
    const [state, setState] = useState<NavigationState>({
        activeContainer: 'config',
        configSelectedIndex: 0,
        statusSelectedIndex: 0
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


    useInput((input, key) => {
        if (key.tab || (input === '\t')) {
            switchContainer();
        } else if (key.upArrow || input === 'k') {
            navigateUp();
        } else if (key.downArrow || input === 'j') {
            navigateDown(20); // Support more items
        }
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