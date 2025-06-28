import { describe, it, expect } from 'vitest';
import { ValidationRules } from '../../../src/interfaces/tui-ink/models/validation.js';

describe('ValidationRules', () => {
    describe('email validation', () => {
        it('should validate correct email addresses', () => {
            const validator = ValidationRules.email();
            
            expect(validator.validate('test@example.com')).toBe(true);
            expect(validator.validate('user.name@domain.co.uk')).toBe(true);
            expect(validator.validate('user+tag@example.com')).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            const validator = ValidationRules.email();
            
            expect(validator.validate('invalid')).toBe(false);
            expect(validator.validate('@example.com')).toBe(false);
            expect(validator.validate('user@')).toBe(false);
            expect(validator.validate('user @example.com')).toBe(false);
            expect(validator.validate('user@example')).toBe(false);
        });

        it('should use custom error message', () => {
            const validator = ValidationRules.email('Custom email error');
            expect(validator.message).toBe('Custom email error');
        });
    });

    describe('ipAddress validation', () => {
        it('should validate IPv4 addresses', () => {
            const validator = ValidationRules.ipAddress('v4');
            
            expect(validator.validate('192.168.1.1')).toBe(true);
            expect(validator.validate('10.0.0.0')).toBe(true);
            expect(validator.validate('255.255.255.255')).toBe(true);
            expect(validator.validate('0.0.0.0')).toBe(true);
        });

        it('should reject invalid IPv4 addresses', () => {
            const validator = ValidationRules.ipAddress('v4');
            
            expect(validator.validate('256.1.1.1')).toBe(false);
            expect(validator.validate('192.168.1')).toBe(false);
            expect(validator.validate('192.168.1.1.1')).toBe(false);
            expect(validator.validate('192.168.-1.1')).toBe(false);
            expect(validator.validate('text')).toBe(false);
        });

        it('should validate IPv6 addresses', () => {
            const validator = ValidationRules.ipAddress('v6');
            
            expect(validator.validate('::1')).toBe(true);
            expect(validator.validate('::')).toBe(true);
        });

        it('should validate both IPv4 and IPv6 when version is "both"', () => {
            const validator = ValidationRules.ipAddress('both');
            
            expect(validator.validate('192.168.1.1')).toBe(true);
            expect(validator.validate('::1')).toBe(true);
        });
    });

    describe('number validation', () => {
        it('should validate numbers', () => {
            const validator = ValidationRules.number();
            
            expect(validator.validate('42')).toBe(true);
            expect(validator.validate('3.14')).toBe(true);
            expect(validator.validate('-10')).toBe(true);
            expect(validator.validate('0')).toBe(true);
        });

        it('should reject non-numbers', () => {
            const validator = ValidationRules.number();
            
            expect(validator.validate('abc')).toBe(false);
            expect(validator.validate('12abc')).toBe(false);
            expect(validator.validate('')).toBe(false);
        });

        it('should validate number ranges', () => {
            const validator = ValidationRules.number({ min: 10, max: 100 });
            
            expect(validator.validate('50')).toBe(true);
            expect(validator.validate('10')).toBe(true);
            expect(validator.validate('100')).toBe(true);
            expect(validator.validate('5')).toBe(false);
            expect(validator.validate('150')).toBe(false);
        });

        it('should validate integer constraint', () => {
            const validator = ValidationRules.number({ integer: true });
            
            expect(validator.validate('42')).toBe(true);
            expect(validator.validate('3.14')).toBe(false);
            expect(validator.validate('10.0')).toBe(true); // 10.0 is considered integer
        });

        it('should generate appropriate error messages', () => {
            expect(ValidationRules.number().message).toBe('Must be a number');
            expect(ValidationRules.number({ integer: true }).message).toBe('Must be an integer');
            expect(ValidationRules.number({ min: 10 }).message).toBe('Must be a number greater than or equal to 10');
            expect(ValidationRules.number({ max: 100 }).message).toBe('Must be a number less than or equal to 100');
            expect(ValidationRules.number({ min: 10, max: 100 }).message).toBe('Must be a number between 10 and 100');
            expect(ValidationRules.number({ min: 10, max: 100, integer: true }).message).toBe('Must be an integer between 10 and 100');
        });
    });

    describe('customRegex validation', () => {
        it('should validate with regex pattern', () => {
            const validator = ValidationRules.customRegex(/^[A-Z]{3}$/);
            
            expect(validator.validate('ABC')).toBe(true);
            expect(validator.validate('XYZ')).toBe(true);
            expect(validator.validate('abc')).toBe(false);
            expect(validator.validate('AB')).toBe(false);
            expect(validator.validate('ABCD')).toBe(false);
        });

        it('should accept string pattern', () => {
            const validator = ValidationRules.customRegex('^\\d{3}$');
            
            expect(validator.validate('123')).toBe(true);
            expect(validator.validate('999')).toBe(true);
            expect(validator.validate('12')).toBe(false);
            expect(validator.validate('abc')).toBe(false);
        });

        it('should accept flags', () => {
            const validator = ValidationRules.customRegex('^hello$', 'i');
            
            expect(validator.validate('hello')).toBe(true);
            expect(validator.validate('HELLO')).toBe(true);
            expect(validator.validate('Hello')).toBe(true);
        });

        it('should handle invalid regex gracefully', () => {
            const validator = ValidationRules.customRegex('[');
            
            expect(validator.validate('anything')).toBe(false);
        });
    });
});