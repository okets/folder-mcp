/**
 * FilePickerListItem Wrapper with FMDM Integration
 * 
 * This wrapper component provides FMDM WebSocket validation to FilePickerListItem
 * by using the FMDMContext hooks and passing the operations as props.
 */

import React from 'react';
import { FilePickerListItem, FilePickerMode } from './FilePickerListItem';
import { useFMDMOperations, useIsDaemonConnected } from '../../contexts/FMDMContext';
import { FMDMValidationAdapter } from '../../services/FMDMValidationAdapter';

interface FilePickerListItemWrapperProps {
    icon: string;
    label: string;
    initialPath: string;
    isActive: boolean;
    mode?: FilePickerMode;
    onPathChange?: (newPath: string) => void;
    filterPatterns?: string[];
    onChange?: () => void;
    showHiddenFiles?: boolean;
}

/**
 * Wrapper component that provides FMDM operations to FilePickerListItem
 */
export const FilePickerListItemWrapper: React.FC<FilePickerListItemWrapperProps> = ({
    icon,
    label,
    initialPath,
    isActive,
    mode = 'both',
    onPathChange,
    filterPatterns,
    onChange,
    showHiddenFiles = false
}) => {
    // Get FMDM operations from context
    const fmdmOperations = useFMDMOperations();
    const isDaemonConnected = useIsDaemonConnected();

    // Create validation adapter
    const validationAdapter = React.useMemo(() => {
        return new FMDMValidationAdapter(fmdmOperations, isDaemonConnected);
    }, [fmdmOperations, isDaemonConnected]);

    // Create FilePickerListItem with FMDM validation adapter
    const filePickerItem = React.useMemo(() => {
        return new FilePickerListItem(
            icon,
            label,
            initialPath,
            isActive,
            mode,
            onPathChange,
            filterPatterns,
            onChange,
            showHiddenFiles,
            validationAdapter
        );
    }, [
        icon,
        label,
        initialPath,
        isActive,
        mode,
        onPathChange,
        filterPatterns,
        onChange,
        showHiddenFiles,
        validationAdapter
    ]);

    // Update the item when props change
    React.useEffect(() => {
        // Update internal state based on prop changes
        // Note: FilePickerListItem doesn't expose update methods, so we rely on recreation via useMemo
    }, [filePickerItem]);

    // Render the FilePickerListItem
    // Note: This is a bit unusual because FilePickerListItem is designed to be instantiated
    // rather than used as a React component. For proper integration, we'd need to refactor
    // FilePickerListItem to be a proper React component or create a bridge.
    
    // For now, we'll return a placeholder that explains the integration pattern
    return React.createElement('text', {}, 'FilePickerListItem with FMDM integration');
};

/**
 * Hook to create a FilePickerListItem with FMDM operations
 * 
 * This hook can be used in components that need to create FilePickerListItem instances
 * with FMDM validation capabilities.
 */
export const useFilePickerWithFMDM = (
    icon: string,
    label: string,
    initialPath: string,
    isActive: boolean,
    mode: FilePickerMode = 'both',
    onPathChange?: (newPath: string) => void,
    filterPatterns?: string[],
    onChange?: () => void,
    showHiddenFiles: boolean = false
): FilePickerListItem => {
    const fmdmOperations = useFMDMOperations();
    const isDaemonConnected = useIsDaemonConnected();

    // Create validation adapter
    const validationAdapter = React.useMemo(() => {
        return new FMDMValidationAdapter(fmdmOperations, isDaemonConnected);
    }, [fmdmOperations, isDaemonConnected]);

    return React.useMemo(() => {
        return new FilePickerListItem(
            icon,
            label,
            initialPath,
            isActive,
            mode,
            onPathChange,
            filterPatterns,
            onChange,
            showHiddenFiles,
            validationAdapter
        );
    }, [
        icon,
        label,
        initialPath,
        isActive,
        mode,
        onPathChange,
        filterPatterns,
        onChange,
        showHiddenFiles,
        validationAdapter
    ]);
};