import { ValidationState, ValidationMessage } from '../validation/ValidationState.js';
import { theme } from './theme.js';

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
    truncatedLabel?: string;
} {
    // Account for potential focus marker "▶ " (2 chars) when active
    const focusMarkerWidth = isActive ? 2 : 0;
    
    // Start with the original label and progressively truncate if needed
    let workingLabel = label;
    let baseWidth = getVisualWidth(`${icon} ${workingLabel}: [`);
    const suffixWidth = 1; // for ']'
    const minBracketContent = 1; // Minimum space for "[…]"
    
    // Calculate available width for value (ensuring at least room for "[…]")
    let availableWidth = maxWidth - baseWidth - suffixWidth - focusMarkerWidth;
    
    // If we don't have room for even "[…]", truncate the label
    while (availableWidth < minBracketContent && workingLabel.length > 1) {
        // Truncate label progressively
        workingLabel = workingLabel.length > 3 
            ? workingLabel.substring(0, workingLabel.length - 4) + '…'
            : workingLabel.substring(0, 1) + '…';
        baseWidth = getVisualWidth(`${icon} ${workingLabel}: [`);
        availableWidth = maxWidth - baseWidth - suffixWidth - focusMarkerWidth;
    }
    
    // If still no room, ensure we show at least "[…]"
    if (availableWidth <= 0) {
        return {
            displayValue: '…',
            validationDisplay: '',
            showValidation: false,
            truncatedLabel: workingLabel
        };
    }
    
    if (!validation) {
        // Handle value truncation
        if (!value || value.length === 0) {
            // Empty value - always show ellipsis to indicate there should be content
            return {
                displayValue: '…',
                validationDisplay: '',
                showValidation: false,
                truncatedLabel: workingLabel !== label ? workingLabel : undefined
            };
        }
        
        if (getVisualWidth(value) > availableWidth) {
            // If no room for any meaningful content, show ellipsis
            if (availableWidth < 1) {
                return {
                    displayValue: '…',
                    validationDisplay: '',
                    showValidation: false,
                    truncatedLabel: workingLabel
                };
            }
            
            const truncatedValue = availableWidth > 1 
                ? value.substring(0, availableWidth - 1) + '…'
                : '…';
            return {
                displayValue: truncatedValue,
                validationDisplay: '',
                showValidation: false,
                truncatedLabel: workingLabel !== label ? workingLabel : undefined
            };
        }
        return {
            displayValue: value,
            validationDisplay: '',
            showValidation: false,
            truncatedLabel: workingLabel !== label ? workingLabel : undefined
        };
    }
    
    // Try to fit both value and validation
    const validationIcon = validation.icon || getValidationIcon(validation.state);
    const fullValidation = ` ${validationIcon} ${validation.message}`;
    const validationWidth = getVisualWidth(fullValidation);
    const valueWidth = getVisualWidth(value);
    
    // First, check if everything fits
    if (valueWidth + validationWidth <= availableWidth) {
        return {
            displayValue: value,
            validationDisplay: fullValidation,
            showValidation: true
        };
    }
    
    // Not everything fits - we need to truncate something
    // Always try to show at least the icon
    const iconOnly = ` ${validationIcon}`;
    const iconWidth = getVisualWidth(iconOnly);
    
    // If we have room for value + icon + some message
    const remainingForMessage = availableWidth - valueWidth - iconWidth - 1; // -1 for space
    if (remainingForMessage >= 3) { // At least 3 chars for message
        const truncatedMessage = truncateValidationMessage(validation.message, remainingForMessage);
        // Safety check: ensure we don't exceed available width
        const validationStr = ` ${validationIcon} ${truncatedMessage}`;
        if (valueWidth + getVisualWidth(validationStr) <= availableWidth) {
            return {
                displayValue: value,
                validationDisplay: validationStr,
                showValidation: true
            };
        }
    }
    
    // If we only have room for value + icon
    if (valueWidth + iconWidth <= availableWidth) {
        return {
            displayValue: value,
            validationDisplay: iconOnly,
            showValidation: true
        };
    }
    
    // Need to truncate value to make room for at least the icon
    const maxValueWidth = availableWidth - iconWidth;
    if (maxValueWidth >= 3) {
        const truncatedValue = truncateValidationMessage(value, maxValueWidth);
        return {
            displayValue: truncatedValue,
            validationDisplay: iconOnly,
            showValidation: true
        };
    }
    
    // Not enough space for anything meaningful
    return {
        displayValue: value,
        validationDisplay: '',
        showValidation: false
    };
}