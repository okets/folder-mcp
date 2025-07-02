import { useEffect, useRef } from 'react';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';

interface UseRenderSlotsOptions {
    elementId: string;
    containerId: string;
    slots: number;
    enabled?: boolean;
}

/**
 * Hook that manages render slot allocation for an element
 * Automatically claims/releases slots based on enabled state
 */
export const useRenderSlots = ({
    elementId,
    containerId,
    slots,
    enabled = true
}: UseRenderSlotsOptions) => {
    const di = useDI();
    const renderSlotService = di.resolve(ServiceTokens.RenderSlotService);
    
    // Track previous values to detect changes
    const prevEnabled = useRef(enabled);
    const prevSlots = useRef(slots);
    
    useEffect(() => {
        if (enabled && slots > 0) {
            // Claim slots when enabled
            renderSlotService.claimSlots(elementId, slots, containerId);
        } else if (!enabled || slots === 0) {
            // Release slots when disabled or no slots needed
            renderSlotService.releaseSlots(elementId, containerId);
        }
        
        // Update refs
        prevEnabled.current = enabled;
        prevSlots.current = slots;
        
        // Cleanup on unmount
        return () => {
            renderSlotService.releaseSlots(elementId, containerId);
        };
    }, [elementId, containerId, slots, enabled, renderSlotService]);
    
    // Return total slots for the container
    const totalSlots = renderSlotService.getTotalSlots(containerId);
    
    return {
        totalSlots
    };
};