import React, { ReactElement } from 'react';
import { Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem.js';
import { FilePickerBody } from './FilePickerBody.js';
import { theme } from '../../utils/theme.js';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

export type FilePickerMode = 'file' | 'folder' | 'both';

interface FileSystemItem {
    name: string;
    isDirectory: boolean;
    path: string;
    isConfirmAction?: boolean;
}

export class FilePickerListItem implements IListItem {
    readonly selfConstrained = true as const;
    private _isControllingInput: boolean = false;
    private _currentPath: string;
    private _selectedPath: string;
    private _originalPath: string;
    private _items: FileSystemItem[] = [];
    private _focusedIndex: number = 0;
    private _previousFocusedIndex: number = 0;
    private _error: string | null = null;
    private _loadingComplete: boolean = false;
    private _columnCount: number = 1;
    private _itemsPerColumn: number = 0;
    private _selectedPathValid: boolean = true;
    private onPathChange?: (newPath: string) => void;
    private onChange?: () => void;
    
    constructor(
        public icon: string,
        private label: string,
        initialPath: string,
        public isActive: boolean,
        private mode: FilePickerMode = 'both',
        onPathChange?: (newPath: string) => void,
        private filterPatterns?: string[],
        onChange?: () => void
    ) {
        // Resolve initial path
        this._currentPath = path.resolve(initialPath || os.homedir());
        this._selectedPath = this._currentPath;
        this._originalPath = this._currentPath;
        this._selectedPathValid = true;
        if (onPathChange) {
            this.onPathChange = onPathChange;
        }
        if (onChange) {
            this.onChange = onChange;
        }
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    onEnter(): void {
        // Enter expanded mode
        this._isControllingInput = true;
        this._focusedIndex = 0;
        
        // Load directory contents synchronously on first render
        // Note: This is intentionally synchronous to avoid the empty state
        this.loadDirectoryContentsSync();
    }
    
    onExit(): void {
        // Exit expanded mode
        this._isControllingInput = false;
        // Keep error state to show invalid path in collapsed view
    }
    
    private loadDirectoryContentsSync(): void {
        try {
            // Use sync fs methods for initial load
            const entries = fsSync.readdirSync(this._currentPath, { withFileTypes: true });
            
            // Filter and sort items
            this._items = [];
            
            // Add parent directory option if not at root
            if (this._currentPath !== path.parse(this._currentPath).root) {
                this._items.push({
                    name: '..',
                    isDirectory: true,
                    path: path.dirname(this._currentPath)
                });
            }
            
            // Process entries
            for (const entry of entries) {
                // Skip hidden files (starting with .)
                if (entry.name.startsWith('.') && entry.name !== '..') {
                    continue;
                }
                
                // Apply mode filter
                if (this.mode === 'folder' && !entry.isDirectory()) {
                    continue;
                }
                // In file mode, we need to show directories for navigation
                // but we'll only allow selecting files
                
                // Apply pattern filters if any
                if (this.filterPatterns && !entry.isDirectory()) {
                    const matchesFilter = this.filterPatterns.some(pattern => {
                        // Simple glob matching (just * for now)
                        const regex = new RegExp(pattern.replace('*', '.*'));
                        return regex.test(entry.name);
                    });
                    if (!matchesFilter) continue;
                }
                
                this._items.push({
                    name: entry.name,
                    isDirectory: entry.isDirectory(),
                    path: path.join(this._currentPath, entry.name)
                });
            }
            
            // Sort: directories first, then alphabetically
            this._items.sort((a, b) => {
                if (a.name === '..') return -1;
                if (b.name === '..') return 1;
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            
            // Add confirm selection item for folder/both modes
            if (this.mode === 'folder' || this.mode === 'both') {
                this._items.push({
                    name: 'Confirm Selection',
                    isDirectory: false,
                    path: this._currentPath,
                    isConfirmAction: true
                });
            }
            
            this._error = null;
            this._selectedPathValid = true;
            this._loadingComplete = true;
            this._selectedPathValid = true;
        } catch (error) {
            // Store the original error for proper parsing in FilePickerBody
            this._error = error instanceof Error ? error.message : 'Unknown error';
            this._items = [];
            this._loadingComplete = true;
            this._selectedPathValid = false;
            
            // Add a "Go back" option if we're not at root
            if (this._currentPath !== path.parse(this._currentPath).root) {
                this._items.push({
                    name: '..',
                    isDirectory: true,
                    path: path.dirname(this._currentPath)
                });
            }
        }
    }
    
    private async loadDirectoryContents(): Promise<void> {
        try {
            // Check permissions
            await fs.access(this._currentPath, fs.constants.R_OK);
            
            // Read directory
            const entries = await fs.readdir(this._currentPath, { withFileTypes: true });
            
            // Filter and sort items
            this._items = [];
            
            // Add parent directory option if not at root
            if (this._currentPath !== path.parse(this._currentPath).root) {
                this._items.push({
                    name: '..',
                    isDirectory: true,
                    path: path.dirname(this._currentPath)
                });
            }
            
            // Process entries
            for (const entry of entries) {
                // Skip hidden files (starting with .)
                if (entry.name.startsWith('.') && entry.name !== '..') {
                    continue;
                }
                
                // Apply mode filter
                if (this.mode === 'folder' && !entry.isDirectory()) {
                    continue;
                }
                // In file mode, we need to show directories for navigation
                // but we'll only allow selecting files
                
                // Apply pattern filters if any
                if (this.filterPatterns && !entry.isDirectory()) {
                    const matchesFilter = this.filterPatterns.some(pattern => {
                        // Simple glob matching (just * for now)
                        const regex = new RegExp(pattern.replace('*', '.*'));
                        return regex.test(entry.name);
                    });
                    if (!matchesFilter) continue;
                }
                
                this._items.push({
                    name: entry.name,
                    isDirectory: entry.isDirectory(),
                    path: path.join(this._currentPath, entry.name)
                });
            }
            
            // Sort: directories first, then alphabetically
            this._items.sort((a, b) => {
                if (a.name === '..') return -1;
                if (b.name === '..') return 1;
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
            
            // Add confirm selection item for folder/both modes
            if (this.mode === 'folder' || this.mode === 'both') {
                this._items.push({
                    name: 'Confirm Selection',
                    isDirectory: false,
                    path: this._currentPath,
                    isConfirmAction: true
                });
            }
            
            this._error = null;
            this._selectedPathValid = true;
        } catch (error) {
            // Store the original error for proper parsing in FilePickerBody
            this._error = error instanceof Error ? error.message : 'Unknown error';
            this._items = [];
            this._selectedPathValid = false;
            
            // Add a "Go back" option if we're not at root
            if (this._currentPath !== path.parse(this._currentPath).root) {
                this._items.push({
                    name: '..',
                    isDirectory: true,
                    path: path.dirname(this._currentPath)
                });
            }
        }
    }
    
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) return false;
        
        if (key.escape) {
            // Cancel and revert to original value
            this._selectedPath = this._originalPath;
            this._currentPath = this._originalPath;
            this.onExit();
            return true;
        } else if (key.return) {
            const selectedItem = this._items[this._focusedIndex];
            if (selectedItem) {
                if (selectedItem.isConfirmAction) {
                    // Confirm current folder selection
                    this._selectedPath = this._currentPath;
                    this._selectedPathValid = true;
                    this.onPathChange?.(this._selectedPath);
                    this.onExit();
                } else if (selectedItem.isDirectory) {
                    // Navigate into directory
                    this._currentPath = selectedItem.path;
                    this._focusedIndex = 0;
                    this._previousFocusedIndex = 0;
                    // Use sync loading for immediate feedback
                    this.loadDirectoryContentsSync();
                    // Don't update selected path, just navigate
                } else {
                    // Select file
                    this._selectedPath = selectedItem.path;
                    this._selectedPathValid = true;
                    this.onPathChange?.(this._selectedPath);
                    this.onExit();
                }
            }
            return true;
        } else if (key.upArrow) {
            const hasConfirmItem = this._items.some(item => item.isConfirmAction);
            const regularItemsCount = this._items.filter(item => !item.isConfirmAction).length;
            
            if (this._columnCount > 1 && this._itemsPerColumn > 0) {
                // Multi-column navigation
                if (this._focusedIndex === this._items.length - 1 && hasConfirmItem) {
                    // On confirm item, go back to previous position
                    this._focusedIndex = this._previousFocusedIndex;
                } else if (this._focusedIndex < regularItemsCount) {
                    // On a regular item
                    // For vertical-first layout (matching FilePickerBody)
                    const itemsPerCol = Math.ceil(regularItemsCount / this._columnCount);
                    const currentCol = Math.floor(this._focusedIndex / itemsPerCol);
                    const currentRow = this._focusedIndex % itemsPerCol;
                    
                    if (currentRow > 0) {
                        // Not at top of column
                        this._focusedIndex--;
                    } else {
                        // At top of column
                        if (currentCol > 0) {
                            // Go to bottom of previous column
                            const prevCol = currentCol - 1;
                            const itemsInPrevCol = Math.min(itemsPerCol, regularItemsCount - (prevCol * itemsPerCol));
                            const lastRowInPrevCol = itemsInPrevCol - 1;
                            this._focusedIndex = prevCol * itemsPerCol + lastRowInPrevCol;
                        } else {
                            // At top of first column, wrap to confirm or last item
                            this._focusedIndex = hasConfirmItem ? this._items.length - 1 : regularItemsCount - 1;
                        }
                    }
                }
            } else {
                // Single column navigation
                if (this._focusedIndex === this._items.length - 1 && hasConfirmItem) {
                    // On confirm item, go back to previous position
                    this._focusedIndex = this._previousFocusedIndex;
                } else {
                    this._focusedIndex = this._focusedIndex > 0 
                        ? this._focusedIndex - 1 
                        : this._items.length - 1;
                }
            }
            return true;
        } else if (key.downArrow) {
            const hasConfirmItem = this._items.some(item => item.isConfirmAction);
            const regularItemsCount = this._items.filter(item => !item.isConfirmAction).length;
            
            if (this._columnCount > 1 && this._itemsPerColumn > 0) {
                // Multi-column navigation
                if (this._focusedIndex === this._items.length - 1) {
                    // On confirm item, wrap to top
                    this._focusedIndex = 0;
                } else if (this._focusedIndex < regularItemsCount) {
                    // On a regular item
                    // For vertical-first layout (matching FilePickerBody)
                    const itemsPerCol = Math.ceil(regularItemsCount / this._columnCount);
                    const currentCol = Math.floor(this._focusedIndex / itemsPerCol);
                    const currentRow = this._focusedIndex % itemsPerCol;
                    const itemsInCurrentCol = Math.min(itemsPerCol, regularItemsCount - (currentCol * itemsPerCol));
                    const lastRowInCol = itemsInCurrentCol - 1;
                    
                    if (currentRow < lastRowInCol) {
                        // Not at bottom of column yet
                        this._focusedIndex++;
                    } else {
                        // At bottom of any column - go to confirm
                        if (hasConfirmItem) {
                            this._previousFocusedIndex = this._focusedIndex;
                            this._focusedIndex = this._items.length - 1;
                        } else {
                            // No confirm item, wrap to top of next column
                            const nextCol = (currentCol + 1) % this._columnCount;
                            this._focusedIndex = nextCol * itemsPerCol;
                        }
                    }
                }
            } else {
                // Single column navigation
                if (this._focusedIndex < this._items.length - 1) {
                    // Check if we're moving to confirm item
                    if (this._focusedIndex === this._items.length - 2 && 
                        this._items[this._items.length - 1].isConfirmAction) {
                        this._previousFocusedIndex = this._focusedIndex;
                    }
                    this._focusedIndex++;
                } else {
                    this._focusedIndex = 0;
                }
            }
            return true;
        } else if (key.leftArrow) {
            const hasConfirmItem = this._items.some(item => item.isConfirmAction);
            const regularItemsCount = this._items.filter(item => !item.isConfirmAction).length;
            
            if (this._focusedIndex === this._items.length - 1 && hasConfirmItem) {
                // On confirm item, another left exits
                this.onExit();
            } else if (this._columnCount > 1 && this._itemsPerColumn > 0 && this._focusedIndex < regularItemsCount) {
                // Multi-column navigation for regular items
                // For vertical-first layout (matching FilePickerBody)
                const itemsPerCol = Math.ceil(regularItemsCount / this._columnCount);
                const currentCol = Math.floor(this._focusedIndex / itemsPerCol);
                
                if (currentCol > 0) {
                    // Move to previous column, same row
                    const currentRow = this._focusedIndex % itemsPerCol;
                    const prevCol = currentCol - 1;
                    const newIndex = prevCol * itemsPerCol + currentRow;
                    
                    // Make sure we don't go past the last item in that column
                    const itemsInPrevCol = Math.min(itemsPerCol, regularItemsCount - (prevCol * itemsPerCol));
                    const lastItemInPrevCol = prevCol * itemsPerCol + itemsInPrevCol - 1;
                    
                    if (newIndex <= lastItemInPrevCol) {
                        this._focusedIndex = newIndex;
                    } else {
                        // Go to last item in previous column
                        this._focusedIndex = lastItemInPrevCol;
                    }
                } else {
                    // In leftmost column - go to confirm if available
                    if (hasConfirmItem) {
                        this._previousFocusedIndex = this._focusedIndex;
                        this._focusedIndex = this._items.length - 1;
                    } else {
                        this.onExit();
                    }
                }
            } else {
                // Single column - go to confirm or exit
                if (hasConfirmItem && this._focusedIndex < this._items.length - 1) {
                    this._previousFocusedIndex = this._focusedIndex;
                    this._focusedIndex = this._items.length - 1;
                } else {
                    this.onExit();
                }
            }
            return true;
        } else if (key.rightArrow) {
            const hasConfirmItem = this._items.some(item => item.isConfirmAction);
            const regularItemsCount = this._items.filter(item => !item.isConfirmAction).length;
            
            if (this._focusedIndex === this._items.length - 1 && hasConfirmItem) {
                // On confirm item, go to first column
                this._focusedIndex = 0;
            } else if (this._columnCount > 1 && this._itemsPerColumn > 0 && this._focusedIndex < regularItemsCount) {
                // Multi-column navigation for regular items
                // For vertical-first layout (matching FilePickerBody)
                const itemsPerCol = Math.ceil(regularItemsCount / this._columnCount);
                const currentCol = Math.floor(this._focusedIndex / itemsPerCol);
                const lastCol = Math.floor((regularItemsCount - 1) / itemsPerCol);
                
                if (currentCol < lastCol) {
                    // Move to next column, same row
                    const currentRow = this._focusedIndex % itemsPerCol;
                    const nextCol = currentCol + 1;
                    const newIndex = nextCol * itemsPerCol + currentRow;
                    
                    // Make sure we don't go past the last item
                    if (newIndex < regularItemsCount) {
                        this._focusedIndex = newIndex;
                    } else {
                        // Go to last item in the last column
                        this._focusedIndex = regularItemsCount - 1;
                    }
                }
                // If already in rightmost column, do nothing
            }
            // In single column mode, right arrow does nothing
            return true;
        } else if (input === ' ') {
            // Space key - same as Enter for confirm action
            const selectedItem = this._items[this._focusedIndex];
            if (selectedItem?.isConfirmAction) {
                // Confirm current folder selection
                this._selectedPath = this._currentPath;
                this._selectedPathValid = true;
                this.onPathChange?.(this._selectedPath);
                this.onExit();
            }
            return true;
        }
        
        return true; // Consume all input when in control
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (this._isControllingInput) {
            // Expanded view
            const elements: ReactElement[] = [];
            
            // Header with mode and error notification
            const modeText = this.mode === 'folder' ? 'folder mode' : 
                            this.mode === 'file' ? 'file mode' : 
                            'file/folder mode';
            
            // Parse error for notification
            let notification = '';
            if (this._error) {
                if (this._error.includes('EPERM') || this._error.includes('operation not permitted')) {
                    notification = 'Access denied - no permission to view this folder';
                } else if (this._error.includes('ENOENT') || this._error.includes('no such file or directory')) {
                    notification = 'Folder not found';
                } else if (this._error.includes('EACCES') || this._error.includes('permission denied')) {
                    notification = 'Access denied - no permission to view this folder';
                } else if (this._error.includes('ENOTDIR')) {
                    notification = 'Not a folder';
                } else {
                    notification = 'Unable to access folder';
                }
            }
            
            // Calculate available space for notification
            const baseText = `■ ${this.label} (${modeText}): `;
            const availableForNotification = maxWidth - baseText.length - 1;
            
            // Determine what enter key will do based on focused item
            const focusedItem = this._items[this._focusedIndex];
            let enterAction = '';
            if (focusedItem) {
                if (focusedItem.isConfirmAction) {
                    enterAction = '✓'; // Confirm selection
                } else if (focusedItem.isDirectory) {
                    enterAction = '└▶'; // Navigate into folder
                } else {
                    enterAction = '✓'; // Select file
                }
            }
            
            // Build header with dynamic keyboard hints
            const keyboardHints = `[enter] ${enterAction} [esc] ✗`;
            const fullKeyboardHints = keyboardHints.length; // Visual length
            const availableForHints = maxWidth - baseText.length - 1;
            
            // Determine what to show based on available space
            let showHints = false;
            let showPartialHints = false;
            
            if (availableForHints >= fullKeyboardHints + 1) {
                // Full hints fit with space
                showHints = true;
            } else if (availableForHints >= 10) {
                // Show partial hints (at least "[enter] X")
                showPartialHints = true;
            }
            
            elements.push(
                <Text key="header">
                    <Transform transform={output => output}>
                        <Text color={notification ? 'red' : undefined}>■ </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>
                            {this.label} ({modeText}):
                        </Text>
                        {showHints && (
                            <>
                                <Text> </Text>
                                <Text color={theme.colors.textMuted}>[enter] </Text>
                                <Text color={theme.colors.successGreen}>{enterAction}</Text>
                                <Text color={theme.colors.textMuted}> [esc] </Text>
                                <Text color={theme.colors.warningOrange}>✗</Text>
                            </>
                        )}
                        {showPartialHints && !showHints && (
                            <>
                                <Text> </Text>
                                <Text color={theme.colors.textMuted}>[enter] </Text>
                                <Text color={theme.colors.successGreen}>{enterAction}</Text>
                            </>
                        )}
                        {notification && !showHints && availableForHints > 10 && (
                            <>
                                <Text> </Text>
                                <Text color="red">
                                    {notification.length > availableForHints - 1
                                        ? notification.slice(0, availableForHints - 4) + '…'
                                        : notification}
                                </Text>
                            </>
                        )}
                    </Transform>
                </Text>
            );
            
            // Calculate available lines for body
            // Allow up to 4 items if there's enough vertical space
            const availableForBody = maxLines ? maxLines - 2 : 4; // -1 for header, -1 for path
            const bodyMaxLines = Math.min(4, availableForBody); // Max 4 items
            
            // Calculate column layout info for navigation
            const availableWidth = maxWidth - 4; // Account for borders
            
            // Exclude confirm action from column calculation
            const regularItems = this._items.filter(item => !item.isConfirmAction);
            
            if (maxWidth > 40 && regularItems.length > 0) {
                // Calculate how many columns we can fit
                const minColumnWidth = 15;
                const columnPadding = 2;
                let maxColumns = Math.floor(availableWidth / (minColumnWidth + columnPadding));
                maxColumns = Math.min(maxColumns, regularItems.length);
                
                // Find the best column count
                for (let colCount = maxColumns; colCount >= 1; colCount--) {
                    const itemsPerCol = Math.ceil(regularItems.length / colCount);
                    const columnWidths: number[] = [];
                    
                    // Calculate widths for each column
                    for (let col = 0; col < colCount; col++) {
                        const startIdx = col * itemsPerCol;
                        const endIdx = Math.min(startIdx + itemsPerCol, regularItems.length);
                        const columnItems = regularItems.slice(startIdx, endIdx);
                        
                        if (columnItems.length > 0) {
                            // All columns need space for indicator (2 chars)
                            const maxLength = Math.max(...columnItems.map(item => 
                                item.name.length + (item.isDirectory ? 1 : 0) + 2
                            ));
                            columnWidths.push(maxLength);
                        }
                    }
                    
                    const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + 
                                      (columnWidths.length - 1) * columnPadding;
                    
                    if (totalWidth <= availableWidth) {
                        this._columnCount = columnWidths.length;
                        this._itemsPerColumn = itemsPerCol;
                        break;
                    }
                }
            } else {
                this._columnCount = 1;
                this._itemsPerColumn = regularItems.length;
            }
            
            // File picker body
            const bodyElements = FilePickerBody({
                currentPath: this._currentPath,
                items: this._items,
                focusedIndex: this._focusedIndex,
                width: maxWidth,
                maxLines: bodyMaxLines,
                headerColor: this.isActive ? theme.colors.accent : undefined,
                error: this._error || undefined,
                enableColumns: true,
                mode: this.mode
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const displayPath = this.formatPathForDisplay(this._selectedPath, maxWidth);
            
            return (
                <Text>
                    <Transform transform={output => output}>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>
                            {this.icon} {this.label}: [</Text>
                        <Text color={!this._selectedPathValid ? 'red' : theme.colors.configValuesColor}>
                            {displayPath}
                        </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>]</Text>
                    </Transform>
                </Text>
            );
        }
    }
    
    getRequiredLines(maxWidth: number): number {
        if (!this._isControllingInput) {
            return 1; // Collapsed view
        }
        
        // Expanded view needs:
        // 1 line for header
        // 1 line for path
        // N lines for items (where N depends on actual item count and mode)
        
        // Check if we have items to display
        const hasError = !!this._error;
        const hasItems = this._items.length > 0;
        
        if (hasError || !hasItems) {
            // Header + path + error/empty message
            return 3;
        }
        
        // Calculate actual visible items
        // We show max 4 items in the body
        const bodyLines = Math.min(this._items.length, 4);
        
        // Check if we need an extra line for the └─ closing
        const hasConfirmItem = this._items.some(item => item.isConfirmAction);
        const needsClosingLine = this.mode === 'file' && !hasConfirmItem;
        
        // Total: header + path + body items + possible closing line
        return 2 + bodyLines + (needsClosingLine ? 1 : 0);
    }
    
    private formatPathForDisplay(fullPath: string, maxWidth: number): string {
        const prefix = `${this.icon} ${this.label}: [`;
        const suffix = ']';
        
        // Calculate visual width accounting for emojis
        let prefixVisualWidth = 0;
        for (const char of prefix) {
            const codePoint = char.codePointAt(0);
            prefixVisualWidth += (codePoint && codePoint >= 0x1F000) ? 2 : 1;
        }
        
        // Account for potential focus marker "▶ " (2 chars)
        // We need to be conservative to prevent line wrapping when selected
        const focusMarkerWidth = 2;
        const safeMaxWidth = maxWidth - focusMarkerWidth;
        
        const availableWidth = safeMaxWidth - prefixVisualWidth - suffix.length;
        
        if (fullPath.length <= availableWidth) {
            return fullPath;
        }
        
        // Truncate from the left with ellipsis
        const ellipsis = '…';
        const keepLength = availableWidth - ellipsis.length;
        return ellipsis + fullPath.slice(-keepLength);
    }
    
    onSelect(): void {
        // Visual feedback when selected
    }
    
    onDeselect(): void {
        // Remove visual feedback when deselected
    }
}