/**
 * YAML Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { YamlParser } from '../../../../src/infrastructure/parsers/YamlParser.js';

describe('YamlParser', () => {
  let parser: YamlParser;

  beforeEach(() => {
    parser = new YamlParser();
  });

  describe('parse', () => {
    it('should parse simple YAML', async () => {
      const yaml = `
theme: dark
logLevel: info
developmentEnabled: true
`;

      const result = await parser.parse(yaml);

      expect(result).toEqual({
        theme: 'dark',
        logLevel: 'info',
        developmentEnabled: true
      });
    });

    it('should parse nested YAML', async () => {
      const yaml = `
ui:
  theme: dark
  animations: true
server:
  port: 3000
`;

      const result = await parser.parse(yaml);

      expect(result).toEqual({
        ui: {
          theme: 'dark',
          animations: true
        },
        server: {
          port: 3000
        }
      });
    });

    it('should parse arrays', async () => {
      const yaml = `
fileExtensions:
  - .txt
  - .md
  - .pdf
`;

      const result = await parser.parse(yaml);

      expect(result.fileExtensions).toEqual(['.txt', '.md', '.pdf']);
    });

    it('should handle empty YAML', async () => {
      const result = await parser.parse('');
      expect(result).toEqual({});
    });

    it('should throw on invalid YAML', async () => {
      const invalidYaml = `
theme: dark
  invalid: indentation
`;

      await expect(parser.parse(invalidYaml)).rejects.toThrow('Failed to parse YAML');
    });
  });

  describe('stringify', () => {
    it('should stringify simple objects', async () => {
      const data = {
        theme: 'dark',
        logLevel: 'info',
        developmentEnabled: true
      };

      const result = await parser.stringify(data);

      expect(result).toContain('theme: dark');
      expect(result).toContain('logLevel: info');
      expect(result).toContain('developmentEnabled: true');
    });

    it('should stringify nested objects', async () => {
      const data = {
        ui: {
          theme: 'dark',
          animations: true
        }
      };

      const result = await parser.stringify(data);

      expect(result).toContain('ui:');
      expect(result).toContain('theme: dark');
      expect(result).toContain('animations: true');
    });

    it('should stringify arrays', async () => {
      const data = {
        fileExtensions: ['.txt', '.md', '.pdf']
      };

      const result = await parser.stringify(data);

      expect(result).toContain('fileExtensions:');
      expect(result).toContain('- .txt');
      expect(result).toContain('- .md');
      expect(result).toContain('- .pdf');
    });

    it('should sort keys for consistent output', async () => {
      const data = {
        zed: 'last',
        alpha: 'first',
        beta: 'middle'
      };

      const result = await parser.stringify(data);
      const lines = result.split('\n').filter(line => line.trim());

      expect(lines[0]).toContain('alpha');
      expect(lines[1]).toContain('beta');
      expect(lines[2]).toContain('zed');
    });
  });
});