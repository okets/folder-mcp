export enum ValidationErrorCode {
  // Model validation errors
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_INCOMPATIBLE = 'MODEL_INCOMPATIBLE',
  MODEL_PARAMETERS_INVALID = 'MODEL_PARAMETERS_INVALID',
  
  // Numeric validation errors
  CHUNK_SIZE_INVALID = 'CHUNK_SIZE_INVALID',
  OVERLAP_INVALID = 'OVERLAP_INVALID',
  BATCH_SIZE_INVALID = 'BATCH_SIZE_INVALID',
  WORKER_COUNT_INVALID = 'WORKER_COUNT_INVALID',
  MEMORY_LIMIT_INVALID = 'MEMORY_LIMIT_INVALID',
  
  // Path validation errors
  FOLDER_NOT_FOUND = 'FOLDER_NOT_FOUND',
  FOLDER_NOT_READABLE = 'FOLDER_NOT_READABLE',
  CACHE_DIR_INVALID = 'CACHE_DIR_INVALID',
  PATH_INVALID = 'PATH_INVALID',
  
  // Network validation errors
  PORT_IN_USE = 'PORT_IN_USE',
  PORT_INVALID = 'PORT_INVALID',
  PORT_BIND_FAILED = 'PORT_BIND_FAILED',
  
  // General validation errors
  CONFIG_INVALID = 'CONFIG_INVALID',
  VALIDATION_FAILED = 'VALIDATION_FAILED'
}

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  field?: string;
  value?: any;
  fix?: string;
  severity: 'error' | 'warning';
}

export class ValidationError extends Error {
  constructor(
    public code: ValidationErrorCode,
    message: string,
    public field?: string,
    public value?: any,
    public fix?: string,
    public severity: 'error' | 'warning' = 'error'
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  toJSON(): { code: ValidationErrorCode; message: string; field?: string; value?: any; fix?: string; severity: 'error' | 'warning' } {
    return {
      code: this.code,
      message: this.message,
      field: this.field,
      value: this.value,
      fix: this.fix,
      severity: this.severity
    };
  }
}

export class ValidationResult {
  constructor(
    public isValid: boolean,
    public errors: ValidationError[] = [],
    public warnings: ValidationError[] = [],
    public config?: any
  ) {}

  static success(config: any): ValidationResult {
    return new ValidationResult(true, [], [], config);
  }

  static failure(errors: ValidationError[], warnings: ValidationError[] = []): ValidationResult {
    return new ValidationResult(false, errors, warnings);
  }

  addError(error: ValidationError): void {
    this.errors.push(error);
    this.isValid = false;
  }

  addWarning(warning: ValidationError): void {
    this.warnings.push(warning);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getErrorMessages(): string[] {
    return this.errors.map(error => error.message);
  }

  getWarningMessages(): string[] {
    return this.warnings.map(warning => warning.message);
  }

  getFixes(): string[] {
    return this.errors
      .filter(error => error.fix)
      .map(error => error.fix as string);
  }
} 