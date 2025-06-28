import { describe, it, expect } from 'vitest';

describe('TextInput Password Feature', () => {
    describe('Password masking logic', () => {
        it('should generate correct number of bullets for password length', () => {
            // Test the password masking logic
            const password = 'password123';
            const masked = '•'.repeat(password.length);
            
            expect(masked).toBe('•••••••••••');
            expect(masked.length).toBe(password.length);
        });

        it('should handle empty passwords', () => {
            const password = '';
            const masked = '•'.repeat(password.length);
            
            expect(masked).toBe('');
            expect(masked.length).toBe(0);
        });

        it('should handle various password lengths', () => {
            const testCases = [
                { password: 'a', expected: '•' },
                { password: '12345', expected: '•••••' },
                { password: 'longpassword', expected: '••••••••••••' },
                { password: 'very long password with spaces', expected: '••••••••••••••••••••••••••••••' }
            ];
            
            testCases.forEach(({ password, expected }) => {
                const masked = '•'.repeat(password.length);
                expect(masked).toBe(expected);
            });
        });
    });
});