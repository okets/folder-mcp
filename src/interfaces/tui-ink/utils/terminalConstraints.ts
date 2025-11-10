/**
 * Terminal dimension constraints to prevent Yoga layout engine issues
 *
 * Background:
 * - Yoga layout engine (used by Ink) doesn't respect automatic minimum sizes
 * - Text wrapping calculations in extremely narrow spaces can cause infinite loops
 * - These constraints prevent terminal freeze when resizing to very small dimensions
 *
 * References:
 * - GitHub Issue #153: Terminal resize events
 * - GitHub Issue #382: Terminal history clearing with tall output
 * - GitHub Issue #1409: Yoga automatic minimum size issues
 */

/**
 * Minimum terminal width to prevent Yoga layout engine freeze
 * Below this width, text wrapping and layout calculations can hang
 */
export const MINIMUM_TERMINAL_WIDTH = 20;

/**
 * Minimum terminal height to prevent layout issues
 * Below this height, vertical layout calculations may fail
 */
export const MINIMUM_TERMINAL_HEIGHT = 10;

/**
 * Enforce safe terminal dimensions by applying minimum constraints
 * @param width Raw terminal width in columns
 * @param height Raw terminal height in rows
 * @returns Safe dimensions that won't cause Yoga layout engine issues
 */
export function enforceSafeTerminalDimensions(width: number, height: number): {
    width: number;
    height: number;
} {
    return {
        width: Math.max(width, MINIMUM_TERMINAL_WIDTH),
        height: Math.max(height, MINIMUM_TERMINAL_HEIGHT)
    };
}
