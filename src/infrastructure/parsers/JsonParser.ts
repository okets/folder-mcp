/**
 * JSON Parser Implementation
 * 
 * Wraps native JSON with our interface for dependency injection.
 */

import { IJsonParser } from '../../domain/config/ISchemaValidator.js';

export class JsonParser implements IJsonParser {
  parse(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  stringify(data: any, pretty: boolean = false): string {
    try {
      return JSON.stringify(data, null, pretty ? 2 : 0);
    } catch (error) {
      throw new Error(`Failed to stringify to JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}