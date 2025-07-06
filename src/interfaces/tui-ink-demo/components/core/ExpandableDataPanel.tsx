import React from 'react';
import { GenericListPanel, GenericListPanelProps } from './GenericListPanel';

/**
 * ExpandableDataPanel - a panel that supports expandable items
 * This is a simple wrapper around GenericListPanel for now
 */
export interface ExpandableDataPanelProps extends GenericListPanelProps {
    // Additional props specific to expandable functionality can be added here
}

export const ExpandableDataPanel: React.FC<ExpandableDataPanelProps> = (props) => {
    // For now, just pass through to GenericListPanel
    // The expandable functionality is handled by the individual items
    return <GenericListPanel {...props} />;
};