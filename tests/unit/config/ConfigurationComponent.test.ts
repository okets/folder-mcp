/**
 * Unit tests for ConfigurationComponent validation
 * 
 * Tests that the configuration component uses the same validation rules as TUI
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurationComponent } from '../../../src/config/ConfigurationComponent';
import { IConfigManager } from '../../../src/domain/config/IConfigManager';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

// Mock fs module
vi.mock('fs', () => ({
    existsSync: vi.fn(),
    statSync: vi.fn()
}));


// Mock config manager
const mockConfigManager: IConfigManager = {
    get: vi.fn(),
    set: vi.fn(),
    load: vi.fn(),
    getAll: vi.fn(),
    validate: vi.fn(),
    getSchema: vi.fn(),
    isLoaded: vi.fn(),
    reload: vi.fn()
};

describe('ConfigurationComponent', () => {
    let configComponent: ConfigurationComponent;
    let mockFs: any;
    let mockStatSync: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFs = vi.mocked(existsSync);
        mockStatSync = vi.mocked(statSync);
        configComponent = new ConfigurationComponent(mockConfigManager);
    });

    describe('Theme validation', () => {
        it('should accept valid themes', async () => {
            const validThemes = ['auto', 'light', 'dark', 'light-optimized', 'dark-optimized', 'default', 'minimal'];
            
            for (const theme of validThemes) {
                const result = await configComponent.validate('theme', theme);
                expect(result.valid).toBe(true);
                expect(result.errors).toBeUndefined();
            }
        });

        it('should reject invalid themes', async () => {
            const invalidThemes = ['invalid-theme', 'bright', 'medium', '', 'AUTO'];
            
            for (const theme of invalidThemes) {
                const result = await configComponent.validate('theme', theme);
                expect(result.valid).toBe(false);
                expect(result.errors?.[0]?.message).toBe('Theme must be auto, light, dark, light-optimized, dark-optimized, default, or minimal');
            }
        });
    });

    describe('Folder path validation', () => {
        it('should accept existing folder paths', async () => {
            mockFs.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isDirectory: () => true });
            
            const result = await configComponent.validate('folders.list[0].path', '/existing/path');
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
            expect(mockFs).toHaveBeenCalledWith('/existing/path');
        });

        it('should reject non-existing folder paths', async () => {
            mockFs.mockReturnValue(false);
            
            const result = await configComponent.validate('folders.list[0].path', '/nonexistent/path');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0]?.message).toBe('Folder does not exist');
            expect(mockFs).toHaveBeenCalledWith('/nonexistent/path');
        });
        
        it('should reject file paths instead of directories', async () => {
            mockFs.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isDirectory: () => false });
            
            const result = await configComponent.validate('folders.list[0].path', '/path/to/file.txt');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0]?.message).toBe('Path is not a directory');
        });

        it('should reject empty folder paths', async () => {
            const result = await configComponent.validate('folders.list[0].path', '');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0]?.message).toBe('Folder path must be a string');
        });

        it('should normalize array paths for validation', async () => {
            mockFs.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isDirectory: () => true });
            
            // Test different array indices use same validation rules
            const paths = [
                'folders.list[0].path',
                'folders.list[1].path',
                'folders.list[999].path'
            ];
            
            for (const path of paths) {
                const result = await configComponent.validate(path, '/existing/path');
                expect(result.valid).toBe(true);
            }
        });
    });

    describe('Embedding model validation', () => {
        it('should accept supported embedding models', async () => {
            const supportedModels = [
                'nomic-embed-text',
                'mxbai-embed-large',
                'all-minilm',
                'sentence-transformers'
            ];
            
            for (const model of supportedModels) {
                const result = await configComponent.validate('folders.defaults.embeddings.model', model);
                expect(result.valid).toBe(true);
                expect(result.errors).toBeUndefined();
            }
        });

        it('should reject unsupported embedding models', async () => {
            const unsupportedModels = ['invalid-model', 'gpt-4', '', 'custom-model'];
            
            for (const model of unsupportedModels) {
                const result = await configComponent.validate('folders.defaults.embeddings.model', model);
                expect(result.valid).toBe(false);
                expect(result.errors?.[0]?.message).toBe('Must be a supported embedding model');
            }
        });
    });

    describe('Batch size validation', () => {
        it('should accept valid batch sizes', async () => {
            const validSizes = ['1', '32', '64', '128', '1000'];
            
            for (const size of validSizes) {
                const result = await configComponent.validate('folders.defaults.embeddings.batchSize', size);
                expect(result.valid).toBe(true);
                expect(result.errors).toBeUndefined();
            }
        });

        it('should reject invalid batch sizes', async () => {
            const testCases = [
                { value: '0', expectedError: 'Must be at least 1' },
                { value: '-1', expectedError: 'Must be at least 1' },
                { value: '1001', expectedError: 'Must be at most 1000' },
                { value: 'abc', expectedError: 'Must be a number' },
                { value: '', expectedError: 'Must be at least 1' }, // Empty string converts to 0
                { value: 'not-a-number', expectedError: 'Must be a number' }
            ];
            
            for (const testCase of testCases) {
                const result = await configComponent.validate('folders.defaults.embeddings.batchSize', testCase.value);
                expect(result.valid).toBe(false);
                expect(result.errors?.[0]?.message).toBe(testCase.expectedError);
            }
        });
        
        it('should accept decimal batch sizes', async () => {
            // Note: The TUI validator accepts decimals, though they may not be practical
            const result = await configComponent.validate('folders.defaults.embeddings.batchSize', '32.5');
            expect(result.valid).toBe(true);
        });
    });

    describe('Server port validation', () => {
        it('should accept valid ports', async () => {
            const validPorts = ['1000', '3000', '8080', '9876', '65535'];
            
            for (const port of validPorts) {
                const result = await configComponent.validate('server.port', port);
                expect(result.valid).toBe(true);
                expect(result.errors).toBeUndefined();
            }
        });

        it('should reject invalid ports', async () => {
            const testCases = [
                { value: '999', expectedError: 'Must be at least 1000' },
                { value: '0', expectedError: 'Must be at least 1000' },
                { value: '65536', expectedError: 'Must be at most 65535' },
                { value: 'abc', expectedError: 'Must be a number' },
                { value: '', expectedError: 'Must be at least 1000' }, // Empty string converts to 0
                { value: 'not-a-port', expectedError: 'Must be a number' }
            ];
            
            for (const testCase of testCases) {
                const result = await configComponent.validate('server.port', testCase.value);
                expect(result.valid).toBe(false);
                expect(result.errors?.[0]?.message).toBe(testCase.expectedError);
            }
        });
        
        it('should accept decimal ports', async () => {
            // Note: The TUI validator accepts decimals, though they may not be practical
            const result = await configComponent.validate('server.port', '8080.5');
            expect(result.valid).toBe(true);
        });
    });

    describe('Server host validation', () => {
        it('should accept valid hosts', async () => {
            const validHosts = ['localhost', '127.0.0.1', '192.168.1.1', '10.0.0.1'];
            
            for (const host of validHosts) {
                const result = await configComponent.validate('server.host', host);
                expect(result.valid).toBe(true);
                expect(result.errors).toBeUndefined();
            }
        });

        it('should reject invalid hosts', async () => {
            const testCases = [
                { value: '256.256.256.256', expectedError: 'Invalid IPv4 address' },
                { value: 'invalid-host', expectedError: 'Invalid IPv4 format' },
                { value: '', expectedError: 'IP address is required' },
                { value: '192.168.1', expectedError: 'Invalid IPv4 format' }
            ];
            
            for (const testCase of testCases) {
                const result = await configComponent.validate('server.host', testCase.value);
                expect(result.valid).toBe(false);
                expect(result.errors?.[0]?.message).toBe(testCase.expectedError);
            }
        });
    });

    describe('Configuration operations', () => {
        it('should validate before setting values', async () => {
            vi.mocked(mockConfigManager.get).mockResolvedValue('auto');
            vi.mocked(mockConfigManager.set).mockResolvedValue(undefined);
            
            // Valid set should work
            await expect(configComponent.set('theme', 'dark')).resolves.toBeUndefined();
            expect(mockConfigManager.set).toHaveBeenCalledWith('theme', 'dark');
        });

        it('should reject invalid values when setting', async () => {
            vi.mocked(mockConfigManager.get).mockResolvedValue('auto');
            
            // Invalid set should throw
            await expect(configComponent.set('theme', 'invalid-theme'))
                .rejects.toThrow('Invalid value for theme: Theme must be auto, light, dark, light-optimized, dark-optimized, default, or minimal');
            
            expect(mockConfigManager.set).not.toHaveBeenCalled();
        });

        it('should get values without validation', async () => {
            vi.mocked(mockConfigManager.get).mockResolvedValue('dark');
            
            const result = await configComponent.get('theme');
            expect(result).toBe('dark');
            expect(mockConfigManager.get).toHaveBeenCalledWith('theme');
        });
    });

    describe('validateAll', () => {
        it('should validate all configured values', async () => {
            // Mock config manager to return some test data
            vi.mocked(mockConfigManager.get).mockImplementation(async (path: string) => {
                if (path === '') return { theme: 'dark', folders: { list: [{ path: '/test' }] } };
                if (path === 'theme') return 'dark';
                if (path === 'folders.list') return [{ path: '/test' }];
                return undefined;
            });
            
            mockFs.mockReturnValue(true); // /test exists
            mockStatSync.mockReturnValue({ isDirectory: () => true });
            
            const result = await configComponent.validateAll();
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should collect all validation errors', async () => {
            vi.mocked(mockConfigManager.get).mockImplementation(async (path: string) => {
                if (path === '') return { theme: 'invalid', folders: { list: [{ path: '/nonexistent' }] } };
                if (path === 'theme') return 'invalid';
                if (path === 'folders.list') return [{ path: '/nonexistent' }];
                return undefined;
            });
            
            mockFs.mockReturnValue(false); // /nonexistent doesn't exist
            
            const result = await configComponent.validateAll();
            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors[0]).toEqual({ path: 'theme', error: 'Theme must be auto, light, dark, light-optimized, dark-optimized, default, or minimal' });
            expect(result.errors[1]).toEqual({ path: 'folders.list[].path', error: 'Folder does not exist' });
        });
    });

    describe('No validation rules', () => {
        it('should accept values for paths without validation rules', async () => {
            const result = await configComponent.validate('some.unknown.path', 'any-value');
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });
    });
});