/**
 * Email validation bug test
 * 
 * This test demonstrates the current email validation bug where
 * clearly invalid emails pass validation. This should FAIL initially
 * and PASS after we fix the email validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurationComponent } from '../../../src/config/ConfigurationComponent';
import { IConfigManager } from '../../../src/domain/config/IConfigManager';

// Mock config manager
const mockConfigManager: IConfigManager = {
    get: vi.fn(),
    set: vi.fn(),
    load: vi.fn(),
    getAll: vi.fn(),
    validate: vi.fn(),
    getSchema: vi.fn(),
    isLoaded: vi.fn(),
    reload: vi.fn()
};

describe('Email Validation Bug Test', () => {
    let configComponent: ConfigurationComponent;

    beforeEach(() => {
        vi.clearAllMocks();
        configComponent = new ConfigurationComponent(mockConfigManager);
    });

    it('should REJECT clearly invalid email addresses', async () => {
        // This email is clearly invalid but currently passes validation
        const invalidEmail = 'not-an-email@:;;d.cd;d';
        
        // Add email validation rule to ConfigurationComponent
        // (This will be done when we implement the ValidationRegistry)
        
        // This test should FAIL initially (validation incorrectly passes)
        // and PASS after we fix the email validation
        const result = await configComponent.validate('user.email', invalidEmail);
        
        // This should be false, but currently the TUI validator returns true
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0]?.message).toMatch(/invalid.*email/i);
    });

    it('should ACCEPT valid email addresses', async () => {
        const validEmails = [
            'user@example.com',
            'test.email@domain.co.uk',
            'user+tag@example.org'
        ];
        
        for (const email of validEmails) {
            const result = await configComponent.validate('user.email', email);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        }
    });

    it('should demonstrate TUI validator bug directly', async () => {
        // Import TUI validators directly to show the bug
        const { validators } = await import('../../../src/interfaces/tui-ink/utils/validators');
        
        // This shows the bug in the TUI validator itself
        const result = validators.email('not-an-email@:;;d.cd;d');
        
        // Currently this passes (bug), should fail after fix
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
    });
});