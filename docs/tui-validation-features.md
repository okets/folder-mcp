# TUI TextInput Validation Features

## Overview
The TUI framework now includes comprehensive validation support for TextInput components, allowing you to validate user input with built-in validators or custom validation rules.

## Built-in Validators

### 1. Email Validation
```typescript
ValidationRules.email(message?: string)
```
- Validates email addresses using a simple but effective regex pattern
- Default error: "Invalid email format"

### 2. IP Address Validation
```typescript
ValidationRules.ipAddress(version: 'v4' | 'v6' | 'both', message?: string)
```
- Validates IPv4 addresses (e.g., 192.168.1.1)
- Validates IPv6 addresses (e.g., ::1)
- Can validate both formats with `version: 'both'`
- Default error: "Invalid IPv4/v6 address"

### 3. Number Validation
```typescript
ValidationRules.number(options?: { min?: number; max?: number; integer?: boolean }, message?: string)
```
- Validates numeric input
- Supports min/max constraints
- Can enforce integer-only values
- Dynamic error messages based on constraints

### 4. Custom Regex Validation
```typescript
ValidationRules.customRegex(pattern: string | RegExp, flags?: string, message?: string)
```
- Validates against any regular expression
- Supports regex flags (e.g., 'i' for case-insensitive)
- Default error: "Does not match required pattern"

### 5. Existing Validators
- `required()` - Ensures non-empty values
- `minLength()` / `maxLength()` - String length constraints
- `range()` - Numeric range validation
- `pattern()` - Regex pattern matching
- `portNumber()` - Valid port numbers (1024-65535)
- `path()` - Basic path validation

## Usage Example

```typescript
const configNodes: ConfigurationNode[] = [
    {
        id: 'server-port',
        type: 'text',
        label: 'Server Port',
        description: 'Port number for the MCP server',
        value: '3000',
        validation: [
            ValidationRules.number({ min: 1024, max: 65535, integer: true })
        ]
    },
    {
        id: 'admin-email',
        type: 'text',
        label: 'Administrator Email',
        description: 'Email address for system notifications',
        value: '',
        validation: [
            ValidationRules.required(),
            ValidationRules.email()
        ]
    },
    {
        id: 'api-key',
        type: 'text',
        label: 'API Key',
        description: 'API key for external services',
        value: '',
        validation: [
            ValidationRules.customRegex(
                /^[a-zA-Z0-9]{32}$/, 
                undefined, 
                'API key must be exactly 32 alphanumeric characters'
            )
        ]
    }
];
```

## Visual Feedback

### Error Display
- Validation errors appear below the input field in red
- Format: `✗ Error message`
- Errors are shown in real-time as the user types

### Collapsed State Indicator
- Invalid saved values show a red `[!]` indicator in collapsed state
- Helps users quickly identify fields that need attention

### Input Blocking
- Pressing Enter with invalid input prevents saving
- User must fix validation errors before the value can be saved
- Escape key cancels changes and clears validation errors

## Validation Flow

1. **Real-time Validation**: As the user types, validation runs automatically
2. **Save Validation**: When Enter is pressed, validation is checked before saving
3. **Error Display**: Validation errors are shown immediately below the input
4. **Visual Indicators**: Both expanded and collapsed states show validation status

## Custom Validation

You can create custom validation rules by implementing the `IValidationRule` interface:

```typescript
const customValidator: IValidationRule<string> = {
    validate: (value: string) => {
        // Your validation logic here
        return value.startsWith('PREFIX_');
    },
    message: 'Value must start with PREFIX_'
};
```

## Best Practices

1. **Combine Validators**: Use multiple validators for comprehensive validation
2. **Clear Messages**: Provide specific, actionable error messages
3. **Progressive Enhancement**: Validation doesn't break existing functionality
4. **User-Friendly**: Real-time feedback helps users correct errors quickly