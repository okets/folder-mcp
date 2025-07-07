/**
 * YAML Parser Implementation
 * 
 * Wraps js-yaml library with our interface for dependency injection.
 */

import { load, dump } from 'js-yaml';
import { IYamlParser } from '../../domain/config/ISchemaValidator.js';

export class YamlParser implements IYamlParser {
  async parse(content: string): Promise<any> {
    try {
      return load(content) || {};
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stringify(data: any): Promise<string> {
    try {
      return dump(data, {
        lineWidth: -1,  // No line wrapping
        noRefs: true,   // Don't use references
        sortKeys: true  // Sort keys for consistent output
      });
    } catch (error) {
      throw new Error(`Failed to stringify to YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}