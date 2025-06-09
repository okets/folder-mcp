import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import { glob } from 'glob';
import { getConfig } from '../config.js';

export interface ServerOptions {
  folderPath: string;
  port?: number;
  transport?: 'stdio' | 'http';
}

export class FolderMCPServer {
  private server: Server;
  private folderPath: string;
  private port: number;
  private transport: 'stdio' | 'http';

  constructor(options: ServerOptions) {
    this.folderPath = resolve(options.folderPath);
    this.port = options.port || 3000;
    this.transport = options.transport || 'stdio';

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'folder-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  private setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read the contents of a file within the served folder',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Relative path to the file within the folder',
                },
              },
              required: ['file_path'],
            },
          },
          {
            name: 'search_files',
            description: 'Search for files matching a pattern',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: 'File pattern to search for (e.g., "*.md", "*.txt")',
                  default: '*',
                },
              },
            },
          },
          {
            name: 'list_files',
            description: 'List all files in the served folder recursively',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_folder_info',
            description: 'Get information about the served folder',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_file':
            return await this.handleReadFile(args?.file_path as string);

          case 'search_files':
            return await this.handleSearchFiles(args?.pattern as string);

          case 'list_files':
            return await this.handleListFiles();

          case 'get_folder_info':
            return await this.handleGetFolderInfo();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleReadFile(filePath: string) {
    if (!filePath) {
      throw new Error('file_path is required');
    }

    // Security check - ensure path is within the served folder
    const fullPath = resolve(this.folderPath, filePath);
    if (!fullPath.startsWith(this.folderPath)) {
      throw new Error('Access denied: Path is outside the served folder');
    }

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(fullPath, 'utf8');
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  }

  private async handleSearchFiles(pattern: string = '*') {
    const searchPattern = join(this.folderPath, '**', pattern);
    const files = await glob(searchPattern, {
      ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp-cache/**'],
      nodir: true,
    });

    const relativeFiles = files.map(file => relative(this.folderPath, file));
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${relativeFiles.length} files matching pattern "${pattern}":\n\n${relativeFiles.join('\n')}`,
        },
      ],
    };
  }

  private async handleListFiles() {
    const files = await glob(join(this.folderPath, '**', '*'), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp-cache/**'],
      nodir: true,
    });

    const relativeFiles = files.map(file => relative(this.folderPath, file));
    
    // Group by file type
    const fileTypes: Record<string, number> = {};
    relativeFiles.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase() || 'no extension';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    const typeInfo = Object.entries(fileTypes)
      .sort(([, a], [, b]) => b - a)
      .map(([ext, count]) => `${ext}: ${count}`)
      .join(', ');

    return {
      content: [
        {
          type: 'text',
          text: `Total files: ${relativeFiles.length}\n\nFile types: ${typeInfo}\n\nFiles:\n${relativeFiles.join('\n')}`,
        },
      ],
    };
  }

  private async handleGetFolderInfo() {
    const files = await glob(join(this.folderPath, '**', '*'), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp-cache/**'],
      nodir: true,
    });

    // Check for index metadata
    let info = `Folder: ${this.folderPath}\n`;
    info += `Total files: ${files.length}\n`;

    const metadata = this.getMetadata();
    if (metadata) {
      info += `\nIndex Information:\n`;
      info += `- Indexed at: ${metadata.indexedAt}\n`;
      info += `- Total files processed: ${metadata.totalFiles}\n`;
      info += `- Cache directory: ${metadata.cacheDir}\n`;
    } else {
      info += `\nNo index found. Run 'folder-mcp index "${this.folderPath}"' to create an index.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: info,
        },
      ],
    };
  }

  private getMetadata(): any {
    try {
      const metadataPath = join(this.folderPath, '.folder-mcp-cache', 'metadata', 'index.json');
      if (existsSync(metadataPath)) {
        return JSON.parse(readFileSync(metadataPath, 'utf8'));
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  async start(): Promise<void> {
    if (this.transport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error(`Folder MCP Server running on stdio for folder: ${this.folderPath}`);
    } else {
      // For HTTP transport, we'll implement this in the future
      // For now, we'll use stdio but indicate the intended port
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error(`Folder MCP Server running on stdio (HTTP port ${this.port} planned) for folder: ${this.folderPath}`);
    }
  }

  async stop(): Promise<void> {
    // Implement graceful shutdown
    await this.server.close();
    console.error('Folder MCP Server stopped');
  }
}

// Export for use in CLI
export async function startMCPServer(options: ServerOptions): Promise<FolderMCPServer> {
  const config = getConfig();
  
  // Use config for default port if not specified
  const serverOptions: ServerOptions = {
    ...options,
    port: options.port || config.api.defaultPort,
  };

  const server = new FolderMCPServer(serverOptions);
  
  // Setup graceful shutdown
  const shutdown = async () => {
    console.error('\n📡 Received shutdown signal, stopping server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.start();
  return server;
}
