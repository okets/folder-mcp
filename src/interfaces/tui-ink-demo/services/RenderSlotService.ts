import type { IRenderSlotService } from './interfaces';

interface SlotAllocation {
    elementId: string;
    slots: number;
}

/**
 * Service that manages render slots for dynamic content.
 * Elements can claim slots to expand their visual space.
 * Containers can query total slots needed for proper sizing.
 */
export class RenderSlotService implements IRenderSlotService {
    private allocations = new Map<string, SlotAllocation[]>();
    
    /**
     * Claim a number of render slots for an element
     * @param elementId The element claiming slots
     * @param count Number of slots to claim
     * @param containerId The container to claim slots from
     */
    claimSlots(elementId: string, count: number, containerId: string): void {
        const containerAllocations = this.allocations.get(containerId) || [];
        
        // Remove any existing allocation for this element
        const filtered = containerAllocations.filter(a => a.elementId !== elementId);
        
        // Add new allocation if count > 0
        if (count > 0) {
            filtered.push({ elementId, slots: count });
        }
        
        this.allocations.set(containerId, filtered);
    }
    
    /**
     * Release all slots claimed by an element
     * @param elementId The element releasing slots
     * @param containerId The container to release slots from
     */
    releaseSlots(elementId: string, containerId: string): void {
        const containerAllocations = this.allocations.get(containerId) || [];
        const filtered = containerAllocations.filter(a => a.elementId !== elementId);
        
        if (filtered.length > 0) {
            this.allocations.set(containerId, filtered);
        } else {
            this.allocations.delete(containerId);
        }
    }
    
    /**
     * Get total slots claimed in a container
     * @param containerId The container to query
     * @returns Total number of slots claimed
     */
    getTotalSlots(containerId: string): number {
        const containerAllocations = this.allocations.get(containerId) || [];
        return containerAllocations.reduce((total, allocation) => total + allocation.slots, 0);
    }
    
    /**
     * Clear all allocations for a container
     * @param containerId The container to clear
     */
    clearContainer(containerId: string): void {
        this.allocations.delete(containerId);
    }
}