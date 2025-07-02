import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { useAnimationContext } from '../../contexts/AnimationContext.js';

interface AnimationContainerProps {
    /**
     * Array of animation frames (strings) to cycle through
     */
    frames: string[];
    
    /**
     * Interval in milliseconds between frames (default: 100ms)
     */
    interval?: number;
    
    /**
     * Whether to play the animation (default: true)
     */
    play?: boolean;
    
    /**
     * Manual frame control - if provided, auto-play is disabled
     */
    currentFrame?: number;
    
    /**
     * Callback fired when frame changes (useful for syncing)
     */
    onFrame?: (index: number) => void;
    
    /**
     * Optional color for the animated text
     */
    color?: string;
    
    /**
     * Optional width override (default: longest frame length)
     */
    width?: number;
}

/**
 * AnimationContainer - A reusable component for frame-based animations in TUI
 * 
 * Features:
 * - Auto-plays through frames at specified interval
 * - Calculates width based on longest frame to prevent layout shifts
 * - Supports manual frame control for synchronized animations
 * - Pads shorter frames with spaces for consistent width
 */
export const AnimationContainer: React.FC<AnimationContainerProps> = ({
    frames,
    interval = 100,
    play = true,
    currentFrame,
    onFrame,
    color,
    width
}) => {
    // Get global animation pause state
    const { animationsPaused } = useAnimationContext();
    
    // State for current frame index
    const [frameIndex, setFrameIndex] = useState(0);
    
    // Calculate the longest frame length for width stabilization
    const longestFrameLength = React.useMemo(() => {
        return Math.max(...frames.map(frame => frame.length));
    }, [frames]);
    
    // Determine the actual width to use
    const containerWidth = width ?? longestFrameLength;
    
    // Auto-play effect
    useEffect(() => {
        // Skip auto-play if manual frame control is active, animations are paused globally, or play is false
        if (currentFrame !== undefined || !play || frames.length <= 1 || animationsPaused) {
            return;
        }
        
        const timer = setInterval(() => {
            setFrameIndex((prev) => {
                const nextIndex = (prev + 1) % frames.length;
                onFrame?.(nextIndex);
                return nextIndex;
            });
        }, interval);
        
        return () => clearInterval(timer);
    }, [frames.length, interval, play, currentFrame, onFrame, animationsPaused]);
    
    // Handle manual frame control
    useEffect(() => {
        if (currentFrame !== undefined && currentFrame >= 0 && currentFrame < frames.length) {
            setFrameIndex(currentFrame);
            onFrame?.(currentFrame);
        }
    }, [currentFrame, frames.length, onFrame]);
    
    // Get current frame and pad if necessary
    const currentFrameText = frames[frameIndex] || frames[0] || '';
    const paddedFrame = currentFrameText.padEnd(containerWidth, ' ');
    
    return <Text color={color}>{paddedFrame}</Text>;
};