import { IFormNavigationService } from './interfaces';

export class FormNavigationService implements IFormNavigationService {
    private expandedNodeId: string | null = null;
    private selectedOptionIndex = 0;
    private nodeIds: string[] = [];
    private currentNodeIndex = 0;

    // Initialize with node IDs for navigation
    setNodeIds(nodeIds: string[]): void {
        this.nodeIds = nodeIds;
        if (this.currentNodeIndex >= nodeIds.length) {
            this.currentNodeIndex = Math.max(0, nodeIds.length - 1);
        }
    }

    // Node navigation
    getCurrentNodeId(): string | null {
        if (this.expandedNodeId) {
            return this.expandedNodeId;
        }
        if (this.nodeIds.length === 0) {
            return null;
        }
        return this.nodeIds[this.currentNodeIndex] || null;
    }

    expandNode(nodeId: string): void {
        this.expandedNodeId = nodeId;
        this.selectedOptionIndex = 0; // Reset selection when expanding
    }

    collapseNode(): void {
        this.expandedNodeId = null;
        this.selectedOptionIndex = 0;
    }

    isNodeExpanded(nodeId: string): boolean {
        return this.expandedNodeId === nodeId;
    }

    // Within-node navigation
    getSelectedOptionIndex(): number {
        return this.selectedOptionIndex;
    }

    selectOption(index: number): void {
        this.selectedOptionIndex = Math.max(0, index);
    }

    // Form-level navigation
    moveToNextNode(): void {
        if (this.expandedNodeId) {
            return; // Don't navigate when a node is expanded
        }
        this.currentNodeIndex = Math.min(this.nodeIds.length - 1, this.currentNodeIndex + 1);
    }

    moveToPreviousNode(): void {
        if (this.expandedNodeId) {
            return; // Don't navigate when a node is expanded
        }
        this.currentNodeIndex = Math.max(0, this.currentNodeIndex - 1);
    }

    // Helper methods
    getCurrentNodeIndex(): number {
        return this.currentNodeIndex;
    }

    setCurrentNodeIndex(index: number): void {
        this.currentNodeIndex = Math.max(0, Math.min(index, this.nodeIds.length - 1));
    }

    isAnyNodeExpanded(): boolean {
        return this.expandedNodeId !== null;
    }

    reset(): void {
        this.expandedNodeId = null;
        this.selectedOptionIndex = 0;
        this.currentNodeIndex = 0;
    }
}