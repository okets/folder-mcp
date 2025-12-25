# MCP Auto-Configuration Guide

**How to Add "One-Click" MCP Server Connection to AI Agents**

This document details the tested and verified method for auto-configuring MCP servers across popular AI agents. The folder-mcp project has successfully implemented this mechanism for 8+ clients.

---

## Executive Summary

The mechanism works by:
1. **Detecting the config file location** for each AI agent (platform-aware)
2. **Reading existing configuration** (preserving user settings)
3. **Injecting the MCP server entry** into the appropriate JSON/TOML structure
4. **Writing back** with proper formatting

All clients use one of two formats:
- **JSON** with `mcpServers` or `servers` key
- **TOML** with `[mcp_servers.your-server]` sections

---

## Supported Clients Reference

### Complete Client Configuration Table

| Client | Config Path (macOS) | Config Path (Windows) | Config Path (Linux) | Format | Server Key | Auto-Config |
|--------|---------------------|----------------------|---------------------|--------|------------|-------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%/Claude/claude_desktop_config.json` | `~/.config/Claude/claude_desktop_config.json` | JSON | `mcpServers` | ✅ |
| Claude Code | `~/.claude.json` | `~/.claude.json` | `~/.claude.json` | JSON | `mcpServers` | ✅ |
| Cursor | `~/.cursor/mcp.json` | `~/.cursor/mcp.json` | `~/.cursor/mcp.json` | JSON | `mcpServers` | ✅ |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `~/.codeium/windsurf/mcp_config.json` | `~/.codeium/windsurf/mcp_config.json` | JSON | `mcpServers` | ✅ |
| Cline | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` | `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` | `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` | JSON | `mcpServers` | ✅ |
| Qwen Code | `~/.qwen/settings.json` | `~/.qwen/settings.json` | `~/.qwen/settings.json` | JSON | `mcpServers` | ✅ |
| Codex CLI | `~/.codex/config.toml` | `~/.codex/config.toml` | `~/.codex/config.toml` | TOML | `mcp_servers` | ✅ |
| GitHub Copilot CLI | `~/.copilot/mcp-config.json` | `~/.copilot/mcp-config.json` | `~/.copilot/mcp-config.json` | JSON | `mcpServers` | ✅ |
| VS Code | `.vscode/mcp.json` (project) | `.vscode/mcp.json` (project) | `.vscode/mcp.json` (project) | JSON | `servers` | ❌ (project-level) |

---

## Configuration Formats

### Standard JSON Format (Most Clients)

Most clients use this JSON structure:

```json
{
  "mcpServers": {
    "your-mcp-server": {
      "command": "your-server-command",
      "args": ["mcp", "server"]
    }
  }
}
```

### Claude Code Specific (requires `type`)

Claude Code requires an additional `type` field:

```json
{
  "mcpServers": {
    "your-mcp-server": {
      "type": "stdio",
      "command": "your-server-command",
      "args": ["mcp", "server"]
    }
  }
}
```

### GitHub Copilot CLI (requires `tools`)

GitHub Copilot CLI requires a `tools` array:

```json
{
  "mcpServers": {
    "your-mcp-server": {
      "command": "your-server-command",
      "args": ["mcp", "server"],
      "tools": ["*"]
    }
  }
}
```

### VS Code Format (different key)

VS Code uses `servers` instead of `mcpServers`:

```json
{
  "servers": {
    "your-mcp-server": {
      "command": "your-server-command",
      "args": ["mcp", "server"]
    }
  }
}
```

### TOML Format (Codex CLI)

Codex CLI uses TOML configuration:

```toml
[mcp_servers.your-mcp-server]
command = "your-server-command"
args = ["mcp", "server"]
```

---

## Implementation Guide

### Step 1: Create Type Definitions

```typescript
// types.ts

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
```

### Step 2: Define Platform-Specific Paths

```typescript
// config-paths.ts
import { homedir } from 'os';

type Platform = 'darwin' | 'win32' | 'linux';

function getPlatform(): Platform {
  const p = process.platform;
  if (p === 'darwin' || p === 'win32' || p === 'linux') return p;
  return 'linux'; // Default for other Unix-like systems
}

function getHome(): string {
  return process.env.HOME || process.env.USERPROFILE || homedir();
}

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
export function expandPath(path: string): string {
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

export function getConfigPath(clientId: McpClientId): string {
  const platform = getPlatform();
  const pathTemplate = CONFIG_PATHS[clientId]?.[platform] || '';
  return expandPath(pathTemplate);
}
```

### Step 3: Define Client Metadata

```typescript
// client-info.ts

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
    includesType: true,  // IMPORTANT: Claude Code requires type: stdio
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
    serversKey: 'servers',  // NOTE: Different key!
    configFormat: 'json',
    canAutoConnect: false, // Project-level config only
    includesType: false,
  },
};
```

### Step 4: Implement Server Entry Generator

```typescript
// server-entry.ts

/**
 * YOUR MCP SERVER NAME - Change this to your project name
 */
const YOUR_SERVER_NAME = 'your-mcp-server';

/**
 * YOUR MCP COMMAND - Change this to your CLI command
 */
const YOUR_COMMAND = 'your-mcp-server';

/**
 * YOUR MCP ARGS - Change these to your server args
 */
const YOUR_ARGS = ['mcp', 'server'];

/**
 * Generate the MCP server entry for a specific client
 */
function generateServerEntry(clientId: McpClientId): Record<string, unknown> {
  const info = CLIENT_INFO[clientId];

  const entry: Record<string, unknown> = {
    command: YOUR_COMMAND,
    args: YOUR_ARGS,
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
```

### Step 5: Implement Configuration Functions

```typescript
// config-manager.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Check if your server is already configured in a client
 */
export async function isConfigured(clientId: McpClientId): Promise<boolean> {
  const configPath = getConfigPath(clientId);
  const info = CLIENT_INFO[clientId];

  if (!info || !info.canAutoConnect) return false;

  try {
    if (!existsSync(configPath)) return false;

    const content = readFileSync(configPath, 'utf-8');

    // Handle TOML format (Codex CLI)
    if (info.configFormat === 'toml') {
      return content.includes(`[mcp_servers.${YOUR_SERVER_NAME}]`) ||
             content.includes(`[mcp_servers."${YOUR_SERVER_NAME}"]`);
    }

    // Handle JSON format
    const config = JSON.parse(content) as Record<string, unknown>;
    const servers = config[info.serversKey] as Record<string, unknown> | undefined;

    return servers !== undefined && YOUR_SERVER_NAME in servers;
  } catch {
    return false;
  }
}

/**
 * Add your server to a client's configuration
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

    if (info.configFormat === 'toml') {
      return addToTomlConfig(configPath, info);
    }

    // Handle JSON format
    let config: Record<string, unknown> = {};
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8').trim();
      if (content) {
        config = JSON.parse(content) as Record<string, unknown>;
      }
    }

    // Ensure servers object exists
    if (!config[info.serversKey]) {
      config[info.serversKey] = {};
    }

    // Add server entry
    const servers = config[info.serversKey] as Record<string, unknown>;
    servers[YOUR_SERVER_NAME] = generateServerEntry(clientId);

    // Write back with formatting
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
 * Add to TOML config (Codex CLI)
 */
function addToTomlConfig(configPath: string, info: Omit<McpClientInfo, 'configPath'>): ConfigResult {
  let content = '';
  if (existsSync(configPath)) {
    content = readFileSync(configPath, 'utf-8');
  }

  // Check if already exists
  if (content.includes(`[mcp_servers.${YOUR_SERVER_NAME}]`) ||
      content.includes(`[mcp_servers."${YOUR_SERVER_NAME}"]`)) {
    return { success: true, configPath };
  }

  // Generate TOML entry
  const tomlEntry = `
[mcp_servers.${YOUR_SERVER_NAME}]
command = "${YOUR_COMMAND}"
args = ${JSON.stringify(YOUR_ARGS)}
`;

  // Append to file
  const newContent = content.trimEnd() + '\n' + tomlEntry;
  writeFileSync(configPath, newContent, 'utf-8');

  return { success: true, configPath };
}

/**
 * Remove your server from a client's configuration
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
      return removeFromTomlConfig(configPath);
    }

    // Handle JSON format
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as Record<string, unknown>;
    const servers = config[info.serversKey] as Record<string, unknown> | undefined;

    if (!servers || !(YOUR_SERVER_NAME in servers)) {
      return { success: false, error: `${YOUR_SERVER_NAME} not found in config` };
    }

    delete servers[YOUR_SERVER_NAME];
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
 * Remove from TOML config
 */
function removeFromTomlConfig(configPath: string): ConfigResult {
  const content = readFileSync(configPath, 'utf-8');

  if (!content.includes(`[mcp_servers.${YOUR_SERVER_NAME}]`) &&
      !content.includes(`[mcp_servers."${YOUR_SERVER_NAME}"]`)) {
    return { success: false, error: `${YOUR_SERVER_NAME} not found in config` };
  }

  // Remove the section and its contents
  const sectionRegex = new RegExp(
    `\\n?\\[mcp_servers\\.(?:"${YOUR_SERVER_NAME}"|${YOUR_SERVER_NAME})\\][^\\[]*(?=\\[|$)`,
    'g'
  );
  const newContent = content.replace(sectionRegex, '');

  writeFileSync(configPath, newContent.trim() + '\n', 'utf-8');

  return { success: true, configPath };
}
```

### Step 6: Generate Display Snippets

```typescript
// display.ts

/**
 * Generate a config snippet for display/copy
 */
export function generateConfigSnippet(clientId: McpClientId): string {
  const info = CLIENT_INFO[clientId];
  if (!info) throw new Error(`Unknown client: ${clientId}`);

  const serverEntry = generateServerEntry(clientId);
  const config = {
    [info.serversKey]: {
      [YOUR_SERVER_NAME]: serverEntry,
    },
  };

  const jsonConfig = JSON.stringify(config, null, 2);

  // Add instruction for project-level configs
  if (clientId === 'vscode') {
    return `Create or edit: <project>/.vscode/mcp.json\n\n${jsonConfig}`;
  }

  return jsonConfig;
}

/**
 * Get display path (with ~ for home directory)
 */
export function getDisplayPath(clientId: McpClientId): string {
  const platform = getPlatform();
  return CONFIG_PATHS[clientId]?.[platform] || '';
}
```

---

## Package.json Setup

For your MCP server to be invokable by name, add a `bin` entry:

```json
{
  "name": "your-mcp-server",
  "version": "1.0.0",
  "bin": {
    "your-mcp-server": "dist/cli.js"
  }
}
```

When users run `npm install -g your-mcp-server`, the command becomes available globally.

---

## CLI Command Implementation

Add a connect command to your CLI:

```typescript
// cli.ts
import { Command } from 'commander';

const program = new Command();

const connectCommand = new Command('connect')
  .description('Configure MCP clients to connect to your-mcp-server');

// Add subcommands for each client
const clientIds: McpClientId[] = [
  'claude-desktop', 'claude-code', 'cursor', 'windsurf',
  'codex-cli', 'cline', 'qwen-code', 'github-copilot'
];

clientIds.forEach(clientId => {
  const info = CLIENT_INFO[clientId];
  connectCommand
    .command(clientId)
    .description(`Auto-configure ${info.name}`)
    .option('--remove', 'Remove configuration')
    .option('--status', 'Check configuration status')
    .action(async (options) => {
      if (options.status) {
        const configured = await isConfigured(clientId);
        console.log(configured ? '✅ Configured' : '❌ Not configured');
        return;
      }

      if (options.remove) {
        const result = await removeFromConfig(clientId);
        console.log(result.success ? '✅ Removed' : `❌ ${result.error}`);
        return;
      }

      const result = await addToConfig(clientId);
      console.log(result.success ? '✅ Configured' : `❌ ${result.error}`);
      console.log(`\n⚠️  Restart ${info.name} to apply changes`);
    });
});

program.addCommand(connectCommand);
program.parse(process.argv);
```

---

## Critical Implementation Details

### 1. Claude Code Requires `type: stdio`

```json
{
  "mcpServers": {
    "your-server": {
      "type": "stdio",  // REQUIRED for Claude Code
      "command": "your-server",
      "args": ["mcp", "server"]
    }
  }
}
```

### 2. GitHub Copilot Requires `tools` Array

```json
{
  "mcpServers": {
    "your-server": {
      "command": "your-server",
      "args": ["mcp", "server"],
      "tools": ["*"]  // REQUIRED for Copilot
    }
  }
}
```

### 3. VS Code Uses Different Key

```json
{
  "servers": {  // NOT mcpServers
    "your-server": { ... }
  }
}
```

### 4. Codex CLI Uses TOML

```toml
[mcp_servers.your-server]
command = "your-server"
args = ["mcp", "server"]
```

### 5. Always Preserve Existing Config

Never overwrite the entire file. Always:
1. Read existing config
2. Parse as JSON/TOML
3. Add/update only your entry
4. Write back with formatting

### 6. Create Parent Directories

Some configs live in directories that may not exist:
```typescript
import { mkdirSync } from 'fs';
mkdirSync(dirname(configPath), { recursive: true });
```

### 7. Handle Empty Files Gracefully

```typescript
const content = readFileSync(configPath, 'utf-8').trim();
if (content) {
  config = JSON.parse(content);
} else {
  config = {};
}
```

---

## Testing Your Implementation

### Manual Testing Checklist

For each client:
1. [ ] Run connect command
2. [ ] Verify config file was created/updated
3. [ ] Check JSON/TOML syntax is valid
4. [ ] Restart the AI agent
5. [ ] Verify MCP server connects
6. [ ] Run remove command
7. [ ] Verify entry was removed
8. [ ] Run status command
9. [ ] Verify accurate detection

### Example Test Commands

```bash
# Connect
your-server connect claude-desktop
your-server connect claude-code
your-server connect cursor

# Status check
your-server connect claude-desktop --status

# Remove
your-server connect claude-desktop --remove
```

---

## Reference Implementation

See the folder-mcp source code for a complete, tested implementation:

- **Config Generator**: `src/interfaces/tui-ink/utils/mcp-config-generator.ts`
- **CLI Connect Command**: `src/interfaces/cli/folder-mcp.ts`
- **Infrastructure Config**: `src/infrastructure/claude-desktop-config.ts`

---

## Post-Configuration Notes

Always remind users:

> ⚠️ **Restart Required**: After configuring, restart the AI agent application for changes to take effect.

Some clients may also require:
- Claude Desktop: Full application restart
- VS Code extensions: Reload window (`Cmd+Shift+P` → "Reload Window")
- CLI tools: New terminal session

---

## Troubleshooting

### Config Not Detected

1. Check file path is correct for the platform
2. Verify JSON/TOML syntax is valid
3. Ensure the `mcpServers` (or `servers`) key exists

### Server Not Connecting

1. Verify the command is globally accessible (`which your-server`)
2. Check the args match your server's expected input
3. Look for error messages in the client's logs

### Permission Errors

1. Ensure the config directory exists
2. Check file permissions
3. On Windows, handle `%APPDATA%` expansion

---

## Version History

- **December 2024**: All 8 clients tested and verified working
- Tested on: macOS 14, Windows 11, Ubuntu 22.04
