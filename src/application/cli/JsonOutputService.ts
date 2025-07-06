/**
 * JSON Output Service Implementation
 * 
 * Application service that provides consistent JSON output formatting
 * for automation and scripting across all CLI commands.
 */

export interface JsonOutputOptions {
  pretty?: boolean | undefined;
  includeMetadata?: boolean | undefined;
  timestampFormat?: 'iso' | 'unix' | 'human' | undefined;
}

export interface JsonResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    command: string;
    version: string;
    executionTime?: number;
  };
}

export class JsonOutputService {
  private startTime?: number;

  constructor() {}

  /**
   * Start timing for execution time tracking
   */
  startTiming(): void {
    this.startTime = Date.now();
  }

  /**
   * Format successful response as JSON
   */
  success<T>(data: T, options: JsonOutputOptions = {}): string {
    const response: JsonResponse<T> = {
      success: true,
      data
    };

    if (options.includeMetadata) {
      response.metadata = this.buildMetadata(options);
    }

    return this.formatJson(response, options);
  }

  /**
   * Format error response as JSON
   */
  error(message: string, code: string = 'UNKNOWN_ERROR', details?: any, options: JsonOutputOptions = {}): string {
    const response: JsonResponse = {
      success: false,
      error: {
        code,
        message,
        details
      }
    };

    if (options.includeMetadata) {
      response.metadata = this.buildMetadata(options);
    }

    return this.formatJson(response, options);
  }

  /**
   * Format configuration data for JSON output
   */
  formatConfigurationData(config: any, sources?: any[], activeProfile?: string, options: JsonOutputOptions = {}): string {
    const data = {
      configuration: config,
      ...(sources && { sources }),
      ...(activeProfile && { activeProfile })
    };

    return this.success(data, options);
  }

  /**
   * Format profile data for JSON output
   */
  formatProfileData(profiles: any[], activeProfile?: string, options: JsonOutputOptions = {}): string {
    const data = {
      profiles,
      activeProfile,
      totalProfiles: profiles.length
    };

    return this.success(data, options);
  }

  /**
   * Format search results for JSON output
   */
  formatSearchResults(results: any[], query: string, totalResults: number, processingTime: number, options: JsonOutputOptions = {}): string {
    const data = {
      query,
      results,
      totalResults,
      processingTime,
      pagination: {
        count: results.length,
        hasMore: results.length < totalResults
      }
    };

    return this.success(data, options);
  }

  /**
   * Format command operation results for JSON output
   */
  formatOperationResult(operation: string, result: any, options: JsonOutputOptions = {}): string {
    const data = {
      operation,
      result,
      timestamp: this.formatTimestamp(new Date(), options.timestampFormat)
    };

    return this.success(data, options);
  }

  /**
   * Format validation results for JSON output
   */
  formatValidationResult(valid: boolean, errors: string[] = [], warnings: string[] = [], options: JsonOutputOptions = {}): string {
    const data = {
      valid,
      summary: {
        errors: errors.length,
        warnings: warnings.length
      },
      issues: {
        errors,
        warnings
      }
    };

    return this.success(data, options);
  }

  /**
   * Format help information for JSON output
   */
  formatHelpData(helpInfo: any, options: JsonOutputOptions = {}): string {
    return this.success(helpInfo, options);
  }

  /**
   * Output JSON directly to console with error handling
   */
  output(jsonString: string): void {
    try {
      console.log(jsonString);
    } catch (error) {
      // Fallback to simple error output if JSON output fails
      console.error(JSON.stringify({
        success: false,
        error: {
          code: 'JSON_OUTPUT_ERROR',
          message: 'Failed to output JSON response',
          details: error instanceof Error ? error.message : String(error)
        }
      }));
    }
  }

  /**
   * Output success response and exit
   */
  outputSuccess<T>(data: T, options: JsonOutputOptions = {}): never {
    this.output(this.success(data, options));
    process.exit(0);
  }

  /**
   * Output error response and exit
   */
  outputError(message: string, code: string = 'UNKNOWN_ERROR', details?: any, options: JsonOutputOptions = {}): never {
    this.output(this.error(message, code, details, options));
    process.exit(1);
  }

  private buildMetadata(options: JsonOutputOptions): any {
    const metadata: any = {
      timestamp: this.formatTimestamp(new Date(), options.timestampFormat),
      command: process.argv.slice(2).join(' ') || 'unknown',
      version: '1.0.0' // Would be read from package.json
    };

    if (this.startTime) {
      metadata.executionTime = Date.now() - this.startTime;
    }

    return metadata;
  }

  private formatTimestamp(date: Date, format?: string): string {
    switch (format) {
      case 'unix':
        return Math.floor(date.getTime() / 1000).toString();
      case 'human':
        return date.toLocaleString();
      case 'iso':
      default:
        return date.toISOString();
    }
  }

  private formatJson(data: any, options: JsonOutputOptions): string {
    // Handle circular references gracefully
    const replacer = (key: string, value: any) => {
      if (value === null) return null;
      if (typeof value === 'object' && typeof value.constructor === 'function') {
        // Handle circular references by tracking seen objects
        const seen = new WeakSet();
        return JSON.parse(JSON.stringify(value, (k, v) => {
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) {
              return '[Circular]';
            }
            seen.add(v);
          }
          return v;
        }));
      }
      return value;
    };

    try {
      if (options.pretty !== false) {
        return JSON.stringify(data, null, 2);
      } else {
        return JSON.stringify(data);
      }
    } catch (error) {
      // If JSON.stringify fails due to circular references, use a fallback
      const seen = new WeakSet();
      const circularReplacer = (key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      };
      
      if (options.pretty !== false) {
        return JSON.stringify(data, circularReplacer, 2);
      } else {
        return JSON.stringify(data, circularReplacer);
      }
    }
  }

  /**
   * Utility method to check if JSON output is requested from CLI options
   */
  static isJsonRequested(options: any): boolean {
    return Boolean(options?.json);
  }

  /**
   * Utility method to create JSON output options from CLI options
   */
  static createOptionsFromCli(cliOptions: any): JsonOutputOptions {
    return {
      pretty: cliOptions?.compact !== undefined ? !cliOptions.compact : undefined,
      includeMetadata: Boolean(cliOptions?.metadata || cliOptions?.verbose),
      timestampFormat: cliOptions?.timestampFormat || 'iso'
    };
  }
}