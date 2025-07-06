import type { IValidationService } from './interfaces';
import type { IValidationResult } from '../models/validation';
import type { IValidationRule } from '../models/configuration';

export class ValidationService implements IValidationService {
    private registeredRules = new Map<string, IValidationRule<any>>();

    registerRule<T>(rule: IValidationRule<T>): void {
        // Generate a unique key for the rule
        const key = `${rule.validate.toString()}_${rule.message}`;
        this.registeredRules.set(key, rule);
    }

    validate<T>(value: T, rules: IValidationRule<T>[]): IValidationResult {
        const errors: string[] = [];

        for (const rule of rules) {
            try {
                if (!rule.validate(value)) {
                    errors.push(rule.message);
                }
            } catch (error) {
                // Handle validation errors gracefully
                errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}