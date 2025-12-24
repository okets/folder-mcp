/**
 * Claude Desktop Configuration Manager
 *
 * Auto-configures Claude Desktop to connect to folder-mcp MCP server.
 * Resolves paths dynamically based on where the package is installed,
 * working for both development and production environments.
 *
 * Supports: macOS, Windows, Linux
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { homedir, platform } from 'os';
import { fileURLToPath } from 'url';

// Get current file's directory for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Claude Desktop MCP server configuration
 */
interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Claude Desktop configuration file structure
 */
interface ClaudeDesktopConfig {
  globalShortcut?: string;
  mcpServers?: Record<string, McpServerConfig>;
  preferences?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Result of configuration operation
 */
export interface ConfigResult {
  success: boolean;
  message: string;
  configPath: string;
  mcpServerPath?: string | undefined;
  previousConfig?: McpServerConfig | undefined;
  newConfig?: McpServerConfig | undefined;
}

/**
 * Get Claude Desktop config file path based on platform
 */
export function getClaudeDesktopConfigPath(): string {
  const home = homedir();
  const plat = platform();

  switch (plat) {
    case 'darwin':
      // macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
      return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

    case 'win32':
      // Windows: %APPDATA%\Claude\claude_desktop_config.json
      const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
      return join(appData, 'Claude', 'claude_desktop_config.json');

    case 'linux':
      // Linux: ~/.config/Claude/claude_desktop_config.json
      return join(home, '.config', 'Claude', 'claude_desktop_config.json');

    default:
      throw new Error(`Unsupported platform: ${plat}`);
  }
}

/**
 * Resolve the absolute path to mcp-server.js from current package location
 *
 * This works regardless of where the package is installed:
 * - Development: /path/to/project/dist/src/mcp-server.js
 * - Production: /path/to/npm-global/lib/node_modules/folder-mcp/dist/src/mcp-server.js
 */
export function resolveMcpServerPath(): string {
  // From: dist/src/infrastructure/claude-desktop-config.js
  // To:   dist/src/mcp-server.js
  // Path: ../mcp-server.js (one level up)
  const mcpServerPath = resolve(__dirname, '..', 'mcp-server.js');

  if (!existsSync(mcpServerPath)) {
    throw new Error(
      `MCP server not found at: ${mcpServerPath}\n` +
      `Please ensure the project is built: npm run build`
    );
  }

  return mcpServerPath;
}

/**
 * Get the node executable path
 * Uses process.execPath which gives the absolute path to node
 */
export function getNodePath(): string {
  return process.execPath;
}

/**
 * Read existing Claude Desktop config or return empty config
 */
export function readClaudeDesktopConfig(configPath: string): ClaudeDesktopConfig {
  if (!existsSync(configPath)) {
    return { mcpServers: {} };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as ClaudeDesktopConfig;
  } catch (error) {
    // If file exists but is invalid JSON, preserve what we can
    console.error(`Warning: Could not parse existing config at ${configPath}`);
    return { mcpServers: {} };
  }
}

/**
 * Write Claude Desktop config with proper formatting
 */
export function writeClaudeDesktopConfig(configPath: string, config: ClaudeDesktopConfig): void {
  // Ensure directory exists
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Write with pretty formatting
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Generate the folder-mcp MCP server configuration
 */
export function generateFolderMcpConfig(): McpServerConfig {
  const nodePath = getNodePath();
  const mcpServerPath = resolveMcpServerPath();

  return {
    command: nodePath,
    args: [mcpServerPath]
  };
}

/**
 * Configure Claude Desktop to use folder-mcp
 *
 * @param serverName - Name for the MCP server entry (default: "folder-mcp")
 * @param force - Overwrite existing configuration without prompting
 * @returns Result of the configuration operation
 */
export function configureClaudeDesktop(
  serverName: string = 'folder-mcp',
  force: boolean = false
): ConfigResult {
  const configPath = getClaudeDesktopConfigPath();

  try {
    // Resolve paths
    const mcpServerPath = resolveMcpServerPath();
    const newConfig = generateFolderMcpConfig();

    // Read existing config
    const config = readClaudeDesktopConfig(configPath);
    const previousConfig = config.mcpServers?.[serverName];

    // Check if already configured with same settings
    if (previousConfig && !force) {
      const isSameConfig =
        previousConfig.command === newConfig.command &&
        JSON.stringify(previousConfig.args) === JSON.stringify(newConfig.args);

      if (isSameConfig) {
        return {
          success: true,
          message: `Claude Desktop already configured for ${serverName} with current paths`,
          configPath,
          mcpServerPath,
          previousConfig,
          newConfig
        };
      }
    }

    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Update configuration
    config.mcpServers[serverName] = newConfig;

    // Write updated config
    writeClaudeDesktopConfig(configPath, config);

    return {
      success: true,
      message: previousConfig
        ? `Updated Claude Desktop configuration for ${serverName}`
        : `Added ${serverName} to Claude Desktop configuration`,
      configPath,
      mcpServerPath,
      previousConfig,
      newConfig
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      configPath
    };
  }
}

/**
 * Remove folder-mcp from Claude Desktop configuration
 */
export function removeFromClaudeDesktop(serverName: string = 'folder-mcp'): ConfigResult {
  const configPath = getClaudeDesktopConfigPath();

  try {
    const config = readClaudeDesktopConfig(configPath);
    const previousConfig = config.mcpServers?.[serverName];

    if (!previousConfig) {
      return {
        success: true,
        message: `${serverName} was not configured in Claude Desktop`,
        configPath
      };
    }

    // Remove the server entry
    delete config.mcpServers![serverName];

    // Write updated config
    writeClaudeDesktopConfig(configPath, config);

    return {
      success: true,
      message: `Removed ${serverName} from Claude Desktop configuration`,
      configPath,
      previousConfig
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      configPath
    };
  }
}

/**
 * Check current Claude Desktop configuration status
 */
export function checkClaudeDesktopStatus(serverName: string = 'folder-mcp'): ConfigResult & {
  isConfigured: boolean;
  needsUpdate: boolean;
} {
  const configPath = getClaudeDesktopConfigPath();

  try {
    const mcpServerPath = resolveMcpServerPath();
    const expectedConfig = generateFolderMcpConfig();

    if (!existsSync(configPath)) {
      return {
        success: true,
        message: 'Claude Desktop config file does not exist',
        configPath,
        mcpServerPath,
        isConfigured: false,
        needsUpdate: true
      };
    }

    const config = readClaudeDesktopConfig(configPath);
    const currentConfig = config.mcpServers?.[serverName];

    if (!currentConfig) {
      return {
        success: true,
        message: `${serverName} is not configured in Claude Desktop`,
        configPath,
        mcpServerPath,
        isConfigured: false,
        needsUpdate: true
      };
    }

    // Check if config matches expected
    const isSameConfig =
      currentConfig.command === expectedConfig.command &&
      JSON.stringify(currentConfig.args) === JSON.stringify(expectedConfig.args);

    return {
      success: true,
      message: isSameConfig
        ? `${serverName} is correctly configured`
        : `${serverName} is configured but paths differ from current installation`,
      configPath,
      mcpServerPath,
      previousConfig: currentConfig,
      newConfig: expectedConfig,
      isConfigured: true,
      needsUpdate: !isSameConfig
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      configPath,
      isConfigured: false,
      needsUpdate: false
    };
  }
}

/**
 * Format configuration for display
 */
export function formatConfigForDisplay(config: McpServerConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Get platform-friendly display name
 */
export function getPlatformDisplayName(): string {
  const plat = platform();
  switch (plat) {
    case 'darwin': return 'macOS';
    case 'win32': return 'Windows';
    case 'linux': return 'Linux';
    default: return plat;
  }
}
