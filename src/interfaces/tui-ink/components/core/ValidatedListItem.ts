import { IListItem } from './IListItem';
import { ValidationMessage, ValidationState } from '../../validation/ValidationState';
import { getValidationColor } from '../../utils/validationDisplay';

/**
 * Abstract base class for list items that support validation
 * Provides common validation state management and display logic
 */
export abstract class ValidatedListItem implements IListItem {
    // Abstract properties that must be implemented by subclasses
    abstract icon: string;
    abstract isActive: boolean;
    abstract readonly isControllingInput: boolean;
    abstract readonly selfConstrained: true;
    readonly isNavigable = true; // ValidatedListItems are interactive and navigable by default
    
    // Protected validation state
    protected _validationMessage: ValidationMessage | null = null;
    
    /**
     * Perform validation on the current value
     * Must be implemented by subclasses to define validation logic
     * @returns ValidationMessage if validation produces a message, null otherwise
     */
    protected abstract performValidation(): ValidationMessage | null;
    
    /**
     * Get the current validation message
     */
    public getValidationMessage(): ValidationMessage | null {
        return this._validationMessage;
    }
    
    /**
     * Trigger validation and update internal state
     */
    public validateValue(): void {
        const newValidation = this.performValidation();
        // Only update if performValidation returns a value
        // This allows async validation to preserve state
        if (newValidation !== null) {
            this._validationMessage = newValidation;
        }
    }
    
    /**
     * Set validation message directly (useful for pre-computed validation)
     */
    public setValidationMessage(message: ValidationMessage | null): void {
        this._validationMessage = message;
    }
    
    /**
     * Get the color for the item's bullet/icon based on validation state
     * @param defaultColor - The default color to use if no validation state
     * @returns The appropriate color for the current validation state
     */
    protected getBulletColor(defaultColor?: string): string | undefined {
        if (this._validationMessage) {
            return getValidationColor(this._validationMessage.state);
        }
        return defaultColor;
    }
    
    /**
     * Check if validation shows an error state
     */
    protected hasValidationError(): boolean {
        return this._validationMessage?.state === ValidationState.Error;
    }
    
    /**
     * Check if validation shows a warning state
     */
    protected hasValidationWarning(): boolean {
        return this._validationMessage?.state === ValidationState.Warning;
    }
    
    /**
     * Check if validation shows a valid state
     */
    protected hasValidationSuccess(): boolean {
        return this._validationMessage?.state === ValidationState.Valid;
    }
    
    // Abstract methods from IListItem that must be implemented by subclasses
    abstract render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[];
    abstract getRequiredLines(maxWidth: number, maxHeight?: number): number;
    abstract onEnter?(): void;
    abstract onExit?(): void;
    abstract handleInput?(input: string, key: import('ink').Key): boolean;
    abstract onSelect?(): void;
    abstract onDeselect?(): void;
}