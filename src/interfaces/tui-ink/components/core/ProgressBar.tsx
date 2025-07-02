import React from 'react';
import { Box, Text } from 'ink';
import { AnimationContainer } from './AnimationContainer.js';
import { BRAILLE_SPINNER, createProgressBarFrames, createWaveFrames } from '../../utils/animations.js';

interface ProgressBarProps {
    /**
     * Progress value from 0-100 for determinate progress
     * undefined for indeterminate progress
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
    // For now, just render a simple text to verify the component works
    const isIndeterminate = value === undefined;
    const percentage = isIndeterminate ? 0 : Math.min(100, Math.max(0, Math.round(value)));
    
    return (
        <Box>
            <Text color={color}>
                {isIndeterminate ? 'Loading...' : `${percentage}%`}
            </Text>
        </Box>
    );
};