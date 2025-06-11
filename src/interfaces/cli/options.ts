/**
 * CLI Options Parser
 * 
 * Handles parsing and validation of CLI options.
 */

// Inline types since they are no longer exported from index.ts
export interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: any;
}

export interface CLICommandOptions {
  [key: string]: any;
}

export interface ParsedCLIOptions {
  [key: string]: any;
}

export class CLIOptionsParser {
  
  /**
   * Parse and validate CLI options against option definitions
   */
  static parseOptions(options: CLICommandOptions, optionDefinitions: CLIOption[]): ParsedCLIOptions {
    const parsed: ParsedCLIOptions = {};
    const errors: string[] = [];

    // Parse each defined option
    for (const definition of optionDefinitions) {
      const value = options[definition.name];
      
      if (value !== undefined) {
        try {
          parsed[definition.name] = this.parseValue(value, definition);
        } catch (error) {
          errors.push(`Invalid value for --${definition.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (definition.required) {
        errors.push(`Required option --${definition.name} is missing`);
      } else if (definition.default !== undefined) {
        parsed[definition.name] = definition.default;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Option parsing errors:\n  ${errors.join('\n  ')}`);
    }

    return parsed;
  }

  /**
   * Parse a single value according to its type definition
   */
  private static parseValue(value: any, definition: CLIOption): any {
    switch (definition.type) {
      case 'boolean':
        return Boolean(value);
      
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Expected number, got: ${value}`);
        }
        return num;
      
      case 'string':
        return String(value);
      
      case 'array':
        if (typeof value === 'string') {
          return value.split(',').map(item => item.trim()).filter(Boolean);
        }
        if (Array.isArray(value)) {
          return value;
        }
        throw new Error(`Expected array or comma-separated string, got: ${typeof value}`);
      
      default:
        return value;
    }
  }

  /**
   * Validate common option patterns
   */
  static validateCommonOptions(options: ParsedCLIOptions): string[] {
    const errors: string[] = [];

    // Validate port
    if (options.port !== undefined) {
      const port = Number(options.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('Port must be a number between 1 and 65535');
      }
    }

    // Validate batch size
    if (options.batchSize !== undefined) {
      const batchSize = Number(options.batchSize);
      if (isNaN(batchSize) || batchSize < 1 || batchSize > 1000) {
        errors.push('Batch size must be a number between 1 and 1000');
      }
    }

    // Validate chunk size
    if (options.chunkSize !== undefined) {
      const chunkSize = Number(options.chunkSize);
      if (isNaN(chunkSize) || chunkSize < 100 || chunkSize > 10000) {
        errors.push('Chunk size must be a number between 100 and 10000');
      }
    }

    // Validate overlap
    if (options.overlap !== undefined) {
      const overlap = Number(options.overlap);
      if (isNaN(overlap) || overlap < 0) {
        errors.push('Overlap must be a non-negative number');
      }
      if (options.chunkSize !== undefined && overlap >= options.chunkSize) {
        errors.push('Overlap must be less than chunk size');
      }
    }

    // Validate results count
    if (options.results !== undefined) {
      const results = Number(options.results);
      if (isNaN(results) || results < 1) {
        errors.push('Results count must be a positive number');
      }
    }

    // Validate debounce delay
    if (options.debounce !== undefined) {
      const debounce = Number(options.debounce);
      if (isNaN(debounce) || debounce < 100 || debounce > 60000) {
        errors.push('Debounce delay must be between 100 and 60000 milliseconds');
      }
    }

    // Validate transport
    if (options.transport !== undefined) {
      if (!['stdio', 'http'].includes(options.transport)) {
        errors.push('Transport must be either "stdio" or "http"');
      }
    }

    return errors;
  }
}
