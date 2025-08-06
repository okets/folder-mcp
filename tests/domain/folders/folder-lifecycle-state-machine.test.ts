import { describe, it, expect, beforeEach } from 'vitest';
import { FolderLifecycleStateMachine } from '../../../src/domain/folders/folder-lifecycle-state-machine.js';
import type { FolderStatus } from '../../../src/domain/folders/folder-lifecycle-models.js';

describe('FolderLifecycleStateMachine', () => {
  let stateMachine: FolderLifecycleStateMachine;

  beforeEach(() => {
    stateMachine = new FolderLifecycleStateMachine();
  });

  describe('Initial State', () => {
    it('should start in pending state', () => {
      expect(stateMachine.getCurrentState()).toBe('pending');
    });

    it('should not have previous state initially', () => {
      expect(stateMachine.getPreviousState()).toBeNull();
    });
  });

  describe('Valid Transitions', () => {
    it('should transition from pending to scanning', () => {
      expect(stateMachine.getCurrentState()).toBe('pending');
      
      const result = stateMachine.transitionTo('scanning');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('scanning');
      expect(stateMachine.getPreviousState()).toBe('pending');
    });

    it('should transition from scanning to ready', () => {
      stateMachine.transitionTo('scanning');
      
      const result = stateMachine.transitionTo('ready');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('ready');
      expect(stateMachine.getPreviousState()).toBe('scanning');
    });

    it('should transition from active back to scanning', () => {
      stateMachine.transitionTo('scanning');
      stateMachine.transitionTo('ready');
      stateMachine.transitionTo('indexing');
      stateMachine.transitionTo('active');
      
      const result = stateMachine.transitionTo('scanning');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('scanning');
      expect(stateMachine.getPreviousState()).toBe('active');
    });

    it('should transition to error from any state', () => {
      const states: FolderStatus[] = ['pending', 'scanning', 'ready', 'indexing', 'active'];
      
      for (const fromState of states) {
        const sm = new FolderLifecycleStateMachine();
        // Set up the required state
        if (fromState === 'scanning') {
          sm.transitionTo('scanning');
        } else if (fromState === 'ready') {
          sm.transitionTo('scanning');
          sm.transitionTo('ready');
        } else if (fromState === 'indexing') {
          sm.transitionTo('scanning');
          sm.transitionTo('ready');
          sm.transitionTo('indexing');
        } else if (fromState === 'active') {
          sm.transitionTo('scanning');
          sm.transitionTo('ready');
          sm.transitionTo('indexing');
          sm.transitionTo('active');
        }
        
        const result = sm.transitionTo('error');
        expect(result).toBe(true);
        expect(sm.getCurrentState()).toBe('error');
        expect(sm.getPreviousState()).toBe(fromState);
      }
    });

    it('should transition from error back to pending', () => {
      stateMachine.transitionTo('error');
      
      const result = stateMachine.transitionTo('pending');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('pending');
      expect(stateMachine.getPreviousState()).toBe('error');
    });
  });

  describe('Invalid Transitions', () => {
    it('should allow transition from scanning to active (no changes scenario)', () => {
      stateMachine.transitionTo('scanning');
      const result = stateMachine.transitionTo('active');
      
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('active');
      expect(stateMachine.getPreviousState()).toBe('scanning');
    });

    it('should not transition from indexing to scanning', () => {
      stateMachine.transitionTo('scanning');
      stateMachine.transitionTo('ready');
      stateMachine.transitionTo('indexing');
      
      const result = stateMachine.transitionTo('scanning');
      
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('indexing');
      expect(stateMachine.getPreviousState()).toBe('ready');
    });

    it('should not transition from active to indexing', () => {
      stateMachine.transitionTo('scanning');
      stateMachine.transitionTo('ready');
      stateMachine.transitionTo('indexing');
      stateMachine.transitionTo('active');
      
      const result = stateMachine.transitionTo('indexing');
      
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('active');
    });

    it('should not transition to the same state', () => {
      const result = stateMachine.transitionTo('pending');
      
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('pending');
    });
  });

  describe('Transition Validation', () => {
    it('should validate if transition is allowed', () => {
      expect(stateMachine.canTransitionTo('scanning')).toBe(true);
      expect(stateMachine.canTransitionTo('error')).toBe(true);
      expect(stateMachine.canTransitionTo('ready')).toBe(false);
      expect(stateMachine.canTransitionTo('indexing')).toBe(false);
      expect(stateMachine.canTransitionTo('active')).toBe(false);
      expect(stateMachine.canTransitionTo('pending')).toBe(false);
    });

    it('should validate transitions from indexing state', () => {
      stateMachine.transitionTo('scanning');
      stateMachine.transitionTo('ready');
      stateMachine.transitionTo('indexing');
      
      expect(stateMachine.canTransitionTo('active')).toBe(true);
      expect(stateMachine.canTransitionTo('error')).toBe(true);
      expect(stateMachine.canTransitionTo('scanning')).toBe(false);
      expect(stateMachine.canTransitionTo('ready')).toBe(false);
      expect(stateMachine.canTransitionTo('indexing')).toBe(false);
    });

    it('should validate transitions from active state', () => {
      stateMachine.transitionTo('scanning');
      stateMachine.transitionTo('ready');
      stateMachine.transitionTo('indexing');
      stateMachine.transitionTo('active');
      
      expect(stateMachine.canTransitionTo('scanning')).toBe(true);
      expect(stateMachine.canTransitionTo('error')).toBe(true);
      expect(stateMachine.canTransitionTo('indexing')).toBe(false);
      expect(stateMachine.canTransitionTo('ready')).toBe(false);
      expect(stateMachine.canTransitionTo('active')).toBe(false);
    });

    it('should validate transitions from error state', () => {
      stateMachine.transitionTo('error');
      
      expect(stateMachine.canTransitionTo('pending')).toBe(true);
      expect(stateMachine.canTransitionTo('scanning')).toBe(false);
      expect(stateMachine.canTransitionTo('ready')).toBe(false);
      expect(stateMachine.canTransitionTo('indexing')).toBe(false);
      expect(stateMachine.canTransitionTo('active')).toBe(false);
      expect(stateMachine.canTransitionTo('error')).toBe(false);
    });
  });

  describe('State History', () => {
    it('should track state history correctly', () => {
      const history: FolderStatus[] = [];
      
      history.push(stateMachine.getCurrentState());
      stateMachine.transitionTo('scanning');
      history.push(stateMachine.getCurrentState());
      stateMachine.transitionTo('ready');
      history.push(stateMachine.getCurrentState());
      stateMachine.transitionTo('indexing');
      history.push(stateMachine.getCurrentState());
      
      expect(history).toEqual(['pending', 'scanning', 'ready', 'indexing']);
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
      stateMachine.transitionTo('scanning');
      stateMachine.transitionTo('ready');
      
      stateMachine.reset();
      
      expect(stateMachine.getCurrentState()).toBe('pending');
      expect(stateMachine.getPreviousState()).toBeNull();
    });
  });
});