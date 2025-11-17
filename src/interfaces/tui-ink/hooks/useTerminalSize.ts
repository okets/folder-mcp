import { useState, useEffect, useRef } from 'react';

/**
 * Hook to get terminal dimensions with debounced resize handling
 *
 * Debouncing prevents excessive re-renders during rapid resize events,
 * waiting for the user to finish resizing before updating the layout.
 *
 * @param debounceMs - Debounce delay in milliseconds (default: 100ms)
 * @returns Terminal dimensions and resize state
 */
export const useTerminalSize = (debounceMs: number = 100) => {
    const getSize = () => ({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24
    });

    const [size, setSize] = useState(getSize());
    const [isResizing, setIsResizing] = useState(false);
    const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleResize = () => {
            // Mark as resizing immediately to show overlay
            setIsResizing(true);

            // Clear any pending resize timer
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
            }

            // Set new timer to update size after debounce delay
            resizeTimerRef.current = setTimeout(() => {
                setSize(getSize());
                setIsResizing(false); // Clear resizing state after update
                resizeTimerRef.current = null;
            }, debounceMs);
        };

        // Update size immediately on mount (no debounce for initial render)
        setSize(getSize());

        process.stdout.on('resize', handleResize);

        return () => {
            process.stdout.off('resize', handleResize);
            // Clear any pending timer on cleanup
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
                resizeTimerRef.current = null;
            }
            setIsResizing(false);
        };
    }, [debounceMs]);

    return {
        ...size,
        isNarrow: size.columns < 100,
        isResizing
    };
};