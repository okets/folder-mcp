import React, { ReactElement } from 'react';
import { Text, Key } from 'ink';
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
}

export class FilePickerListItem implements IListItem {
    readonly selfConstrained = true as const;
    private _isControllingInput: boolean = false;
    private _currentPath: string;
    private _selectedPath: string;
    private _items: FileSystemItem[] = [];
    private _focusedIndex: number = 0;
    private _error: string | null = null;
    private _loadingComplete: boolean = false;
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
        this._error = null;
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
                } else if (this.mode === 'file' && entry.isDirectory()) {
                    continue;
                }
                
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
            
            this._error = null;
            this._loadingComplete = true;
        } catch (error) {
            this._error = error instanceof Error ? error.message : 'Unknown error';
            this._items = [];
            this._loadingComplete = true;
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
                } else if (this.mode === 'file' && entry.isDirectory()) {
                    continue;
                }
                
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
            
            this._error = null;
        } catch (error) {
            this._error = error instanceof Error ? error.message : 'Unknown error';
            this._items = [];
        }
    }
    
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) return false;
        
        if (key.escape) {
            // Cancel without saving
            this.onExit();
            return true;
        } else if (key.return) {
            const selectedItem = this._items[this._focusedIndex];
            if (selectedItem) {
                if (selectedItem.isDirectory) {
                    // Navigate into directory
                    this._currentPath = selectedItem.path;
                    this._focusedIndex = 0;
                    // Use sync loading for immediate feedback
                    this.loadDirectoryContentsSync();
                } else {
                    // Select file
                    this._selectedPath = selectedItem.path;
                    this.onPathChange?.(this._selectedPath);
                    this.onExit();
                }
            }
            return true;
        } else if (key.upArrow) {
            // Move selection up
            this._focusedIndex = this._focusedIndex > 0 
                ? this._focusedIndex - 1 
                : this._items.length - 1;
            return true;
        } else if (key.downArrow) {
            // Move selection down
            this._focusedIndex = this._focusedIndex < this._items.length - 1 
                ? this._focusedIndex + 1 
                : 0;
            return true;
        } else if (key.leftArrow) {
            // Go back/cancel
            this.onExit();
            return true;
        }
        
        return true; // Consume all input when in control
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (this._isControllingInput) {
            // Expanded view
            const elements: ReactElement[] = [];
            
            // Header with mode and hints
            const modeText = this.mode === 'folder' ? 'folder mode' : 
                            this.mode === 'file' ? 'file mode' : 
                            'file/folder mode';
            
            // Calculate if there's room for hints
            const baseText = `■ ${this.label} (${modeText}): `;
            const hints = '[enter] ✓ [esc] ✗';
            const totalLength = baseText.length + hints.length;
            const showHints = totalLength <= maxWidth;
            
            elements.push(
                <Text key="header">
                    <Text>■ </Text>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        {this.label} ({modeText}): 
                    </Text>
                    {showHints && (
                        <>
                            <Text color={theme.colors.textMuted}>[enter] </Text>
                            <Text color={theme.colors.successGreen}>✓</Text>
                            <Text color={theme.colors.textMuted}> [esc] </Text>
                            <Text color={theme.colors.warningOrange}>✗</Text>
                        </>
                    )}
                </Text>
            );
            
            // Calculate available lines for body
            // Allow up to 4 items if there's enough vertical space
            const availableForBody = maxLines ? maxLines - 2 : 4; // -1 for header, -1 for path
            const bodyMaxLines = Math.min(4, availableForBody); // Max 4 items
            
            // File picker body
            const bodyElements = FilePickerBody({
                currentPath: this._currentPath,
                items: this._items,
                focusedIndex: this._focusedIndex,
                width: maxWidth,
                maxLines: bodyMaxLines,
                headerColor: this.isActive ? theme.colors.accent : undefined,
                error: this._error || undefined
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const displayPath = this.formatPathForDisplay(this._selectedPath, maxWidth);
            
            return (
                <Text>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        {this.icon} {this.label}: [{displayPath}]
                    </Text>
                </Text>
            );
        }
    }
    
    getRequiredLines(maxWidth: number): number {
        if (!this._isControllingInput) {
            return 1; // Collapsed view
        }
        
        // Expanded view: header + path + up to 4 items
        return 6; // Maximum (1 header + 1 path + 4 items)
    }
    
    private formatPathForDisplay(fullPath: string, maxWidth: number): string {
        const prefix = `${this.icon} ${this.label}: [`;
        const suffix = ']';
        const availableWidth = maxWidth - prefix.length - suffix.length;
        
        if (fullPath.length <= availableWidth) {
            return fullPath;
        }
        
        // Truncate from the left with ellipsis
        const ellipsis = '...';
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