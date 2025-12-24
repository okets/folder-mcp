/**
 * MCP Config Generator
 *
 * Utility for generating, detecting, and managing MCP configurations
 * across different AI clients (Claude Desktop, Claude Code, Cursor, etc.)
 *
 * All configurations use the deployment-safe format:
 * {
 *   "command": "folder-mcp",
 *   "args": ["mcp", "server"]
 * }
 *
 * This works because `npm install -g folder-mcp` adds it to PATH.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

// ============================================================================
// Types
// ============================================================================

export type McpClientId =
    | 'claude-desktop'
    | 'claude-code'
    | 'cursor'
    | 'windsurf'
    | 'codex-cli'
    | 'vscode';

export interface McpClientInfo {
    id: McpClientId;
    name: string;
    icon: string;
    description: string;
    configPath: string;
    /** Key for servers object (mcpServers vs servers) */
    serversKey: 'mcpServers' | 'servers';
    /** Whether we can auto-configure (false for project-level configs) */
    canAutoConnect: boolean;
    /** Whether client uses 'type: stdio' in config */
    includesType: boolean;
}

export interface ConfigResult {
    success: boolean;
    error?: string;
    configPath?: string;
}

// ============================================================================
// Platform Detection
// ============================================================================

type Platform = 'darwin' | 'win32' | 'linux';

function getPlatform(): Platform {
    const p = process.platform;
    if (p === 'darwin' || p === 'win32' || p === 'linux') {
        return p;
    }
    // Default to linux for other Unix-like systems
    return 'linux';
}

function getHome(): string {
    return process.env.HOME || process.env.USERPROFILE || homedir();
}

// ============================================================================
// Config Path Resolution
// ============================================================================

const CONFIG_PATHS: Record<McpClientId, Record<Platform, string>> = {
    'claude-desktop': {
        darwin: '~/Library/Application Support/Claude/claude_desktop_config.json',
        win32: '%APPDATA%/Claude/claude_desktop_config.json',
        linux: '~/.config/Claude/claude_desktop_config.json',
    },
    'claude-code': {
        darwin: '~/.claude.json',
        win32: '~/.claude.json',
        linux: '~/.claude.json',
    },
    cursor: {
        darwin: '~/.cursor/mcp.json',
        win32: '~/.cursor/mcp.json',
        linux: '~/.cursor/mcp.json',
    },
    windsurf: {
        darwin: '~/.windsurf/mcp.json',
        win32: '~/.windsurf/mcp.json',
        linux: '~/.windsurf/mcp.json',
    },
    'codex-cli': {
        darwin: '~/.codex/config.json',
        win32: '~/.codex/config.json',
        linux: '~/.codex/config.json',
    },
    vscode: {
        darwin: '.vscode/mcp.json',
        win32: '.vscode/mcp.json',
        linux: '.vscode/mcp.json',
    },
};

/**
 * Expand path variables (~, %APPDATA%, etc.)
 */
function expandPath(path: string): string {
    const home = getHome();
    let expanded = path.replace(/^~/, home);

    // Windows environment variables
    if (process.platform === 'win32') {
        expanded = expanded.replace(/%APPDATA%/g, process.env.APPDATA || '');
        expanded = expanded.replace(/%USERPROFILE%/g, process.env.USERPROFILE || home);
    }

    // Normalize path separators for the current platform
    if (process.platform === 'win32') {
        expanded = expanded.replace(/\//g, '\\');
    }

    return expanded;
}

/**
 * Get the config file path for a specific client
 */
export function getConfigPath(clientId: McpClientId): string {
    const platform = getPlatform();
    const pathTemplate = CONFIG_PATHS[clientId]?.[platform] || '';
    return expandPath(pathTemplate);
}

/**
 * Get display path (with ~ for home directory)
 */
export function getDisplayPath(clientId: McpClientId): string {
    const platform = getPlatform();
    return CONFIG_PATHS[clientId]?.[platform] || '';
}

// ============================================================================
// Client Information
// ============================================================================

const CLIENT_INFO: Record<McpClientId, Omit<McpClientInfo, 'configPath'>> = {
    'claude-desktop': {
        id: 'claude-desktop',
        name: 'Claude Desktop',
        icon: '◈',
        description: 'Anthropic Claude desktop application',
        serversKey: 'mcpServers',
        canAutoConnect: true,
        includesType: false,
    },
    'claude-code': {
        id: 'claude-code',
        name: 'Claude Code',
        icon: '◆',
        description: 'Anthropic Claude CLI for developers',
        serversKey: 'mcpServers',
        canAutoConnect: true,
        includesType: true,
    },
    cursor: {
        id: 'cursor',
        name: 'Cursor',
        icon: '◇',
        description: 'AI-first code editor',
        serversKey: 'mcpServers',
        canAutoConnect: true,
        includesType: false,
    },
    windsurf: {
        id: 'windsurf',
        name: 'Windsurf',
        icon: '○',
        description: 'AI-powered IDE',
        serversKey: 'mcpServers',
        canAutoConnect: true,
        includesType: false,
    },
    'codex-cli': {
        id: 'codex-cli',
        name: 'Codex CLI',
        icon: '□',
        description: 'OpenAI Codex command-line tool',
        serversKey: 'mcpServers',
        canAutoConnect: true,
        includesType: false,
    },
    vscode: {
        id: 'vscode',
        name: 'VS Code',
        icon: '▣',
        description: 'GitHub Copilot with MCP support',
        serversKey: 'servers',
        canAutoConnect: false, // Project-level config only
        includesType: false,
    },
};

/**
 * Get all supported MCP clients
 */
export function getAllClients(): McpClientInfo[] {
    return Object.values(CLIENT_INFO).map((info) => ({
        ...info,
        configPath: getConfigPath(info.id),
    }));
}

/**
 * Get information about a specific client
 */
export function getClientInfo(clientId: McpClientId): McpClientInfo {
    const info = CLIENT_INFO[clientId];
    if (!info) {
        throw new Error(`Unknown client: ${clientId}`);
    }
    return {
        ...info,
        configPath: getConfigPath(clientId),
    };
}

// ============================================================================
// Config Generation
// ============================================================================

/**
 * Generate the folder-mcp server entry for a specific client
 */
function generateServerEntry(clientId: McpClientId): Record<string, unknown> {
    const info = CLIENT_INFO[clientId];

    const entry: Record<string, unknown> = {
        command: 'folder-mcp',
        args: ['mcp', 'server'],
    };

    // Claude Code requires 'type: stdio'
    if (info?.includesType) {
        entry.type = 'stdio';
    }

    return entry;
}

/**
 * Generate a complete config snippet for display (Show Config)
 */
export function generateConfigSnippet(clientId: McpClientId): string {
    const info = CLIENT_INFO[clientId];
    if (!info) {
        throw new Error(`Unknown client: ${clientId}`);
    }

    const serverEntry = generateServerEntry(clientId);
    const config = {
        [info.serversKey]: {
            'folder-mcp': serverEntry,
        },
    };

    return JSON.stringify(config, null, 2);
}

// ============================================================================
// Config Detection
// ============================================================================

/**
 * Check if folder-mcp is already configured in a client
 */
export async function isConfigured(clientId: McpClientId): Promise<boolean> {
    const configPath = getConfigPath(clientId);
    const info = CLIENT_INFO[clientId];

    if (!info) {
        return false;
    }

    try {
        if (!existsSync(configPath)) {
            return false;
        }

        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as Record<string, unknown>;
        const servers = config[info.serversKey] as Record<string, unknown> | undefined;

        return servers !== undefined && 'folder-mcp' in servers;
    } catch {
        return false;
    }
}

/**
 * Check if the config file exists
 */
export function configFileExists(clientId: McpClientId): boolean {
    const configPath = getConfigPath(clientId);
    return existsSync(configPath);
}

// ============================================================================
// Config Modification
// ============================================================================

/**
 * Add folder-mcp to a client's configuration
 * Creates the config file if it doesn't exist, merges if it does
 */
export async function addToConfig(clientId: McpClientId): Promise<ConfigResult> {
    const configPath = getConfigPath(clientId);
    const info = CLIENT_INFO[clientId];

    if (!info) {
        return { success: false, error: `Unknown client: ${clientId}` };
    }

    if (!info.canAutoConnect) {
        return {
            success: false,
            error: `${info.name} uses project-level configuration. Copy the config manually.`,
        };
    }

    try {
        // Ensure parent directory exists
        const parentDir = dirname(configPath);
        if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
        }

        // Read existing config or create empty one
        let config: Record<string, unknown> = {};
        if (existsSync(configPath)) {
            const content = readFileSync(configPath, 'utf-8');
            config = JSON.parse(content) as Record<string, unknown>;
        }

        // Ensure servers object exists
        if (!config[info.serversKey]) {
            config[info.serversKey] = {};
        }

        // Add folder-mcp entry
        const servers = config[info.serversKey] as Record<string, unknown>;
        servers['folder-mcp'] = generateServerEntry(clientId);

        // Write back
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        return { success: true, configPath };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Remove folder-mcp from a client's configuration
 */
export async function removeFromConfig(clientId: McpClientId): Promise<ConfigResult> {
    const configPath = getConfigPath(clientId);
    const info = CLIENT_INFO[clientId];

    if (!info) {
        return { success: false, error: `Unknown client: ${clientId}` };
    }

    try {
        if (!existsSync(configPath)) {
            return { success: false, error: 'Config file does not exist' };
        }

        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as Record<string, unknown>;
        const servers = config[info.serversKey] as Record<string, unknown> | undefined;

        if (!servers || !('folder-mcp' in servers)) {
            return { success: false, error: 'folder-mcp not found in config' };
        }

        // Remove folder-mcp entry
        delete servers['folder-mcp'];

        // Write back
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        return { success: true, configPath };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// CLI Command Generation (for copy-paste workflows)
// ============================================================================

/**
 * Generate CLI command for clients that support it
 */
export function generateCliCommand(clientId: McpClientId): string | null {
    switch (clientId) {
        case 'claude-code':
            return 'claude mcp add folder-mcp -- folder-mcp mcp server';
        case 'codex-cli':
            return 'codex mcp add folder-mcp -- folder-mcp mcp server';
        default:
            return null;
    }
}
