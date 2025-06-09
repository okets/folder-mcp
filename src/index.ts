#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Server info
const server = new Server(
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

// Helper function to get file content
function getFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    return `Error reading file: ${error}`;
  }
}

// Helper function to search files by pattern
async function searchFiles(folderPath: string, pattern: string = '*'): Promise<string[]> {
  try {
    const searchPattern = join(folderPath, '**', pattern);
    const files = await glob(searchPattern, { 
      ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp-cache/**'],
      nodir: true 
    });
    return files;
  } catch (error) {
    return [];
  }
}

// Helper function to read metadata
function getMetadata(folderPath: string): any {
  try {
    const metadataPath = join(folderPath, '.folder-mcp-cache', 'metadata', 'index.json');
    if (existsSync(metadataPath)) {
      return JSON.parse(readFileSync(metadataPath, 'utf8'));
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a file from the indexed folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder_path: {
              type: 'string',
              description: 'Path to the indexed folder',
            },
            file_path: {
              type: 'string',
              description: 'Relative path to the file within the folder',
            },
          },
          required: ['folder_path', 'file_path'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files in the indexed folder by name pattern',
        inputSchema: {
          type: 'object',
          properties: {
            folder_path: {
              type: 'string',
              description: 'Path to the indexed folder',
            },
            pattern: {
              type: 'string',
              description: 'File pattern to search for (e.g., "*.md", "*.txt")',
              default: '*',
            },
          },
          required: ['folder_path'],
        },
      },
      {
        name: 'list_files',
        description: 'List all files in the indexed folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder_path: {
              type: 'string',
              description: 'Path to the indexed folder',
            },
          },
          required: ['folder_path'],
        },
      },
      {
        name: 'get_folder_info',
        description: 'Get information about the indexed folder including metadata',
        inputSchema: {
          type: 'object',
          properties: {
            folder_path: {
              type: 'string',
              description: 'Path to the indexed folder',
            },
          },
          required: ['folder_path'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'read_file': {
        const { folder_path, file_path } = args as { folder_path: string; file_path: string };
        const fullPath = resolve(folder_path, file_path);
        
        // Security check: ensure the file is within the folder
        const relativePath = relative(folder_path, fullPath);
        if (relativePath.startsWith('..')) {
          throw new Error('Access denied: File is outside the indexed folder');
        }
        
        const content = getFileContent(fullPath);
        return {
          content: [
            {
              type: 'text',
              text: `File: ${file_path}\n\n${content}`,
            },
          ],
        };
      }

      case 'search_files': {
        const { folder_path, pattern = '*' } = args as { folder_path: string; pattern?: string };
        const files = await searchFiles(folder_path, pattern);
        const relativeFiles = files.map(f => relative(folder_path, f));
        
        return {
          content: [
            {
              type: 'text',
              text: `Found ${files.length} files matching pattern "${pattern}":\n\n${relativeFiles.join('\n')}`,
            },
          ],
        };
      }

      case 'list_files': {
        const { folder_path } = args as { folder_path: string };
        const files = await searchFiles(folder_path, '*');
        const relativeFiles = files.map(f => relative(folder_path, f));
        
        return {
          content: [
            {
              type: 'text',
              text: `All files in folder (${files.length} total):\n\n${relativeFiles.join('\n')}`,
            },
          ],
        };
      }

      case 'get_folder_info': {
        const { folder_path } = args as { folder_path: string };
        const metadata = getMetadata(folder_path);
        const files = await searchFiles(folder_path, '*');
        
        let info = `Folder: ${folder_path}\n`;
        info += `Total files: ${files.length}\n`;
        
        if (metadata) {
          info += `\nIndex metadata:\n`;
          info += `- Indexed at: ${metadata.indexedAt}\n`;
          info += `- Total files processed: ${metadata.totalFiles}\n`;
          info += `- Cache directory: ${metadata.cacheDir}\n`;
        } else {
          info += `\nNo index found. Run 'folder-mcp index "${folder_path}"' to create an index.`;
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Folder MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === fileURLToPath(`file://${process.argv[1]}`)) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
