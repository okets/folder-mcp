import { ValidationState, ValidationMessage } from '../validation/ValidationState';
import { theme } from './theme';
import { buildProps } from './conditionalProps';

/**
 * Get the appropriate color for a validation state
 */
export function getValidationColor(state: ValidationState): string {
    switch (state) {
        case ValidationState.Valid:
            return theme.colors.successGreen;
        case ValidationState.Warning:
            return theme.colors.warningOrange;
        case ValidationState.Error:
            return 'red'; // Using Ink's built-in red
    }
}

/**
 * Get the icon for a validation state
 */
export function getValidationIcon(state: ValidationState): string {
    switch (state) {
        case ValidationState.Valid:
            return '✓';
        case ValidationState.Warning:
            return '!';
        case ValidationState.Error:
            return '✗';
    }
}

/**
 * Truncate validation message to fit available width
 */
export function truncateValidationMessage(message: string, availableWidth: number): string {
    if (availableWidth <= 0) {
        return '';
    }
    
    // If message fits, return as-is
    if (message.length <= availableWidth) {
        return message;
    }
    
    // If we have less than 3 characters available, don't show partial message
    if (availableWidth < 3) {
        return '';
    }
    
    // Reserve space for ellipsis
    const maxLength = availableWidth - 1;
    return message.slice(0, maxLength) + '…';
}

/**
 * Format validation display with icon and message
 * @param validation - The validation message to display
 * @param availableWidth - Available width for the entire validation display
 * @returns Formatted string with icon and truncated message
 */
export function formatValidationDisplay(validation: ValidationMessage, availableWidth: number): string {
    if (!validation || availableWidth <= 0) {
        return '';
    }
    
    const icon = validation.icon || getValidationIcon(validation.state);
    
    // Calculate space for message: total - icon - space
    const messageSpace = availableWidth - icon.length - 1;
    
    if (messageSpace <= 0) {
        // Only room for icon
        return icon;
    }
    
    const truncatedMessage = truncateValidationMessage(validation.message, messageSpace);
    
    if (truncatedMessage) {
        return `${icon} ${truncatedMessage}`;
    }
    
    return icon;
}

/**
 * Calculate visual width of a string, accounting for Unicode characters
 * This is important for proper alignment with emojis and special characters
 */
export function getVisualWidth(str: string): number {
    let width = 0;
    for (const char of str) {
        const codePoint = char.codePointAt(0);
        // Emoji and other wide characters typically have code points >= 0x1F000
        width += (codePoint && codePoint >= 0x1F000) ? 2 : 1;
    }
    return width;
}

/**
 * Format validation for collapsed view with responsive truncation
 * @param label - The item label
 * @param value - The current value
 * @param validation - The validation message
 * @param maxWidth - Maximum width for the entire line
 * @param icon - The item's icon
 * @returns Object with formatted parts and whether validation fits
 */
export function formatCollapsedValidation(
    label: string,
    value: string,
    validation: ValidationMessage | null,
    maxWidth: number,
    icon: string,
    isActive: boolean = false
): {
    displayValue: string;
    validationDisplay: string;
    showValidation: boolean;
    truncatedLabel?: string | undefined;
} {
    
    // Note: isActive parameter kept for API compatibility but focus marker
    // is handled separately as icon, not prepended to text
    
    // Reserve space for validation icon if validation exists (highest priority)
    const validationIconSpace = validation ? 2 : 0; // " ✗" = 2 chars
    const effectiveMaxWidth = maxWidth - validationIconSpace;
    
    // Start with the original label and progressively truncate if needed
    let workingLabel = label;
    let baseWidth = getVisualWidth(`${icon} ${workingLabel} [`);
    const suffixWidth = 1; // for ']'
    const minBracketContent = 1; // Minimum space for "[…]"
    
    // Calculate available width for value (ensuring at least room for "[…]")
    let availableWidth = effectiveMaxWidth - baseWidth - suffixWidth;
    
    // If we don't have room for even "[…]", truncate the label
    while (availableWidth < minBracketContent && workingLabel.length > 1) {
        // Truncate label progressively
        workingLabel = workingLabel.length > 3 
            ? workingLabel.substring(0, workingLabel.length - 4) + '…'
            : workingLabel.substring(0, 1) + '…';
        baseWidth = getVisualWidth(`${icon} ${workingLabel} [`);
        availableWidth = effectiveMaxWidth - baseWidth - suffixWidth;
    }
    
    // If still no room, ensure we show at least "[…]"
    if (availableWidth <= 0) {
        // If we have validation, still try to show the icon even in extreme cases
        if (validation && validationIconSpace <= maxWidth - getVisualWidth(`${icon} … []`)) {
            return {
                displayValue: '',
                validationDisplay: ` ${validation.icon || getValidationIcon(validation.state)}`,
                showValidation: true,
                ...buildProps({ truncatedLabel: '…' })
            };
        }
        return {
            displayValue: '',
            validationDisplay: '',
            showValidation: false,
            ...buildProps({ truncatedLabel: workingLabel })
        };
    }
    
    if (!validation) {
        // Handle value truncation without validation
        if (!value || value.length === 0) {
            return {
                displayValue: '',
                validationDisplay: '',
                showValidation: false,
                ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
            };
        }
        
        if (getVisualWidth(value) > availableWidth) {
            const truncatedValue = availableWidth > 1 
                ? value.substring(0, availableWidth - 1) + '…'
                : '…';
            return {
                displayValue: truncatedValue,
                validationDisplay: '',
                showValidation: false,
                ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
            };
        }
        return {
            displayValue: value,
            validationDisplay: '',
            showValidation: false,
            ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
        };
    }
    
    // WITH validation - validation appears OUTSIDE brackets: [value] ✗
    // So we need to allocate space from availableWidth for validation
    const validationIcon = validation.icon || getValidationIcon(validation.state);
    const fullValidation = ` ${validationIcon} ${validation.message}`;
    const iconOnly = ` ${validationIcon}`;
    const iconWidth = getVisualWidth(iconOnly);
    const fullValidationWidth = getVisualWidth(fullValidation);
    const valueWidth = getVisualWidth(value);
    
    // First, try to fit everything
    if (valueWidth + fullValidationWidth <= availableWidth) {
        return {
            displayValue: value,
            validationDisplay: fullValidation,
            showValidation: true,
            ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
        };
    }
    
    // Try to fit value + icon + truncated message
    if (valueWidth + iconWidth <= availableWidth) {
        const remainingForMessage = availableWidth - valueWidth - iconWidth - 1; // -1 for space
        if (remainingForMessage >= 3) {
            const truncatedMessage = truncateValidationMessage(validation.message, remainingForMessage);
            const validationStr = ` ${validationIcon} ${truncatedMessage}`;
            // Double-check it fits
            if (valueWidth + getVisualWidth(validationStr) <= availableWidth) {
                return {
                    displayValue: value,
                    validationDisplay: validationStr,
                    showValidation: true,
                    ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
                };
            }
        }
        
        // Just icon
        return {
            displayValue: value,
            validationDisplay: iconOnly,
            showValidation: true,
            ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
        };
    }
    
    // Need to truncate value to make room for validation icon
    const spaceForValue = availableWidth - iconWidth;
    if (spaceForValue >= 1) {
        const truncatedValue = spaceForValue >= 3 
            ? truncateValidationMessage(value, spaceForValue)
            : '…';
        return {
            displayValue: truncatedValue,
            validationDisplay: iconOnly,
            showValidation: true,
            ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
        };
    }
    
    // Extremely tight - prioritize validation icon by showing minimal value
    if (iconWidth <= availableWidth) {
        return {
            displayValue: '…',
            validationDisplay: iconOnly,
            showValidation: true,
            ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
        };
    }
    
    // No space for validation at all
    return {
        displayValue: value,
        validationDisplay: '',
        showValidation: false,
        ...buildProps({ truncatedLabel: workingLabel !== label ? workingLabel : undefined })
    };
}

/**
 * Format folder path with status and validation for collapsed view
 * Displays as: path [status] ✗/! message
 * @param path - The folder path
 * @param status - The folder status (pending, scanning, indexing, active, error)
 * @param validation - The validation result with error/warning message
 * @param maxWidth - Maximum width for the entire line
 * @param icon - The item's icon
 * @param isActive - Whether the item is currently active/focused
 * @returns Object with formatted parts for rendering
 */
export function formatFolderWithStatus(
    path: string,
    status: string,
    validation: { hasError: boolean; hasWarning: boolean; errorMessage?: string; warningMessage?: string } | null,
    maxWidth: number,
    icon: string,
    isActive: boolean = false
): {
    truncatedPath: string;
    statusDisplay: string;
    validationDisplay: string;
    showValidation: boolean;
    validationColor?: string;
} {
    // Calculate base components width
    const iconWidth = getVisualWidth(`${icon} `);
    const statusWidth = getVisualWidth(` [${status}]`);
    const baseWidth = iconWidth + statusWidth;
    
    // Determine validation icon and message if present
    let validationIcon = '';
    let validationMessage = '';
    let validationColor: string | undefined;
    
    if (validation) {
        if (validation.hasError && validation.errorMessage) {
            validationIcon = '✗';
            validationMessage = validation.errorMessage;
            validationColor = theme.colors.dangerRed;
        } else if (validation.hasWarning && validation.warningMessage) {
            validationIcon = '!';
            validationMessage = validation.warningMessage;
            validationColor = theme.colors.warningOrange;
        }
    }
    
    // If no validation, just handle path and status truncation
    if (!validationIcon) {
        const availableForPath = maxWidth - baseWidth;
        
        if (getVisualWidth(path) <= availableForPath) {
            return {
                truncatedPath: path,
                statusDisplay: status,
                validationDisplay: '',
                showValidation: false
            };
        }
        
        // Truncate path to fit
        const truncatedPath = availableForPath > 1 
            ? '…' + path.substring(path.length - (availableForPath - 1))
            : '…';
            
        return {
            truncatedPath,
            statusDisplay: status,
            validationDisplay: '',
            showValidation: false
        };
    }
    
    // With validation - prioritize showing validation icon
    const minValidationWidth = 2; // Space + icon: " ✗" or " !"
    const fullValidationWidth = getVisualWidth(` ${validationIcon} ${validationMessage}`);
    const effectiveMaxWidth = maxWidth - baseWidth;
    
    // Try to fit everything
    if (getVisualWidth(path) + fullValidationWidth <= effectiveMaxWidth) {
        return {
            truncatedPath: path,
            statusDisplay: status,
            validationDisplay: ` ${validationIcon} ${validationMessage}`,
            showValidation: true,
            ...(validationColor ? { validationColor } : {})
        };
    }
    
    // Try to fit path + icon + truncated message
    const pathWidth = getVisualWidth(path);
    if (pathWidth + minValidationWidth <= effectiveMaxWidth) {
        const remainingForMessage = effectiveMaxWidth - pathWidth - minValidationWidth - 1; // -1 for space after icon
        
        if (remainingForMessage >= 1) {
            const truncatedMsg = truncateValidationMessage(validationMessage, remainingForMessage);
            if (truncatedMsg) {
                return {
                    truncatedPath: path,
                    statusDisplay: status,
                    validationDisplay: ` ${validationIcon} ${truncatedMsg}`,
                    showValidation: true,
                    ...(validationColor ? { validationColor } : {})
                };
            }
        }
        
        // Just show icon
        return {
            truncatedPath: path,
            statusDisplay: status,
            validationDisplay: ` ${validationIcon}`,
            showValidation: true,
            ...(validationColor ? { validationColor } : {})
        };
    }
    
    // Need to truncate path to make room for validation icon (at minimum)
    const maxPathWidth = effectiveMaxWidth - minValidationWidth;
    
    if (maxPathWidth <= 0) {
        // Extreme case - no room for anything
        return {
            truncatedPath: '…',
            statusDisplay: status.length > 3 ? status.substring(0, 3) : status,
            validationDisplay: ` ${validationIcon}`,
            showValidation: true,
            ...(validationColor ? { validationColor } : {})
        };
    }
    
    // Progressive path truncation to fit validation
    let truncatedPath = path;
    
    // Try showing just the folder name (last part of path)
    const parts = path.split('/').filter(p => p);
    const folderName = parts[parts.length - 1] || path;
    
    if (getVisualWidth(folderName) <= maxPathWidth) {
        truncatedPath = folderName;
        
        // Check if we can fit some message too
        const remainingForMessage = effectiveMaxWidth - getVisualWidth(truncatedPath) - minValidationWidth - 1;
        if (remainingForMessage >= 1) {
            const truncatedMsg = truncateValidationMessage(validationMessage, remainingForMessage);
            if (truncatedMsg) {
                return {
                    truncatedPath,
                    statusDisplay: status,
                    validationDisplay: ` ${validationIcon} ${truncatedMsg}`,
                    showValidation: true,
                    ...(validationColor ? { validationColor } : {})
                };
            }
        }
    } else {
        // Truncate from left with ellipsis
        truncatedPath = maxPathWidth > 1
            ? '…' + path.substring(path.length - (maxPathWidth - 1))
            : '…';
    }
    
    return {
        truncatedPath,
        statusDisplay: status,
        validationDisplay: ` ${validationIcon}`,
        showValidation: true,
        ...(validationColor ? { validationColor } : {})
    };
}