/**
 * MCP Config Generator
 *
 * Utility for generating, detecting, and managing MCP configurations
 * across different AI clients (Claude Desktop, Claude Code, Cursor, etc.)
 *
 * Configurations use absolute paths resolved at runtime via
 * `folder-mcp connect <client>` command. This works for both:
 * - Development: paths resolve to local project dist/
 * - Production: paths resolve to npm-installed package location
 *
 * ============================================================================
 * CONNECTOR STATUS (tested and verified working)
 * ============================================================================
 *
 * ✅ Claude Desktop - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via CLI: `folder-mcp connect claude-desktop`
 *    - Auto-configuration via TUI: Connect screen
 *    - Uses npx for cross-platform compatibility
 *    - Requires restart after config change
 *
 * ✅ Claude Code - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via TUI Connect screen
 *    - Config at ~/.claude.json with mcpServers key
 *    - Uses npx for cross-platform compatibility
 *
 * ✅ Cursor - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via TUI Connect screen
 *    - Config at ~/.cursor/mcp.json with mcpServers key
 *    - Uses npx for cross-platform compatibility
 *
 * ✅ Windsurf - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via TUI Connect screen
 *    - Config at ~/.codeium/windsurf/mcp_config.json with mcpServers key
 *    - Uses npx for cross-platform compatibility
 *
 * ✅ Cline - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via TUI Connect screen
 *    - Config at ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
 *    - Uses mcpServers key (JSON format)
 *
 * ✅ Qwen Code - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via TUI Connect screen
 *    - Config at ~/.qwen/settings.json with mcpServers key
 *    - Uses mcpServers key (JSON format)
 *
 * ✅ Codex CLI - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via TUI Connect screen
 *    - Config at ~/.codex/config.toml (TOML format)
 *    - Appends [mcp_servers.folder-mcp] section
 *
 * ✅ GitHub Copilot CLI - TESTED & WORKING (Dec 2024)
 *    - Auto-configuration via TUI Connect screen
 *    - Config at ~/.copilot/mcp-config.json with mcpServers key
 *    - Requires tools: ["*"] to enable all tools
 *
 * ⚠️ VS Code - MANUAL SETUP REQUIRED (project-level config)
 *    - Config at .vscode/mcp.json (per-project)
 *    - Cannot auto-configure (project-level config)
 *
 * ============================================================================
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

// ============================================================================
// Cross-Platform npx Discovery
// ============================================================================

/**
 * Get the appropriate npx command for the current platform.
 *
 * macOS GUI apps (like Claude Desktop) don't inherit the user's shell PATH
 * from .zshrc/.bashrc. They only see system paths. We check common npx
 * locations to find a working executable.
 *
 * - Apple Silicon Homebrew: /opt/homebrew/bin/npx
 * - Intel Mac Homebrew / official installer: /usr/local/bin/npx
 * - Windows/Linux: rely on PATH resolution
 */
function getNpxCommand(): string {
    if (process.platform !== 'darwin') {
        return 'npx';
    }

    // Check common macOS npx locations in order of preference
    const possiblePaths = [
        '/opt/homebrew/bin/npx',  // Apple Silicon Homebrew
        '/usr/local/bin/npx',     // Intel Homebrew / official installer
    ];

    for (const p of possiblePaths) {
        if (existsSync(p)) {
            return p;
        }
    }

    // Fallback to PATH resolution (may not work for GUI apps)
    return 'npx';
}

// ============================================================================
// Types
// ============================================================================

export type McpClientId =
    | 'claude-desktop'
    | 'claude-code'
    | 'cursor'
    | 'windsurf'
    | 'codex-cli'
    | 'cline'
    | 'qwen-code'
    | 'github-copilot'
    | 'vscode';

export interface McpClientInfo {
    id: McpClientId;
    name: string;
    icon: string;
    description: string;
    configPath: string;
    /** Key for servers object (mcpServers vs servers vs mcp_servers for TOML) */
    serversKey: 'mcpServers' | 'servers' | 'mcp_servers';
    /** Config file format */
    configFormat: 'json' | 'toml';
    /** Whether we can auto-configure (false for project-level configs or unsupported formats) */
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
        darwin: '~/.codeium/windsurf/mcp_config.json',
        win32: '~/.codeium/windsurf/mcp_config.json',
        linux: '~/.codeium/windsurf/mcp_config.json',
    },
    'codex-cli': {
        darwin: '~/.codex/config.toml',
        win32: '~/.codex/config.toml',
        linux: '~/.codex/config.toml',
    },
    cline: {
        darwin: '~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
        win32: '%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
        linux: '~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
    },
    'qwen-code': {
        darwin: '~/.qwen/settings.json',
        win32: '~/.qwen/settings.json',
        linux: '~/.qwen/settings.json',
    },
    'github-copilot': {
        darwin: '~/.copilot/mcp-config.json',
        win32: '~/.copilot/mcp-config.json',
        linux: '~/.copilot/mcp-config.json',
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
        configFormat: 'json',
        canAutoConnect: true,
        includesType: false,
    },
    'claude-code': {
        id: 'claude-code',
        name: 'Claude Code',
        icon: '◈',
        description: 'Anthropic Claude CLI for developers',
        serversKey: 'mcpServers',
        configFormat: 'json',
        canAutoConnect: true,
        includesType: true,
    },
    cursor: {
        id: 'cursor',
        name: 'Cursor',
        icon: '◈',
        description: 'AI-first code editor',
        serversKey: 'mcpServers',
        configFormat: 'json',
        canAutoConnect: true,
        includesType: false,
    },
    windsurf: {
        id: 'windsurf',
        name: 'Windsurf',
        icon: '◈',
        description: 'AI-powered IDE (Codeium)',
        serversKey: 'mcpServers',
        configFormat: 'json',
        canAutoConnect: true,
        includesType: false,
    },
    'codex-cli': {
        id: 'codex-cli',
        name: 'Codex CLI',
        icon: '◈',
        description: 'OpenAI Codex command-line tool',
        serversKey: 'mcp_servers',
        configFormat: 'toml',
        canAutoConnect: true,
        includesType: false,
    },
    cline: {
        id: 'cline',
        name: 'Cline',
        icon: '◈',
        description: 'VS Code AI coding assistant extension',
        serversKey: 'mcpServers',
        configFormat: 'json',
        canAutoConnect: true,
        includesType: false,
    },
    'qwen-code': {
        id: 'qwen-code',
        name: 'Qwen Code',
        icon: '◈',
        description: 'Alibaba Qwen AI coding CLI',
        serversKey: 'mcpServers',
        configFormat: 'json',
        canAutoConnect: true,
        includesType: false,
    },
    'github-copilot': {
        id: 'github-copilot',
        name: 'Copilot CLI',
        icon: '◈',
        description: 'GitHub Copilot CLI (ghcs command)',
        serversKey: 'mcpServers',
        configFormat: 'json',
        canAutoConnect: true,
        includesType: false,
    },
    vscode: {
        id: 'vscode',
        name: 'VS Code',
        icon: '◈',
        description: 'VS Code with Copilot (per-project)',
        serversKey: 'servers',
        configFormat: 'json',
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
    const npxCommand = getNpxCommand();

    const entry: Record<string, unknown> = {
        command: npxCommand,
        args: ['-y', 'folder-mcp', 'mcp', 'server'],
    };

    // Claude Code requires 'type: stdio'
    if (info?.includesType) {
        entry.type = 'stdio';
    }

    // GitHub Copilot CLI requires 'tools' array
    if (clientId === 'github-copilot') {
        entry.tools = ['*']; // Enable all tools
    }

    return entry;
}

/**
 * Generate a complete config snippet for display (Show Config)
 * Returns JSON or TOML based on the client's configFormat.
 * Use getConfigInstruction() for any instruction text.
 */
export function generateConfigSnippet(clientId: McpClientId): string {
    const info = CLIENT_INFO[clientId];
    if (!info) {
        throw new Error(`Unknown client: ${clientId}`);
    }

    const serverEntry = generateServerEntry(clientId);

    // Handle TOML format (Codex CLI)
    if (info.configFormat === 'toml') {
        const npxCommand = getNpxCommand();
        return `[${info.serversKey}.folder-mcp]
command = "${npxCommand}"
args = ["-y", "folder-mcp", "mcp", "server"]`;
    }

    // Handle JSON format (default)
    const config = {
        [info.serversKey]: {
            'folder-mcp': serverEntry,
        },
    };

    return JSON.stringify(config, null, 2);
}

/**
 * Get instruction text for clients that need it (e.g., VS Code project-level config)
 * Returns null if no special instruction is needed
 */
export function getConfigInstruction(clientId: McpClientId): string | null {
    if (clientId === 'vscode') {
        return 'Create or edit: <project>/.vscode/mcp.json';
    }
    return null;
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

    // Can't detect per-project configs - always show as not configured
    if (!info.canAutoConnect) {
        return false;
    }

    try {
        if (!existsSync(configPath)) {
            return false;
        }

        const content = readFileSync(configPath, 'utf-8');

        // Handle TOML format (Codex CLI)
        if (info.configFormat === 'toml') {
            return content.includes('[mcp_servers.folder-mcp]') ||
                   content.includes('[mcp_servers."folder-mcp"]');
        }

        // Handle JSON format
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
        // Provide specific guidance based on why auto-connect isn't supported
        const cliCommand = generateCliCommand(clientId);
        if (info.configFormat === 'toml') {
            return {
                success: false,
                error: cliCommand
                    ? `${info.name} uses TOML config. Run: ${cliCommand}`
                    : `${info.name} uses TOML config format. Manual setup required.`,
            };
        }
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

        if (info.configFormat === 'toml') {
            // Handle TOML format (Codex CLI)
            return addToTomlConfig(configPath);
        }

        // Handle JSON format (all other clients)
        let config: Record<string, unknown> = {};
        if (existsSync(configPath)) {
            const content = readFileSync(configPath, 'utf-8').trim();
            // Handle empty files gracefully
            if (content) {
                config = JSON.parse(content) as Record<string, unknown>;
            }
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
 * Add folder-mcp to a TOML config file (Codex CLI)
 */
function addToTomlConfig(configPath: string): ConfigResult {
    let content = '';
    if (existsSync(configPath)) {
        content = readFileSync(configPath, 'utf-8');
    }

    // Check if folder-mcp already exists
    if (content.includes('[mcp_servers.folder-mcp]') || content.includes('[mcp_servers."folder-mcp"]')) {
        return { success: true, configPath }; // Already configured
    }

    // Generate TOML entry using shared npx discovery
    const npxCommand = getNpxCommand();
    const tomlEntry = `
[mcp_servers.folder-mcp]
command = "${npxCommand}"
args = ["-y", "folder-mcp", "mcp", "server"]
`;

    // Append to file
    const newContent = content.trimEnd() + '\n' + tomlEntry;
    writeFileSync(configPath, newContent, 'utf-8');

    return { success: true, configPath };
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

        if (info.configFormat === 'toml') {
            // Handle TOML format (Codex CLI)
            return removeFromTomlConfig(configPath);
        }

        // Handle JSON format
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

/**
 * Remove folder-mcp from a TOML config file (Codex CLI)
 */
function removeFromTomlConfig(configPath: string): ConfigResult {
    const content = readFileSync(configPath, 'utf-8');

    // Check if folder-mcp exists
    if (!content.includes('[mcp_servers.folder-mcp]') && !content.includes('[mcp_servers."folder-mcp"]')) {
        return { success: false, error: 'folder-mcp not found in config' };
    }

    // Remove the [mcp_servers.folder-mcp] section and its contents
    // Match the section header and all following lines until the next section or end of file
    //
    // IMPORTANT: We use a line-oriented regex, NOT character-based like [^\[]*
    // The old pattern [^\[]* would stop at array brackets like args = ["-y", ...]
    // leaving malformed TOML. This pattern matches complete lines that don't start with [.
    //
    // Pattern breakdown:
    // - \n? - optional leading newline
    // - \[mcp_servers\.(?:"folder-mcp"|folder-mcp)\] - section header
    // - \s*\n - whitespace and newline after header
    // - (?:(?!\[)[^\n]*\n?)* - lines that don't start with [ (key=value pairs)
    const sectionRegex = /\n?\[mcp_servers\.(?:"folder-mcp"|folder-mcp)\]\s*\n(?:(?!\[)[^\n]*\n?)*/g;
    const newContent = content.replace(sectionRegex, '');

    writeFileSync(configPath, newContent.trim() + '\n', 'utf-8');

    return { success: true, configPath };
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
