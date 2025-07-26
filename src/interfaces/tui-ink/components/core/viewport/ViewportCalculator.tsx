/**
 * ViewportCalculator - Unified viewport management for ContainerListItem
 * 
 * This class provides a single source of truth for viewport dimensions and boundaries.
 * It separates viewport calculation from rendering logic to create a clear separation
 * of concerns and eliminate the fragmented calculations found in the original implementation.
 */

export interface ViewportState {
    /** Total width available for content (excluding borders/prefixes) */
    contentWidth: number;
    /** Total height available for scrollable content (excluding header/confirmation) */
    contentHeight: number;
    /** Total allocated width from parent */
    totalWidth: number;
    /** Total allocated height from parent */
    totalHeight: number;
    /** Width reserved for border prefixes (e.g., "│ ") */
    prefixWidth: number;
    /** Height reserved for header line */
    headerHeight: number;
    /** Height reserved for confirmation line */
    confirmationHeight: number;
}

export interface OverflowState {
    /** Content exceeds viewport and can scroll up */
    canScrollUp: boolean;
    /** Content exceeds viewport and can scroll down */
    canScrollDown: boolean;
    /** Total content height vs available viewport height */
    totalContentHeight: number;
    /** Maximum scroll offset possible */
    maxScrollOffset: number;
}

export class ViewportCalculator {
    private static readonly DEFAULT_PREFIX_WIDTH = 2; // "│ "
    private static readonly DEFAULT_HEADER_HEIGHT = 1;
    private static readonly DEFAULT_CONFIRMATION_HEIGHT = 1;
    
    /**
     * Calculate viewport dimensions based on parent constraints
     */
    calculateViewport(
        maxWidth: number, 
        maxLines?: number,
        contentRequiredLines?: number
    ): ViewportState {
        const totalWidth = maxWidth;
        const totalHeight = maxLines || contentRequiredLines || 10;
        
        const prefixWidth = ViewportCalculator.DEFAULT_PREFIX_WIDTH;
        const headerHeight = ViewportCalculator.DEFAULT_HEADER_HEIGHT;
        const confirmationHeight = ViewportCalculator.DEFAULT_CONFIRMATION_HEIGHT;
        
        // Calculate available space for actual content
        const contentWidth = Math.max(0, totalWidth - prefixWidth);
        const contentHeight = Math.max(0, totalHeight - headerHeight - confirmationHeight);
        
        return {
            contentWidth,
            contentHeight,
            totalWidth,
            totalHeight,
            prefixWidth,
            headerHeight,
            confirmationHeight
        };
    }
    
    /**
     * Determine overflow conditions based on content height vs viewport
     */
    calculateOverflow(
        viewport: ViewportState,
        totalContentHeight: number,
        currentScrollOffset: number
    ): OverflowState {
        const maxScrollOffset = Math.max(0, totalContentHeight - viewport.contentHeight);
        
        // Content overflows if total content exceeds available viewport space
        const hasOverflow = totalContentHeight > viewport.contentHeight;
        
        // Can scroll up if we're currently scrolled down from the top
        const canScrollUp = hasOverflow && currentScrollOffset > 0;
        
        // Can scroll down if we haven't reached the maximum scroll position
        const canScrollDown = hasOverflow && currentScrollOffset < maxScrollOffset;
        
        return {
            canScrollUp,
            canScrollDown,
            totalContentHeight,
            maxScrollOffset
        };
    }
    
    /**
     * Validate that viewport dimensions are reasonable
     */
    validateViewport(viewport: ViewportState): boolean {
        return (
            viewport.contentWidth >= 0 &&
            viewport.contentHeight >= 0 &&
            viewport.totalWidth >= viewport.prefixWidth &&
            viewport.totalHeight >= viewport.headerHeight + viewport.confirmationHeight
        );
    }
    
    /**
     * Calculate text truncation parameters for given width constraints
     */
    calculateTextTruncation(
        text: string,
        availableWidth: number,
        ellipsisWidth: number = 1
    ): { displayText: string; isTruncated: boolean } {
        if (text.length <= availableWidth) {
            return { displayText: text, isTruncated: false };
        }
        
        const maxTextWidth = Math.max(0, availableWidth - ellipsisWidth);
        const displayText = text.substring(0, maxTextWidth) + '…';
        
        return { displayText, isTruncated: true };
    }
    
    /**
     * Calculate header layout with proper text truncation
     */
    calculateHeaderLayout(
        icon: string,
        label: string,
        viewport: ViewportState
    ): { displayIcon: string; displayLabel: string; isTruncated: boolean } {
        const iconWidth = icon.length;
        const spaceWidth = 1; // space between icon and label
        const availableForLabel = viewport.totalWidth - iconWidth - spaceWidth;
        
        const { displayText: displayLabel, isTruncated } = this.calculateTextTruncation(
            label,
            availableForLabel
        );
        
        return {
            displayIcon: icon,
            displayLabel,
            isTruncated
        };
    }
    
    /**
     * Calculate confirmation line layout with proper text truncation
     */
    calculateConfirmationLayout(
        isConfirmFocused: boolean,
        viewport: ViewportState,
        customText?: string
    ): { 
        prefix: string; 
        icon: string; 
        check: string; 
        displayText: string; 
        isTruncated: boolean 
    } {
        const prefix = "└─";
        const icon = isConfirmFocused ? "▶ " : "  ";
        const check = "✓ ";
        const baseText = customText || "Confirm Selection";
        
        const prefixWidth = prefix.length + icon.length + check.length;
        const availableForText = viewport.totalWidth - prefixWidth;
        
        const { displayText, isTruncated } = this.calculateTextTruncation(
            baseText,
            availableForText
        );
        
        return {
            prefix,
            icon,
            check,
            displayText,
            isTruncated
        };
    }
    
    /**
     * Calculate dual-button confirmation layout with validation states
     */
    calculateDualButtonConfirmationLayout(
        focusedButton: 'confirm' | 'cancel' | null,
        viewport: ViewportState,
        isConfirmEnabled: boolean = true,
        customConfirmText?: string,
        customCancelText?: string
    ): {
        prefix: string;
        icon: string;
        confirmButton: {
            check: string;
            text: string;
            isEnabled: boolean;
            isFocused: boolean;
        };
        separator: string;
        cancelButton: {
            cross: string;
            text: string;
            isEnabled: boolean;
            isFocused: boolean;
            needsBoldY?: boolean;
        };
        isTruncated: boolean;
    } {
        const prefix = "└─";
        const icon = focusedButton ? "▶ " : "  ";
        
        // Button components
        const confirmCheck = "✓ ";
        const confirmText = customConfirmText || "Confirm Selection";
        const cancelCross = "✗ ";
        const cancelText = customCancelText || "Cancel";
        const separator = "  ";
        
        // Calculate available space
        const fixedWidth = prefix.length + icon.length + confirmCheck.length + 
                          cancelCross.length + separator.length;
        const availableForText = Math.max(0, viewport.totalWidth - fixedWidth);
        
        // Split available space between buttons based on actual text length
        const confirmTextLength = confirmText.length;
        const cancelTextLength = cancelText.length;
        const totalTextLength = confirmTextLength + cancelTextLength;
        
        let maxConfirmWidth, maxCancelWidth;
        if (totalTextLength <= availableForText) {
            // Both fit, allocate exact space needed
            maxConfirmWidth = confirmTextLength;
            maxCancelWidth = cancelTextLength;
        } else {
            // Need to allocate proportionally based on text length
            const confirmRatio = confirmTextLength / totalTextLength;
            maxConfirmWidth = Math.floor(availableForText * confirmRatio);
            maxCancelWidth = availableForText - maxConfirmWidth;
        }
        
        // Truncate button text if needed
        const { displayText: confirmDisplayText, isTruncated: confirmTruncated } = 
            this.calculateTextTruncation(confirmText, maxConfirmWidth);
        const { displayText: cancelDisplayText, isTruncated: cancelTruncated } = 
            this.calculateTextTruncation(cancelText, maxCancelWidth);
        
        // Check if cancel text contains "Press Y to confirm" for special formatting
        const needsBoldY = cancelText.includes('Press Y to confirm');
        
        return {
            prefix,
            icon,
            confirmButton: {
                check: confirmCheck,
                text: confirmDisplayText,
                isEnabled: isConfirmEnabled,
                isFocused: focusedButton === 'confirm'
            },
            separator,
            cancelButton: {
                cross: cancelCross,
                text: cancelDisplayText,
                isEnabled: true, // Cancel is always enabled
                isFocused: focusedButton === 'cancel',
                needsBoldY: needsBoldY
            },
            isTruncated: confirmTruncated || cancelTruncated
        };
    }
}