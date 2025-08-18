import React, { ReactElement } from 'react';
import { Text, Key } from 'ink';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';
import { ContentService } from '../../services/ContentService';
import { IListItem } from './IListItem';

/**
 * Configuration option for VerticalToggleRow
 */
export interface ToggleOption {
    value: string;
    label: string;
}

/**
 * Props for VerticalToggleRow component
 */
export interface VerticalToggleRowProps {
    /** Label text displayed before options */
    label: string;
    /** Array of toggle options */
    options: ToggleOption[];
    /** Currently selected option value */
    selectedValue: string;
    /** Whether the component has focus */
    hasFocus: boolean;
    /** Callback when selection changes */
    onSelectionChange: (value: string) => void;
    /** Maximum width for rendering */
    maxWidth: number;
    /** Whether to show navigation arrows */
    showNavigationHint?: boolean;
}

/**
 * Single-line toggle component for quickly selecting between configuration options
 * 
 * Features:
 * - Left/Right arrows for immediate selection (no Enter/Space needed)
 * - Up/Down arrows pass through to parent for list navigation
 * - Responsive truncation with priority: label → longer option → shorter option
 * - Visual feedback with focus states and selection symbols
 * 
 * @example
 * ```tsx
 * <VerticalToggleRow
 *   label="Choose configuration mode"
 *   options={[
 *     { value: 'assisted', label: 'Assisted (Recommended)' },
 *     { value: 'manual', label: 'Manual (Advanced)' }
 *   ]}
 *   selectedValue="assisted"
 *   hasFocus={true}
 *   onSelectionChange={(value) => console.log('Selected:', value)}
 *   maxWidth={80}
 *   showNavigationHint={true}
 * />
 * ```
 */
export class VerticalToggleRow {
    private contentService = new ContentService();
    
    constructor(
        public props: VerticalToggleRowProps
    ) {}

    /**
     * Handle keyboard input
     * @param _input Input string (unused)
     * @param key Key object
     * @returns true if input was handled, false to pass through
     */
    handleInput(_input: string, key: Key): boolean {
        if (!this.props.hasFocus) {
            return false;
        }

        // Left/Right arrows toggle selection immediately
        if (key.leftArrow || key.rightArrow) {
            const currentIndex = this.props.options.findIndex(
                opt => opt.value === this.props.selectedValue
            );
            
            let newIndex: number;
            if (key.leftArrow) {
                // Move to previous option (wrap to end if at beginning)
                newIndex = currentIndex > 0 ? currentIndex - 1 : this.props.options.length - 1;
            } else {
                // Move to next option (wrap to beginning if at end)
                newIndex = currentIndex < this.props.options.length - 1 ? currentIndex + 1 : 0;
            }
            
            // Check if selection actually changed to prevent flickering
            const newValue = this.props.options[newIndex]?.value;
            if (newValue && newValue !== this.props.selectedValue) {
                this.props.onSelectionChange(newValue);
                return true;
            }
            return false; // No change, prevent re-render
        }

        // Up/Down arrows pass through to parent for list navigation
        if (key.upArrow || key.downArrow) {
            return false; // Pass through to parent
        }

        // Don't consume other input
        return false;
    }

    /**
     * Render the toggle row with truncation handling
     */
    render(): ReactElement {
        const { label, options, selectedValue, hasFocus, maxWidth, showNavigationHint = true } = this.props;
        
        // Find selected option
        const selectedOption = options.find(opt => opt.value === selectedValue);
        if (!selectedOption) {
            // Fallback if selected value not found
            return (
                <Text {...textColorProp(hasFocus ? theme.colors.accent : undefined)}>
                    ⁃ {label}: Invalid selection
                </Text>
            );
        }

        // Calculate layout with truncation
        const layout = this.calculateLayout(label, options, selectedOption, maxWidth, showNavigationHint);
        
        // Render the single line with dynamic cursor
        const cursor = hasFocus ? '▶' : '⁃';
        return (
            <Text>
                <Text {...textColorProp(hasFocus ? theme.colors.accent : undefined)}>
                    {cursor} {layout.displayLabel}{layout.displayLabel && ': '}
                </Text>
                {layout.optionElements}
                {layout.showNavigationHint && (
                    <Text {...textColorProp(theme.colors.textMuted)}> ←→</Text>
                )}
            </Text>
        );
    }

    /**
     * Calculate optimal layout with truncation priority:
     * 1. Label first (until minimum viable length)
     * 2. Longer option second  
     * 3. Shorter option last
     * 
     * @param label The label text
     * @param options All toggle options
     * @param selectedOption Currently selected option
     * @param maxWidth Maximum available width
     * @param showNavigationHint Whether to show ←→ arrows
     * @returns Layout with truncated text and option elements
     */
    private calculateLayout(
        label: string, 
        options: ToggleOption[], 
        selectedOption: ToggleOption, 
        maxWidth: number, 
        showNavigationHint: boolean
    ) {
        // Fixed structure overhead
        const bulletAndSpace = 2; // "⁃ "
        const colon = 2; // ": "
        const navigationHint = showNavigationHint ? 3 : 0; // " ←→"
        const fixedOverhead = bulletAndSpace + colon + navigationHint;

        // Selection symbols and spacing between options
        const selectionOverhead = options.length * 2; // "◉ " or "○ " per option
        const spaceBetweenOptions = Math.max(0, options.length - 1) * 1; // " " between options

        // Calculate available space for content
        const availableForContent = maxWidth - fixedOverhead - selectionOverhead - spaceBetweenOptions;

        if (availableForContent <= 0) {
            // Extreme case: not enough space for anything meaningful
            return {
                displayLabel: '',
                optionElements: this.renderMinimalOptions(options, selectedOption),
                showNavigationHint: false
            };
        }

        // Try without truncation first
        const fullLabelLength = this.contentService.measureText(label);
        const fullOptionsLength = options.reduce((sum, opt) => 
            sum + this.contentService.measureText(opt.label), 0);
        const totalContentLength = fullLabelLength + fullOptionsLength;

        if (totalContentLength <= availableForContent) {
            // Everything fits without truncation
            return {
                displayLabel: label,
                optionElements: this.renderOptions(options, selectedOption, null),
                showNavigationHint: showNavigationHint
            };
        }

        // Apply truncation strategy: Label → Longer option → Shorter option
        return this.applyTruncationStrategy(label, options, selectedOption, availableForContent);
    }

    /**
     * Apply sequential truncation strategy following the specification:
     * 75+ chars:  ⁃ Choose configuration mode: ◉ Assisted (Recommended) ○ Manual (Advanced)
     * 60+ chars:  ⁃ Choose config mode…: ◉ Assisted (Recommended) ○ Manual (Advanced)
     * 50+ chars:  ⁃ Choose config…: ◉ Assisted (Recommended) ○ Manual (Advanced)
     * 40+ chars:  ⁃ Choose…: ◉ Assisted (Recommended) ○ Manual (Advanced)
     * 35+ chars:  ⁃ Choose…: ◉ Assisted (Recommen… ○ Manual (Advanced)
     * 30+ chars:  ⁃ Choose…: ◉ Assist… ○ Manual (Advanced)
     * 20+ chars:  ⁃ Choose…: ◉ Assis… ○ Manu…
     * 10+ chars:  ⁃ ◉ As… ○ M…
     */
    /**
     * Apply 3-phase sequential truncation algorithm:
     * Phase 1: Label truncation until minimum viable
     * Phase 2: Sequential equalization - bring longest options down to match next tier  
     * Phase 3: Simultaneous truncation of equal-length options
     */
    private applyTruncationStrategy(
        label: string,
        options: ToggleOption[],
        selectedOption: ToggleOption,
        availableSpace: number
    ) {
        // Handle edge case: no options
        if (options.length === 0) {
            return {
                displayLabel: this.contentService.truncateText(label, availableSpace),
                optionElements: [],
                showNavigationHint: false
            };
        }

        // Start with original values
        let currentLabel = label;
        let currentOptionLabels = options.map(opt => opt.label);
        
        // Calculate how much space we need to free
        const labelSpace = this.contentService.measureText(currentLabel);
        const optionsSpace = currentOptionLabels.reduce((sum, optLabel) => 
            sum + this.contentService.measureText(optLabel), 0);
        const totalContentSpace = labelSpace + optionsSpace;
        const spaceNeeded = totalContentSpace - availableSpace;
        
        // If it already fits, no truncation needed
        if (spaceNeeded <= 0) {
            return {
                displayLabel: currentLabel,
                optionElements: this.renderOptions(options, selectedOption, null),
                showNavigationHint: false
            };
        }
        
        // Apply precise truncation to free exactly the space needed
        const result = this.applyPreciseTruncation(currentLabel, currentOptionLabels, spaceNeeded);
        
        // Create truncation map for rendering
        const optionTruncations = new Map<string, string>();
        options.forEach((option, index) => {
            const truncatedLabel = result.optionLabels[index];
            if (truncatedLabel && truncatedLabel !== option.label) {
                optionTruncations.set(option.value, truncatedLabel);
            }
        });
        
        return {
            displayLabel: result.label,
            optionElements: this.renderOptions(options, selectedOption, optionTruncations),
            showNavigationHint: false
        };
    }
    
    /**
     * Apply precise truncation to free exactly the space needed using 3-phase algorithm
     */
    private applyPreciseTruncation(
        currentLabel: string,
        currentOptionLabels: string[],
        spaceNeeded: number
    ): { label: string; optionLabels: string[] } {
        
        let remainingSpaceToFree = spaceNeeded;
        let newLabel = currentLabel;
        let newOptionLabels = [...currentOptionLabels];
        
        // Phase 1: Label truncation until minimum viable
        const minLabelLength = 6; // "Choose" = 6 chars, minimum viable
        const currentLabelLength = this.contentService.measureText(newLabel);
        
        if (currentLabelLength > minLabelLength && remainingSpaceToFree > 0) {
            // Calculate how much we can truncate from the label
            const maxLabelTruncation = currentLabelLength - minLabelLength;
            const labelTruncation = Math.min(remainingSpaceToFree, maxLabelTruncation);
            
            if (labelTruncation > 0) {
                const targetLength = currentLabelLength - labelTruncation;
                newLabel = this.contentService.truncateText(newLabel, targetLength);
                remainingSpaceToFree -= labelTruncation;
            }
        }
        
        // Phase 2: Sequential equalization - bring longest options down to next tier
        while (remainingSpaceToFree > 0) {
            const optionLengths = newOptionLabels.map(label => this.contentService.measureText(label));
            const maxLength = Math.max(...optionLengths);
            const secondMaxLength = this.getSecondMaxLength(optionLengths);
            
            if (maxLength > secondMaxLength && secondMaxLength > 0) {
                // Calculate how much space we'd free by equalizing longest to second-longest
                const longestOptions = newOptionLabels.filter(label => 
                    this.contentService.measureText(label) === maxLength);
                const potentialSpaceFreed = longestOptions.length * (maxLength - secondMaxLength);
                
                if (potentialSpaceFreed <= remainingSpaceToFree) {
                    // Equalize all longest options to second-longest level
                    newOptionLabels = newOptionLabels.map(label => {
                        const labelLength = this.contentService.measureText(label);
                        if (labelLength === maxLength) {
                            return this.contentService.truncateText(label, secondMaxLength);
                        }
                        return label;
                    });
                    remainingSpaceToFree -= potentialSpaceFreed;
                } else {
                    // Partially truncate longest options
                    const truncationPerOption = Math.ceil(remainingSpaceToFree / longestOptions.length);
                    newOptionLabels = newOptionLabels.map(label => {
                        const labelLength = this.contentService.measureText(label);
                        if (labelLength === maxLength) {
                            const targetLength = Math.max(3, labelLength - truncationPerOption);
                            return this.contentService.truncateText(label, targetLength);
                        }
                        return label;
                    });
                    remainingSpaceToFree = 0; // We've used up our budget
                }
            } else {
                // All options are equal length, move to phase 3
                break;
            }
        }
        
        // Phase 3: All options equal length, truncate simultaneously
        const minOptionLength = 3; // "A…" = 2 chars + ellipsis
        
        if (remainingSpaceToFree > 0) {
            const optionLengths = newOptionLabels.map(label => this.contentService.measureText(label));
            const currentMaxLength = Math.max(...optionLengths);
            
            if (currentMaxLength > minOptionLength) {
                // Calculate truncation needed per option
                const truncationPerOption = Math.ceil(remainingSpaceToFree / newOptionLabels.length);
                
                newOptionLabels = newOptionLabels.map(label => {
                    const labelLength = this.contentService.measureText(label);
                    if (labelLength > minOptionLength) {
                        const targetLength = Math.max(minOptionLength, labelLength - truncationPerOption);
                        return this.contentService.truncateText(label, targetLength);
                    }
                    return label;
                });
                
                remainingSpaceToFree = 0;
            }
        }
        
        // Phase 4: Remove label entirely if we still need space
        if (remainingSpaceToFree > 0 && newLabel.length > 0) {
            newLabel = '';
        }
        
        return {
            label: newLabel,
            optionLabels: newOptionLabels
        };
    }
    
    /**
     * Get the second maximum length from an array of lengths
     */
    private getSecondMaxLength(lengths: number[]): number {
        if (lengths.length < 2) return 0;
        
        const sortedUnique = [...new Set(lengths)].sort((a, b) => b - a);
        return sortedUnique.length > 1 ? (sortedUnique[1] || 0) : (sortedUnique[0] || 0);
    }

    /**
     * Render option elements with selection symbols
     */
    private renderOptions(
        options: ToggleOption[], 
        selectedOption: ToggleOption, 
        truncations: Map<string, string> | null
    ): ReactElement[] {
        const elements: ReactElement[] = [];

        options.forEach((option, index) => {
            const isSelected = option.value === selectedOption.value;
            const symbol = isSelected ? '◉' : '○';
            const displayLabel = truncations?.get(option.value) || option.label;
            
            if (index > 0) {
                elements.push(
                    <Text key={`sep-${index}`}> </Text>
                );
            }

            elements.push(
                <Text key={option.value} {...textColorProp(isSelected ? theme.colors.accent : undefined)}>
                    {symbol} {displayLabel}
                </Text>
            );
        });

        return elements;
    }

    /**
     * Render minimal options for extreme space constraints
     */
    private renderMinimalOptions(options: ToggleOption[], selectedOption: ToggleOption): ReactElement[] {
        // Ultra-minimal: just show symbols and first letter of each option
        return options.map((option, index) => {
            const isSelected = option.value === selectedOption.value;
            const symbol = isSelected ? '◉' : '○';
            const shortLabel = option.label.charAt(0);
            
            const elements: ReactElement[] = [];
            
            if (index > 0) {
                elements.push(
                    <Text key={`sep-${index}`}> </Text>
                );
            }

            elements.push(
                <Text key={option.value} {...textColorProp(isSelected ? theme.colors.accent : undefined)}>
                    {symbol} {shortLabel}…
                </Text>
            );

            return elements;
        }).flat();
    }
}

/**
 * React functional component wrapper for VerticalToggleRow
 */
export const VerticalToggleRowComponent: React.FC<VerticalToggleRowProps> = (props) => {
    const toggleRow = new VerticalToggleRow(props);
    return toggleRow.render();
};

/**
 * IListItem wrapper for VerticalToggleRow to integrate with ContainerListItem
 * 
 * This wrapper allows VerticalToggleRow to be used as a child item within
 * ContainerListItem, enabling it to be part of forms and wizards.
 */
export class VerticalToggleRowListItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true;

    private toggleRow: VerticalToggleRow;
    private _label: string;
    private _options: ToggleOption[];
    private _selectedValue: string;
    private _onSelectionChange: (value: string) => void;
    private _isControllingInput: boolean = false;

    /**
     * Create a new VerticalToggleRowListItem
     * @param icon Icon to display (typically "⁃")
     * @param label Label text for the toggle row
     * @param options Array of toggle options
     * @param selectedValue Currently selected option value
     * @param isActive Whether this item has focus
     * @param onSelectionChange Callback when selection changes
     */
    constructor(
        public icon: string,
        label: string,
        options: ToggleOption[],
        selectedValue: string,
        public isActive: boolean = false,
        onSelectionChange?: (value: string) => void
    ) {
        this._label = label;
        this._options = options;
        this._selectedValue = selectedValue;
        this._onSelectionChange = onSelectionChange || (() => {});

        // Create toggle row with internal callback that updates our state
        this.toggleRow = new VerticalToggleRow({
            label: this._label,
            options: this._options,
            selectedValue: this._selectedValue,
            hasFocus: isActive,
            onSelectionChange: (newValue: string) => {
                this._selectedValue = newValue;
                this._onSelectionChange(newValue);
            },
            maxWidth: 80, // Will be overridden in render
            showNavigationHint: false // Remove confusing arrows
        });
    }

    get isControllingInput(): boolean {
        return this._isControllingInput;
    }

    onEnter(): void {
        // Enter also activates toggle control mode (alternative to arrow keys)
        this._isControllingInput = true;
    }

    onExit(): void {
        // Exit toggle control mode
        this._isControllingInput = false;
    }

    onExpand(key?: Key): void {
        // Called when ContainerListItem receives left/right arrow for this item
        // Activate toggle control mode and process the initial arrow direction
        this._isControllingInput = true;
        
        // Process the arrow that triggered expansion
        if (key) {
            this.handleArrowToggle(key.leftArrow, key.rightArrow);
        }
    }

    private handleArrowToggle(isLeft: boolean, isRight: boolean): boolean {
        if (!isLeft && !isRight) return false;

        const currentIndex = this._options.findIndex(opt => opt.value === this._selectedValue);
        
        let newIndex: number;
        if (isLeft) {
            // Move to previous option (wrap to end if at beginning)
            newIndex = currentIndex > 0 ? currentIndex - 1 : this._options.length - 1;
        } else {
            // Move to next option (wrap to beginning if at end)
            newIndex = currentIndex < this._options.length - 1 ? currentIndex + 1 : 0;
        }
        
        // Check if selection actually changed to prevent flickering
        const newValue = this._options[newIndex]?.value;
        if (newValue && newValue !== this._selectedValue) {
            this._selectedValue = newValue;
            this._onSelectionChange(newValue);
            return true;
        }
        return false;
    }

    onSelect(): void {
        // Could add visual feedback when selected
    }

    onDeselect(): void {
        // Could remove visual feedback when deselected
    }

    handleInput(_input: string, key: Key): boolean {
        // Only handle input when controlling (after onExpand was called)
        if (!this._isControllingInput) {
            return false; // Pass through to parent when not controlling
        }

        // Handle left/right arrows for toggling
        if (key.leftArrow || key.rightArrow) {
            return this.handleArrowToggle(key.leftArrow, key.rightArrow);
        }

        // Up/Down arrows exit controlling mode and pass through for seamless navigation
        if (key.upArrow || key.downArrow) {
            this._isControllingInput = false;
            return false; // Pass through to parent for navigation
        }

        // Let tab pass through for panel navigation
        if (key.tab) {
            return false;
        }

        // Consume other input when controlling (like escape)
        return true;
    }

    render(maxWidth: number, _maxLines?: number): ReactElement | ReactElement[] {
        // Update the toggle row with current render parameters and state
        this.toggleRow = new VerticalToggleRow({
            label: this._label,
            options: this._options,
            selectedValue: this._selectedValue,
            hasFocus: this.isActive,
            onSelectionChange: (newValue: string) => {
                this._selectedValue = newValue;
                this._onSelectionChange(newValue);
            },
            maxWidth,
            showNavigationHint: false // Never show navigation arrows
        });

        return this.toggleRow.render();
    }

    getRequiredLines(_maxWidth: number, _maxHeight?: number): number {
        return 1; // VerticalToggleRow is always single line
    }

    /**
     * Update the selected value from external source
     */
    updateSelectedValue(newValue: string): void {
        this._selectedValue = newValue;
        this.toggleRow = new VerticalToggleRow({
            label: this._label,
            options: this._options,
            selectedValue: this._selectedValue,
            hasFocus: this.isActive,
            onSelectionChange: (value: string) => {
                this._selectedValue = value;
                this._onSelectionChange(value);
            },
            maxWidth: this.toggleRow.props.maxWidth,
            showNavigationHint: false
        });
    }

    /**
     * Update the selection change callback
     */
    updateOnSelectionChange(callback: (value: string) => void): void {
        this._onSelectionChange = callback;
        this.toggleRow = new VerticalToggleRow({
            label: this._label,
            options: this._options,
            selectedValue: this._selectedValue,
            hasFocus: this.isActive,
            onSelectionChange: (value: string) => {
                this._selectedValue = value;
                this._onSelectionChange(value);
            },
            maxWidth: this.toggleRow.props.maxWidth,
            showNavigationHint: false
        });
    }
}