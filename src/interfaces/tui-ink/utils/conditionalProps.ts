/**
 * Helper utilities for conditional prop spreading to satisfy exactOptionalPropertyTypes
 */

/**
 * Conditionally include a property in an object only if the value is defined
 * This helps with exactOptionalPropertyTypes by not including the property at all
 * rather than setting it to undefined
 */
export function includeIf<T>(condition: boolean, props: T): T | {} {
    return condition ? props : {};
}

/**
 * Build props object excluding undefined values
 * This is useful for components where optional props shouldn't be passed as undefined
 */
export function buildProps<T extends Record<string, any>>(props: T): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) {
            result[key as keyof T] = value;
        }
    }
    return result;
}

/**
 * Helper specifically for Text component color props
 */
export function textColorProp(color: string | undefined): { color: string } | {} {
    return color !== undefined ? { color } : {};
}