// Simple validators for ConfigurationListItem
export const validators = {
    email: (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(value);
        return isValid 
            ? { isValid: true }
            : { isValid: false, error: 'Invalid email format' };
    },
    
    number: (min?: number, max?: number) => (value: string) => {
        const num = Number(value);
        if (isNaN(num)) {
            return { isValid: false, error: 'Must be a number' };
        }
        if (min !== undefined && num < min) {
            return { isValid: false, error: `Must be at least ${min}` };
        }
        if (max !== undefined && num > max) {
            return { isValid: false, error: `Must be at most ${max}` };
        }
        return { isValid: true };
    },
    
    ipv4: (value: string) => {
        const parts = value.split('.');
        if (parts.length !== 4) {
            return { isValid: false, error: 'Invalid IPv4 format' };
        }
        for (const part of parts) {
            const num = Number(part);
            if (isNaN(num) || num < 0 || num > 255) {
                return { isValid: false, error: 'Invalid IPv4 address' };
            }
        }
        return { isValid: true };
    },
    
    regex: (pattern: RegExp, errorMessage: string) => (value: string) => {
        const isValid = pattern.test(value);
        return isValid
            ? { isValid: true }
            : { isValid: false, error: errorMessage };
    },
    
    minLength: (min: number) => (value: string) => {
        const isValid = value.length >= min;
        return isValid
            ? { isValid: true }
            : { isValid: false, error: `Must be at least ${min} characters` };
    },
    
    password: (value: string) => {
        // Check minimum length
        if (value.length < 8) {
            return { isValid: false, error: 'Password must be at least 8 characters' };
        }
        
        // Check for at least one uppercase letter
        if (!/[A-Z]/.test(value)) {
            return { isValid: false, error: 'Password must contain an uppercase letter' };
        }
        
        // Check for at least one lowercase letter
        if (!/[a-z]/.test(value)) {
            return { isValid: false, error: 'Password must contain a lowercase letter' };
        }
        
        // Check for at least one number
        if (!/[0-9]/.test(value)) {
            return { isValid: false, error: 'Password must contain a number' };
        }
        
        // Check for at least one special character
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            return { isValid: false, error: 'Password must contain a special character' };
        }
        
        return { isValid: true };
    },
    
    passwordWithStrength: (value: string) => {
        // Basic validation - minimum length
        if (value.length < 4) {
            return { isValid: false, error: 'Password too short' };
        }
        
        // Count complexity criteria met
        let criteriaMet = 0;
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        
        if (hasUppercase) criteriaMet++;
        if (hasLowercase) criteriaMet++;
        if (hasNumber) criteriaMet++;
        if (hasSpecial) criteriaMet++;
        
        // Weak password - valid but shows warning
        if (value.length < 8 || criteriaMet < 3) {
            return { 
                isValid: true, 
                warning: 'Weak password'
            };
        }
        
        // Strong password
        if (value.length >= 12 && criteriaMet === 4) {
            return { 
                isValid: true,
                info: 'Strong password'
            };
        }
        
        // Medium strength - no message
        return { isValid: true };
    }
};