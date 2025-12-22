import React, { useState, useCallback, useEffect } from 'react';
import { Key } from 'ink';
import { useFocusChain } from './useFocusChain';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';
import { IListItem } from '../components/core/IListItem';
import { findFirstNavigableIndex } from '../utils/navigationUtils';

export type ContainerType = 'navigation' | 'main' | 'status';
export type PanelId = 'folders' | 'demo';  // Panel IDs for navigation framework

interface NavigationState {
    activeContainer: ContainerType;
    navigationSelectedIndex: number;
    mainSelectedIndex: number;
    statusSelectedIndex: number;
    activePanelId: PanelId;  // Active panel for navigation framework
    // Activity Log state - lifted here to survive resize overlay
    activitySelectedIndex: number;
    activityExpandedState: Record<string, boolean>;
}

interface UseNavigationOptions {
    isBlocked?: boolean;  // Whether navigation should be blocked (e.g., when editing)
    navigationItemCount?: number;  // Number of navigation items
    configItemCount?: number;  // Number of configuration items
    statusItemCount?: number;  // Number of status items
    mainPanelItems?: IListItem[];  // Items for main panel (to find first navigable)
    statusPanelItems?: IListItem[];  // Items for status panel (to find first navigable)
}

export const useNavigation = (options: UseNavigationOptions = {}) => {
    const {
        isBlocked = false,
        navigationItemCount = 2,
        configItemCount = 20,
        statusItemCount = 20,
        mainPanelItems,
        statusPanelItems
    } = options;
    
    const [state, setState] = useState<NavigationState>({
        activeContainer: 'navigation',  // Start with navigation focused
        navigationSelectedIndex: 0,
        mainSelectedIndex: 0,
        statusSelectedIndex: 0,
        activePanelId: 'folders',  // Default to folders panel
        // Activity Log state - survives resize overlay
        activitySelectedIndex: 0,
        activityExpandedState: {}
    });
    const di = useDI();

    const switchContainer = useCallback(() => {
        if (isBlocked) return;

        setState(prev => {
            const nextContainer = prev.activeContainer === 'navigation' ? 'main' : 'navigation';

            // When switching TO main panel, find first navigable item (Step 8.2-D)
            if (nextContainer === 'main') {
                const targetItems = prev.navigationSelectedIndex === 0
                    ? mainPanelItems
                    : statusPanelItems;

                if (targetItems) {
                    const firstNavigable = findFirstNavigableIndex(targetItems);

                    // Update the appropriate panel's selected index
                    if (prev.navigationSelectedIndex === 0) {
                        return {
                            ...prev,
                            activeContainer: nextContainer,
                            mainSelectedIndex: firstNavigable
                        };
                    } else {
                        return {
                            ...prev,
                            activeContainer: nextContainer,
                            statusSelectedIndex: firstNavigable
                        };
                    }
                }
            }

            // Default behavior: just switch container
            return {
                ...prev,
                activeContainer: nextContainer
            };
        });
    }, [isBlocked, mainPanelItems, statusPanelItems]);

    const switchToContent = useCallback(() => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            activeContainer: 'main'
        }));
    }, [isBlocked]);

    const switchToNavigation = useCallback(() => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            activeContainer: 'navigation'
        }));
    }, [isBlocked]);

    const navigateUp = useCallback(() => {
        if (isBlocked) return;
        setState(prev => {
            const key =
                prev.activeContainer === 'navigation' ? 'navigationSelectedIndex' :
                prev.activeContainer === 'main' ? 'mainSelectedIndex' :
                'statusSelectedIndex';
            const maxItems =
                prev.activeContainer === 'navigation' ? navigationItemCount :
                prev.activeContainer === 'main' ? configItemCount :
                statusItemCount;
            const currentIndex = prev[key];
            // Implement circular navigation - wrap from first to last
            const newIndex = currentIndex <= 0 ? maxItems - 1 : currentIndex - 1;

            // Only update state if index actually changes
            if (currentIndex === newIndex) {
                return prev; // Return the same state object to prevent re-render
            }

            return {
                ...prev,
                [key]: newIndex
            };
        });
    }, [isBlocked, navigationItemCount, configItemCount, statusItemCount]);

    const navigateDown = useCallback(() => {
        if (isBlocked) return;
        setState(prev => {
            const key =
                prev.activeContainer === 'navigation' ? 'navigationSelectedIndex' :
                prev.activeContainer === 'main' ? 'mainSelectedIndex' :
                'statusSelectedIndex';
            const maxItems =
                prev.activeContainer === 'navigation' ? navigationItemCount :
                prev.activeContainer === 'main' ? configItemCount :
                statusItemCount;
            const currentIndex = prev[key];
            // Implement circular navigation - wrap from last to first
            const newIndex = currentIndex >= maxItems - 1 ? 0 : currentIndex + 1;

            // CRITICAL: Only update state if index actually changes!
            if (currentIndex === newIndex) {
                return prev; // Return the same state object to prevent re-render
            }

            return {
                ...prev,
                [key]: newIndex
            };
        });
    }, [isBlocked, navigationItemCount, configItemCount, statusItemCount]);
    
    const setMainSelectedIndex = useCallback((index: number) => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            mainSelectedIndex: Math.max(0, Math.min(configItemCount - 1, index))
        }));
    }, [isBlocked, configItemCount]);

    const setStatusSelectedIndex = useCallback((index: number) => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            statusSelectedIndex: Math.max(0, Math.min(statusItemCount - 1, index))
        }));
    }, [isBlocked, statusItemCount]);

    // Activity Log state setters - lifted here to survive resize overlay
    const setActivitySelectedIndex = useCallback((index: number) => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            activitySelectedIndex: index
        }));
    }, [isBlocked]);

    const setActivityExpandedState = useCallback((updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
        if (isBlocked) return;
        setState(prev => ({
            ...prev,
            activityExpandedState: updater(prev.activityExpandedState)
        }));
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
        switchToContent,
        switchToNavigation,
        navigateUp,
        navigateDown,
        setMainSelectedIndex,
        setStatusSelectedIndex,
        setActivitySelectedIndex,
        setActivityExpandedState,
        isNavigationFocused: state.activeContainer === 'navigation',
        isMainFocused: state.activeContainer === 'main',
        isStatusFocused: state.activeContainer === 'status'
    }), [state, switchContainer, switchToContent, switchToNavigation, navigateUp, navigateDown, setMainSelectedIndex, setStatusSelectedIndex, setActivitySelectedIndex, setActivityExpandedState]);
};