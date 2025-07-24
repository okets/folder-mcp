/**
 * Validation state interfaces for ContainerListItem
 */

export interface ValidationResult {
    isValid: boolean;
    hasError: boolean;
    hasWarning: boolean;
    errorMessage?: string;
    warningMessage?: string;
}

export interface ValidationState {
    result: ValidationResult;
    onValidationChange?: (result: ValidationResult) => void;
}

export const createValidationResult = (
    isValid: boolean = true,
    errorMessage?: string,
    warningMessage?: string
): ValidationResult => {
    const result: ValidationResult = {
        isValid,
        hasError: !!errorMessage,
        hasWarning: !!warningMessage
    };
    
    if (errorMessage) {
        result.errorMessage = errorMessage;
    }
    
    if (warningMessage) {
        result.warningMessage = warningMessage;
    }
    
    return result;
};

export const DEFAULT_VALIDATION: ValidationResult = createValidationResult(true);