#!/usr/bin/env tsx
/**
 * Demo: TUI with Configuration-Based Theme
 * 
 * This demonstrates how the TUI integrates with the configuration system
 * to load and persist theme preferences.
 */

import React from 'react';
import { render } from 'ink';
import { AppConfigured } from './AppConfigured';
import { DIProvider, setupDIContainer } from './di/index';
import { ConfigManager } from '../../application/config/ConfigManager';
import { NodeFileSystem } from '../../infrastructure/filesystem/node-filesystem';
import { NodeFileWriter } from '../../infrastructure/filesystem/NodeFileWriter';
import { YamlParser } from '../../infrastructure/parsers/YamlParser';
import { SimpleSchemaValidator, SimpleThemeSchemaLoader } from '../../application/config/SimpleSchemaValidator';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

// Setup demo configuration directory
const demoDir = join(process.cwd(), '.demo-theme-config');
if (!existsSync(demoDir)) {
    mkdirSync(demoDir, { recursive: true });
}

// Create config-defaults.yaml if it doesn't exist
const defaultsPath = join(demoDir, 'config-defaults.yaml');
if (!existsSync(defaultsPath)) {
    const defaults = `# Default configuration
theme: auto
performance:
  batchSize: 32
development:
  enabled: false
`;
    writeFileSync(defaultsPath, defaults);
}

// Create config.yaml with user preference if it doesn't exist
const configPath = join(demoDir, 'config.yaml');
if (!existsSync(configPath)) {
    const userConfig = `# User configuration
theme: dark  # User prefers dark theme
`;
    writeFileSync(configPath, userConfig);
}

async function main() {
    // Check TTY
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        console.error('Error: This application must be run in an interactive terminal.');
        process.exit(1);
    }

    // Setup configuration manager
    const fileSystem = new NodeFileSystem();
    const fileWriter = new NodeFileWriter();
    const yamlParser = new YamlParser();
    const schemaLoader = new SimpleThemeSchemaLoader();
    const validator = new SimpleSchemaValidator(schemaLoader);
    
    // Change to demo directory for config loading
    const originalCwd = process.cwd();
    process.chdir(demoDir);
    
    const configManager = new ConfigManager(
        fileSystem,
        fileWriter,
        yamlParser,
        validator,
        schemaLoader,
        'config-defaults.yaml',
        'config.yaml'
    );
    
    // Load configuration
    await configManager.load();
    
    // Change back
    process.chdir(originalCwd);
    
    console.log('Loading TUI with theme configuration...');
    console.log(`Current theme setting: ${configManager.get('theme')}`);
    console.log(`Config directory: ${demoDir}`);
    console.log('');
    console.log('Press "t" in the TUI to change themes.');
    console.log('Theme changes will be saved to config.yaml');
    console.log('');
    
    // Setup DI container
    const container = setupDIContainer();
    
    // Render the configured app
    const app = render(
        <DIProvider container={container}>
            <AppConfigured configManager={configManager} />
        </DIProvider>,
        {
            exitOnCtrlC: true
        }
    );
    
    // Handle cleanup
    const cleanup = () => {
        app.unmount();
        console.log('\nTheme configuration saved to:', configPath);
        console.log('Final theme setting:', configManager.get('theme'));
        process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    await app.waitUntilExit();
    cleanup();
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});