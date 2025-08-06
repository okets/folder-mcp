import type { FolderStatus } from './folder-lifecycle-models.js';

/**
 * State machine for managing folder lifecycle transitions.
 * Ensures valid state transitions and tracks state history.
 */
export class FolderLifecycleStateMachine {
  private currentState: FolderStatus;
  private previousState: FolderStatus | null;

  // Define valid transitions
  private readonly validTransitions: Record<FolderStatus, FolderStatus[]> = {
    pending: ['scanning', 'error'],
    scanning: ['ready', 'active', 'error'], // Can go to active if no changes
    ready: ['indexing', 'error'],
    indexing: ['active', 'error'],
    active: ['scanning', 'error'],
    error: ['pending']
  };

  constructor(initialState: FolderStatus = 'pending') {
    this.currentState = initialState;
    this.previousState = null;
  }

  /**
   * Get the current state
   */
  getCurrentState(): FolderStatus {
    return this.currentState;
  }

  /**
   * Get the previous state
   */
  getPreviousState(): FolderStatus | null {
    return this.previousState;
  }

  /**
   * Check if a transition to the target state is allowed
   */
  canTransitionTo(targetState: FolderStatus): boolean {
    this.validateState(targetState);

    // Cannot transition to the same state
    if (this.currentState === targetState) {
      return false;
    }

    const allowedTransitions = this.validTransitions[this.currentState];
    return allowedTransitions.includes(targetState);
  }

  /**
   * Attempt to transition to a new state
   * @returns true if transition was successful, false otherwise
   */
  transitionTo(targetState: FolderStatus): boolean {
    this.validateState(targetState);

    if (!this.canTransitionTo(targetState)) {
      return false;
    }

    this.previousState = this.currentState;
    this.currentState = targetState;
    return true;
  }

  /**
   * Reset the state machine to initial state
   */
  reset(): void {
    this.currentState = 'pending';  // Fixed: should match constructor default
    this.previousState = null;
  }

  /**
   * Validate that a state is valid
   */
  private validateState(state: string): asserts state is FolderStatus {
    const validStates: FolderStatus[] = ['pending', 'scanning', 'ready', 'indexing', 'active', 'error'];
    if (!validStates.includes(state as FolderStatus)) {
      throw new Error(`Invalid state: ${state}`);
    }
  }
}