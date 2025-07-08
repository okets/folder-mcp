import React from 'react';
import { Box, Text } from 'ink';
import { BorderedBox } from './core/BorderedBox';
import { theme } from '../utils/theme';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useLayoutConstraints } from '../contexts/LayoutContext';
import { useFocusChain } from '../hooks/useFocusChain';

export const MainPanel: React.FC<{ 
    width?: number; 
    height?: number;
    onEditModeChange?: (isInEditMode: boolean) => void;
    isMinimized?: boolean;
    isFrameOnly?: boolean;
}> = ({ width, height, onEditModeChange, isMinimized = false, isFrameOnly = false }) => {
    // Use shared navigation context
    const navigation = useNavigationContext();
    const constraints = useLayoutConstraints();
    
    // Calculate dimensions
    const panelWidth = width || constraints?.maxWidth || 50;
    const actualHeight = height || 20;
    
    // Use focus chain with no actions for now
    const { isInFocusChain } = useFocusChain({
        elementId: 'main-panel',
        parentId: 'navigation',
        isActive: navigation.isMainFocused,
        keyBindings: [],
        priority: 50
    });
    
    // Handle minimized display
    if (isMinimized || isFrameOnly) {
        const borderWidth = 2;
        const paddingWidth = 2;
        const availableWidth = panelWidth - borderWidth - paddingWidth;
        const fullMessage = "Compact Mode - \x1b[1;37mtab\x1b[0m to toggle panels";
        
        let displayText = "";
        
        if (!isFrameOnly) {
            if (fullMessage.length <= availableWidth) {
                displayText = fullMessage;
            } else if (availableWidth > 3) {
                displayText = fullMessage.slice(0, availableWidth - 3) + "...";
            }
        }
        
        return (
            <BorderedBox
                title="Main"
                focused={false}
                width={panelWidth}
                height={actualHeight}
                showScrollbar={false}
                scrollbarElements={[]}
            >
                {displayText && <Text color={theme.colors.textSecondary}>{displayText}</Text>}
            </BorderedBox>
        );
    }
    
    return (
        <BorderedBox
            title="Main"
            focused={navigation.isMainFocused}
            width={panelWidth}
            height={actualHeight}
            showScrollbar={false}
            scrollbarElements={[]}
        >
            <Text color={theme.colors.textSecondary}>Ready for new content</Text>
        </BorderedBox>
    );
};