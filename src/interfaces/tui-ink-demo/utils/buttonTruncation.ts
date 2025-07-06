/**
 * Smart button truncation utility that prioritizes truncating longer buttons first
 * to maximize readability and prevent border breaking in narrow terminals.
 * 
 * @example
 * ```typescript
 * // Basic usage with two buttons
 * const buttons = truncateButtons({
 *     buttons: ['Keep Current', 'Change Model'],
 *     availableWidth: 20,
 *     separator: '  '
 * });
 * // Returns: [{ label: 'Keep Cur…', truncated: true }, { label: 'Change Mo…', truncated: true }]
 * 
 * // With minimum width constraints
 * const buttons = truncateButtons({
 *     buttons: [
 *         { label: 'Cancel', minWidth: 4 },
 *         { label: 'OK', minWidth: 2 }
 *     ],
 *     availableWidth: 10
 * });
 * ```
 * 
 * @module buttonTruncation
 */

export interface ButtonInfo {
    label: string;
    minWidth?: number; // Minimum width to keep (default: 4)
}

export interface TruncateButtonsOptions {
    buttons: ButtonInfo[] | string[];
    availableWidth: number;
    separator?: string;
    ellipsis?: string;
}

export interface TruncatedButton {
    label: string;
    truncated: boolean;
}

/**
 * Truncates button labels intelligently by prioritizing longer buttons.
 * 
 * @param options - Configuration for button truncation
 * @returns Array of truncated button labels with truncation info
 */
export function truncateButtons(options: TruncateButtonsOptions): TruncatedButton[] {
    const {
        buttons,
        availableWidth,
        separator = '  ',
        ellipsis = '…'
    } = options;
    
    // Work with simple strings
    const labels = buttons.map(b => typeof b === 'string' ? b : b.label);
    const result = [...labels];
    
    // Calculate total width including separators
    const separatorTotalWidth = separator.length * (labels.length - 1);
    const calculateTotalWidth = () => 
        result.reduce((sum, label) => sum + label.length, 0) + separatorTotalWidth;
    
    // If everything fits, return as-is
    if (calculateTotalWidth() <= availableWidth) {
        return result.map(label => ({
            label,
            truncated: false
        }));
    }
    
    // Need to truncate - keep removing one character from the longest string
    while (calculateTotalWidth() > availableWidth) {
        // Find the longest string
        let longestIndex = -1;
        let longestLength = 0;
        for (let i = 0; i < result.length; i++) {
            const current = result[i];
            if (typeof current === 'string' && current.length > longestLength && current.length > 0) {
                longestLength = current.length;
                longestIndex = i;
            }
        }
        // If no string can be truncated further, we're done
        if (longestIndex === -1 || longestLength <= 0) {
            break;
        }
        // Remove one character from the longest string
        const toTruncate = result[longestIndex];
        if (typeof toTruncate === 'string') {
            result[longestIndex] = toTruncate.slice(0, -1);
        }
    }
    
    // Add ellipsis to truncated strings and return
    return result.map((label, index) => {
        const orig = labels[index];
        const wasTruncated = typeof label === 'string' && typeof orig === 'string' && label.length < orig.length;
        // Only add ellipsis if there's something left to show
        const finalLabel = wasTruncated && typeof label === 'string' && label.length > 0 ? label + ellipsis : label;
        return {
            label: finalLabel,
            truncated: wasTruncated
        };
    });
}

/**
 * Helper function to join truncated buttons with proper formatting
 */
export function joinTruncatedButtons(
    buttons: TruncatedButton[],
    separator: string = '  '
): string {
    return buttons.map(b => b.label).join(separator);
}

/**
 * Calculate the width needed for button layout including fixed elements
 */
export function calculateButtonLayoutWidth(
    buttons: string[],
    fixedElements: string[],
    separator: string = '  '
): number {
    const buttonWidth = buttons.reduce((sum, b) => sum + b.length, 0);
    const separatorWidth = separator.length * (buttons.length - 1);
    const fixedWidth = fixedElements.reduce((sum, e) => sum + e.length, 0);
    return buttonWidth + separatorWidth + fixedWidth;
}