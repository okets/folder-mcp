import React from 'react';
import { Box, Text } from 'ink';
import { AnimationContainer } from './AnimationContainer';
import { BRAILLE_SPINNER, createProgressBarFrames, createWaveFrames } from '../../utils/animations';
import { theme } from '../../utils/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ProgressBarProps {
    /**
     * Progress value from 0-100 for determinate progress
     * undefined for indeterminate progress
     * -1 for error state
     */
    value?: number;
    
    /**
     * Display mode for the progress bar
     * - 'short': Spinner + percentage (4 chars)
     * - 'long': Progress bar + spinner + percentage
     * - 'auto': Automatically choose based on width
     */
    mode?: 'short' | 'long' | 'auto';
    
    /**
     * Total width available for the progress bar
     * Used for auto mode and bar width calculation
     */
    width?: number;
    
    /**
     * Whether to show percentage text
     */
    showPercentage?: boolean;
    
    /**
     * Color for the progress bar and spinner
     */
    color?: string;
}

/**
 * ProgressBar component that displays progress in different modes
 * Uses AnimationContainer for smooth animations
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    mode = 'auto',
    width = 20,
    showPercentage = true,
    color
}) => {
    const { theme: currentTheme } = useTheme();
    const isError = value === -1;
    const isIndeterminate = value === undefined;
    const percentage = (isIndeterminate || isError) ? 0 : Math.min(100, Math.max(0, Math.round(value)));
    
    // For Step 7.2, implement short mode
    const renderShortMode = () => {
        if (isError) {
            // Error state: show red X with ERR
            return <Text color={theme.colors.dangerRed}>✗ERR</Text>;
        }
        if (isIndeterminate) {
            // Just spinner with 3 spaces for indeterminate
            return (
                <Box>
                    <AnimationContainer 
                        frames={BRAILLE_SPINNER}
                        interval={80}
                        color={theme.colors.warningOrange}
                    />
                    <Text>   </Text>
                </Box>
            );
        }
        
        // Format percentage text
        let percentText: string;
        if (percentage === 100) {
            // At 100%, show green checkmark with spaces
            return <Text color={theme.colors.successGreen}>✓   </Text>;
        } else if (percentage < 10) {
            // 0-9: " 0%" with space before number
            percentText = ` ${percentage}%`;
        } else {
            // 10-99: "50%"
            percentText = `${percentage}%`;
        }
        
        // Show spinner + percentage for all values < 100%
        return (
            <Box>
                <AnimationContainer 
                    frames={BRAILLE_SPINNER}
                    interval={80}
                    color={theme.colors.warningOrange}
                />
                <Text color={theme.colors.warningOrange}>{percentText}</Text>
            </Box>
        );
    };
    
    // For Step 7.3, implement long mode
    const renderLongMode = () => {
        // Fixed bar width of 10 cells
        const barWidth = 10;
        
        if (isError) {
            // Error state in long mode
            return (
                <Box>
                    <Text color={theme.colors.dangerRed}>✗</Text>
                    <Text color={theme.colors.dangerRed}>{(currentTheme.name === 'minimal' ? '□' : '▱').repeat(barWidth)}</Text>
                    <Text color={theme.colors.dangerRed}> ERR</Text>
                </Box>
            );
        }
        
        if (isIndeterminate) {
            // Indeterminate state - could add wave animation later
            return (
                <Box>
                    <AnimationContainer 
                        frames={BRAILLE_SPINNER}
                        interval={80}
                        color={theme.colors.warningOrange}
                    />
                    <Text color={theme.colors.warningOrange}>{(currentTheme.name === 'minimal' ? '□' : '▱').repeat(barWidth)}</Text>
                    <Text color={theme.colors.warningOrange}> ...</Text>
                </Box>
            );
        }
        
        // Determinate progress - use different characters for minimal theme
        const filledCount = Math.round((percentage / 100) * barWidth);
        const emptyCount = barWidth - filledCount;
        const isMinimalTheme = currentTheme.name === 'minimal';
        const filledChar = isMinimalTheme ? '■' : '▰'; // Use small square for minimal, original block for others
        const emptyChar = isMinimalTheme ? '□' : '▱'; // Use empty square for minimal, original empty for others
        const progressBar = filledChar.repeat(filledCount) + emptyChar.repeat(emptyCount);
        
        if (percentage === 100) {
            // Complete state
            return (
                <Box>
                    <Text color={theme.colors.successGreen}>✓</Text>
                    <Text color={theme.colors.successGreen}>{progressBar}</Text>
                    <Text color={theme.colors.successGreen}>100%</Text>
                </Box>
            );
        }
        
        // In progress
        const percentText = percentage < 10 ? `  ${percentage}%` : ` ${percentage}%`;
        return (
            <Box>
                <AnimationContainer 
                    frames={BRAILLE_SPINNER}
                    interval={80}
                    color={theme.colors.warningOrange}
                />
                <Text color={theme.colors.warningOrange}>{progressBar}</Text>
                <Text color={theme.colors.warningOrange}>{percentText}</Text>
            </Box>
        );
    };
    
    // Render based on mode
    if (mode === 'short') {
        return renderShortMode();
    } else if (mode === 'long') {
        return renderLongMode();
    } else {
        // Auto mode - choose based on width
        if (width < 6) {
            // Too narrow for any progress bar, just show percentage or status
            if (isError) {
                return <Text color={theme.colors.dangerRed}>ERR </Text>;
            } else if (isIndeterminate) {
                return <Text color={theme.colors.warningOrange}>... </Text>;
            } else if (percentage === 100) {
                return <Text color={theme.colors.successGreen}>100%</Text>;
            } else {
                const percentText = percentage < 10 ? `  ${percentage}%` : ` ${percentage}%`;
                return <Text color={theme.colors.warningOrange}>{percentText}</Text>;
            }
        } else if (width < 20) {
            // Use short mode for narrow spaces
            return renderShortMode();
        } else {
            // Use long mode for wide spaces
            return renderLongMode();
        }
    }
};