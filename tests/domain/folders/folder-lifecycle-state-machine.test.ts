import { describe, it, expect, beforeEach } from 'vitest';
import { FolderLifecycleStateMachine } from '../../../src/domain/folders/folder-lifecycle-state-machine.js';
import type { FolderStatus } from '../../../src/domain/folders/folder-lifecycle-models.js';

describe('FolderLifecycleStateMachine', () => {
  let stateMachine: FolderLifecycleStateMachine;

  beforeEach(() => {
    stateMachine = new FolderLifecycleStateMachine();
  });

  describe('Initial State', () => {
    it('should start in scanning state', () => {
      expect(stateMachine.getCurrentState()).toBe('scanning');
    });

    it('should not have previous state initially', () => {
      expect(stateMachine.getPreviousState()).toBeNull();
    });
  });

  describe('Valid Transitions', () => {
    it('should transition from scanning to indexing', () => {
      expect(stateMachine.getCurrentState()).toBe('scanning');
      
      const result = stateMachine.transitionTo('indexing');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('indexing');
      expect(stateMachine.getPreviousState()).toBe('scanning');
    });

    it('should transition from indexing to active', () => {
      stateMachine.transitionTo('indexing');
      
      const result = stateMachine.transitionTo('active');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('active');
      expect(stateMachine.getPreviousState()).toBe('indexing');
    });

    it('should transition from active back to scanning', () => {
      stateMachine.transitionTo('indexing');
      stateMachine.transitionTo('active');
      
      const result = stateMachine.transitionTo('scanning');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('scanning');
      expect(stateMachine.getPreviousState()).toBe('active');
    });

    it('should transition to error from any state', () => {
      const states: FolderStatus[] = ['scanning', 'indexing', 'active'];
      
      for (const fromState of states) {
        const sm = new FolderLifecycleStateMachine();
        if (fromState !== 'scanning') {
          sm.transitionTo('indexing');
          if (fromState === 'active') {
            sm.transitionTo('active');
          }
        }
        
        const result = sm.transitionTo('error');
        expect(result).toBe(true);
        expect(sm.getCurrentState()).toBe('error');
        expect(sm.getPreviousState()).toBe(fromState);
      }
    });

    it('should transition from error back to scanning', () => {
      stateMachine.transitionTo('error');
      
      const result = stateMachine.transitionTo('scanning');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('scanning');
      expect(stateMachine.getPreviousState()).toBe('error');
    });
  });

  describe('Invalid Transitions', () => {
    it('should allow transition from scanning to active (no changes scenario)', () => {
      const result = stateMachine.transitionTo('active');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('active');
      expect(stateMachine.getPreviousState()).toBe('scanning');
    });

    it('should not transition from indexing to scanning', () => {
      stateMachine.transitionTo('indexing');
      
      const result = stateMachine.transitionTo('scanning');
      
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('indexing');
      expect(stateMachine.getPreviousState()).toBe('scanning');
    });

    it('should not transition from active to indexing', () => {
      stateMachine.transitionTo('indexing');
      stateMachine.transitionTo('active');
      
      const result = stateMachine.transitionTo('indexing');
      
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('active');
    });

    it('should not transition to the same state', () => {
      const result = stateMachine.transitionTo('scanning');
      
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('scanning');
    });
  });

  describe('Transition Validation', () => {
    it('should validate if transition is allowed', () => {
      expect(stateMachine.canTransitionTo('indexing')).toBe(true);
      expect(stateMachine.canTransitionTo('active')).toBe(true); // Now allowed
      expect(stateMachine.canTransitionTo('error')).toBe(true);
      expect(stateMachine.canTransitionTo('scanning')).toBe(false);
    });

    it('should validate transitions from indexing state', () => {
      stateMachine.transitionTo('indexing');
      
      expect(stateMachine.canTransitionTo('active')).toBe(true);
      expect(stateMachine.canTransitionTo('error')).toBe(true);
      expect(stateMachine.canTransitionTo('scanning')).toBe(false);
      expect(stateMachine.canTransitionTo('indexing')).toBe(false);
    });

    it('should validate transitions from active state', () => {
      stateMachine.transitionTo('indexing');
      stateMachine.transitionTo('active');
      
      expect(stateMachine.canTransitionTo('scanning')).toBe(true);
      expect(stateMachine.canTransitionTo('error')).toBe(true);
      expect(stateMachine.canTransitionTo('indexing')).toBe(false);
      expect(stateMachine.canTransitionTo('active')).toBe(false);
    });

    it('should validate transitions from error state', () => {
      stateMachine.transitionTo('error');
      
      expect(stateMachine.canTransitionTo('scanning')).toBe(true);
      expect(stateMachine.canTransitionTo('indexing')).toBe(false);
      expect(stateMachine.canTransitionTo('active')).toBe(false);
      expect(stateMachine.canTransitionTo('error')).toBe(false);
    });
  });

  describe('State History', () => {
    it('should track state history correctly', () => {
      const history: FolderStatus[] = [];
      
      history.push(stateMachine.getCurrentState());
      stateMachine.transitionTo('indexing');
      history.push(stateMachine.getCurrentState());
      stateMachine.transitionTo('active');
      history.push(stateMachine.getCurrentState());
      stateMachine.transitionTo('scanning');
      history.push(stateMachine.getCurrentState());
      
      expect(history).toEqual(['scanning', 'indexing', 'active', 'scanning']);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid state in transitionTo', () => {
      expect(() => {
        // @ts-expect-error Testing invalid state
        stateMachine.transitionTo('invalid-state');
      }).toThrow('Invalid state: invalid-state');
    });

    it('should throw error for invalid state in canTransitionTo', () => {
      expect(() => {
        // @ts-expect-error Testing invalid state
        stateMachine.canTransitionTo('invalid-state');
      }).toThrow('Invalid state: invalid-state');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      stateMachine.transitionTo('indexing');
      stateMachine.transitionTo('active');
      
      stateMachine.reset();
      
      expect(stateMachine.getCurrentState()).toBe('scanning');
      expect(stateMachine.getPreviousState()).toBeNull();
    });
  });
});