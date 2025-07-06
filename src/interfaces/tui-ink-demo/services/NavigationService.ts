import { INavigationService } from './interfaces';
import { NavigationState, FocusedPanel } from '../models/types';

export class NavigationService implements INavigationService {
    private state: NavigationState = {
        focusedPanel: 'config',
        selectedIndices: {
            config: 0,
            status: 0
        }
    };

    getState(): NavigationState {
        return { ...this.state };
    }

    switchFocus(): void {
        this.state.focusedPanel = this.state.focusedPanel === 'config' ? 'status' : 'config';
    }

    moveSelection(panel: FocusedPanel, direction: 'up' | 'down'): void {
        const currentIndex = this.state.selectedIndices[panel];
        
        if (direction === 'up') {
            this.state.selectedIndices[panel] = Math.max(0, currentIndex - 1);
        } else {
            // In a real implementation, we'd need to know the max items
            // For now, we'll just increment (the UI will handle bounds)
            this.state.selectedIndices[panel] = currentIndex + 1;
        }
    }

    getSelectedIndex(panel: FocusedPanel): number {
        return this.state.selectedIndices[panel];
    }
}