/**
 * Validation state enum representing the three possible validation states
 */
export enum ValidationState {
    Valid = 'valid',
    Warning = 'warning',
    Error = 'error'
}

/**
 * Validation message interface containing state, message, and optional icon
 */
export interface ValidationMessage {
    state: ValidationState;
    message: string;
    icon?: string; // ✓, !, ✗
}

/**
 * Helper function to create a validation message
 */
export function createValidationMessage(
    state: ValidationState,
    message: string,
    icon?: string
): ValidationMessage {
    return {
        state,
        message,
        icon: icon || getDefaultIcon(state)
    };
}

/**
 * Get the default icon for a validation state
 */
export function getDefaultIcon(state: ValidationState): string {
    switch (state) {
        case ValidationState.Valid:
            return '✓';
        case ValidationState.Warning:
            return '!';
        case ValidationState.Error:
            return '✗';
    }
}