import type { IFocusChainService } from './interfaces.js';

/**
 * Service that manages the focus chain hierarchy.
 * Only one element can be "active" at a time.
 * When an element is active, its entire ancestor chain is "focused".
 */
export class FocusChainService implements IFocusChainService {
    private activeElementId: string | null = null;
    private parentMap = new Map<string, string>();
    
    /**
     * Set the currently active element
     * Only one element can be active in the entire application
     */
    setActive(elementId: string | null): void {
        this.activeElementId = elementId;
    }
    
    /**
     * Get the currently active element
     */
    getActive(): string | null {
        return this.activeElementId;
    }
    
    /**
     * Register a parent-child relationship
     * Used to build the focus chain
     */
    registerParent(childId: string, parentId: string): void {
        this.parentMap.set(childId, parentId);
    }
    
    /**
     * Get the focus chain: [active element, ...ancestors]
     * The entire chain is considered "focused"
     * If no active element, returns chain starting from 'app' (root)
     */
    getFocusChain(): string[] {
        // If there's an active element, return it and its ancestors
        if (this.activeElementId) {
            const chain: string[] = [this.activeElementId];
            let currentId = this.activeElementId;
            
            // Walk up the parent chain
            while (this.parentMap.has(currentId)) {
                const parentId = this.parentMap.get(currentId)!;
                chain.push(parentId);
                currentId = parentId;
            }
            
            return chain;
        }
        
        // If no active element, build chain from app down
        // This ensures we always have a valid focus chain
        const chain: string[] = [];
        
        // Start with app if it exists
        if (this.parentMap.has('navigation') && !this.parentMap.get('navigation')) {
            // navigation's parent is app (or undefined), so app is root
            chain.push('app');
        }
        
        return chain;
    }
    
    /**
     * Check if an element is in the focus chain
     * (either active or an ancestor of the active element)
     */
    isInFocusChain(elementId: string): boolean {
        return this.getFocusChain().includes(elementId);
    }
    
    /**
     * Clear parent registration for an element
     * Called when element is unmounted
     */
    unregisterElement(elementId: string): void {
        // Remove as parent of any children
        for (const [childId, parentId] of this.parentMap.entries()) {
            if (parentId === elementId) {
                this.parentMap.delete(childId);
            }
        }
        
        // Remove own parent registration
        this.parentMap.delete(elementId);
        
        // If this was the active element, clear active state
        if (this.activeElementId === elementId) {
            this.activeElementId = null;
        }
    }
}