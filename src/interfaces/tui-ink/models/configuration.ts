// Configuration node types and interfaces

// Base configuration node interface
export interface IConfigurationNode<T = any> {
    id: string;
    label: string;
    description?: string;
    value: T;
    defaultValue: T;
    validation?: IValidationRule<T>[];
}

// Specific node types
export interface ITextInputNode extends IConfigurationNode<string> {
    type: 'text';
    placeholder?: string;
    multiline?: boolean;
    maxLength?: number;
    password?: boolean;
}

export interface INumberInputNode extends IConfigurationNode<number> {
    type: 'number';
    min?: number;
    max?: number;
    step?: number;
}

export interface IRadioGroupNode<T = string> extends IConfigurationNode<T> {
    type: 'radio';
    options: ISelectOption<T>[];
}

export interface ICheckboxListNode extends IConfigurationNode<string[]> {
    type: 'checkbox';
    options: ISelectOption<string>[];
}

export interface ISelectDropdownNode<T = string> extends IConfigurationNode<T> {
    type: 'select';
    options: ISelectOption<T>[];
    filterable?: boolean;
}

export interface IYesNoNode extends IConfigurationNode<boolean> {
    type: 'yesno';
}

// Supporting types
export interface ISelectOption<T = string> {
    value: T;
    label: string;
    description?: string;
    disabled?: boolean;
}

export interface IValidationRule<T> {
    validate: (value: T) => boolean;
    message: string;
}

// Union type for all nodes
export type ConfigurationNode = 
    | ITextInputNode 
    | INumberInputNode 
    | IRadioGroupNode 
    | ICheckboxListNode 
    | ISelectDropdownNode 
    | IYesNoNode;

// Type guards
export const isTextInputNode = (node: ConfigurationNode): node is ITextInputNode => 
    node.type === 'text';

export const isNumberInputNode = (node: ConfigurationNode): node is INumberInputNode => 
    node.type === 'number';

export const isRadioGroupNode = (node: ConfigurationNode): node is IRadioGroupNode => 
    node.type === 'radio';

export const isCheckboxListNode = (node: ConfigurationNode): node is ICheckboxListNode => 
    node.type === 'checkbox';

export const isSelectDropdownNode = (node: ConfigurationNode): node is ISelectDropdownNode => 
    node.type === 'select';

export const isYesNoNode = (node: ConfigurationNode): node is IYesNoNode => 
    node.type === 'yesno';