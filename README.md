# folder-mcp

**Model Context Protocol Server for Folder Operations**

A Model Context Protocol (MCP) server that provides tools for reading and analyzing folder structures, enabling LLMs to interact with local file systems safely and efficiently.

## Overview

folder-mcp is an MCP server that allows Large Language Models to read files, search folders, and analyze directory structures. It provides secure, controlled access to local folders through a standardized protocol interface.

## Features

✅ **Secure File Access**
- Read files from specified folders with path validation
- Security checks to prevent directory traversal attacks
- Support for various file types and encodings

✅ **File System Operations**
- List all files in a folder recursively
- Search files by name patterns (glob support)
- Get folder information and metadata
- Exclude common directories like node_modules and .git

✅ **MCP Integration**
- Standard Model Context Protocol server implementation
- Works with Claude Desktop and other MCP clients
- Stdio transport for seamless integration
- Structured tool definitions with JSON schemas

✅ **Developer Friendly**
- TypeScript implementation with full type safety
- Clear error handling and informative responses
- Simple CLI interface for testing and development

## Installation

```bash
git clone https://github.com/okets/folder-mcp.git
cd folder-mcp
npm install
npm run build
```

## Current Status

🚀 **Version 1.0** - Basic MCP Server (13/30 planned features complete)

This is the foundation release providing secure file system access through MCP. The full vision includes semantic search, embeddings, and intelligent document parsing - see [ROADMAP.md](ROADMAP.md) for the complete development plan.

**What works now:**
- ✅ Basic file reading and folder operations
- ✅ Security validation and path protection  
- ✅ Pattern-based file searching
- ✅ MCP protocol integration

**Coming next:** Smart text chunking, semantic embeddings, vector search ([see all 30 planned features](GITHUB_ISSUES.md))

## Usage

### As an MCP Server

This server is designed to be used with MCP clients like Claude Desktop. Add it to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": ["path/to/folder-mcp/dist/index.js"]
    }
  }
}
```

### Available Tools

The server provides four main tools:

#### 1. `read_file`
Read the contents of a specific file within a folder.

**Parameters:**
- `folder_path`: Path to the folder containing the file
- `file_path`: Relative path to the file within the folder

#### 2. `search_files`
Search for files matching a specific pattern.

**Parameters:**
- `folder_path`: Path to the folder to search
- `pattern`: File pattern (e.g., "*.md", "*.txt", "config.*")

#### 3. `list_files`
List all files in a folder recursively.

**Parameters:**
- `folder_path`: Path to the folder to list

#### 4. `get_folder_info`
Get information about a folder including file count and metadata.

**Parameters:**
- `folder_path`: Path to the folder to analyze

### Security Features

- **Path Validation**: Prevents access to files outside the specified folder
- **Directory Exclusions**: Automatically excludes node_modules, .git, and cache folders
- **Error Handling**: Graceful handling of permission errors and invalid paths

## Architecture

### MCP Server Implementation

The server implements the Model Context Protocol standard with the following components:

```
📡 MCP Client (Claude Desktop) ↔ 📞 Stdio Transport ↔ 🖥️ MCP Server ↔ 📁 File System
```

### File Access Pattern

```
1. Client Request → 2. Tool Validation → 3. Path Security Check → 4. File Operation → 5. Response
```

### Server Components

- **Tool Handlers**: Process read_file, search_files, list_files, and get_folder_info requests
- **Security Layer**: Validates paths and prevents directory traversal
- **File Operations**: Uses Node.js fs and glob for efficient file system access
- **Transport Layer**: Stdio transport for communication with MCP clients

## Technical Details

### Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `glob`: Pattern-based file searching
- `typescript`: Type-safe development
- Additional libraries for future file parsing capabilities

### File Patterns

The server uses glob patterns for file searching:
- `*` - All files
- `*.md` - Markdown files only  
- `**/*.js` - JavaScript files recursively
- `config.*` - Any file starting with "config"

### Excluded Directories

Automatically excluded from all operations:
- `**/node_modules/**`
- `**/.git/**`
- `**/.folder-mcp-cache/**`

## Development

### Building the Project

```bash
npm run build
```

### Running the Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Testing with MCP Clients

The server can be tested with any MCP-compatible client. For Claude Desktop, add the configuration to your settings file.

## Future Enhancements

**📋 Development Roadmap:** See [ROADMAP.md](ROADMAP.md) for visual progress and [GITHUB_ISSUES.md](GITHUB_ISSUES.md) for detailed task breakdown.

### Planned Features (17 remaining tasks):
- **Phase 3:** Smart text chunking and semantic embeddings
- **Phase 4:** FAISS vector search and similarity matching  
- **Phase 5:** Enhanced MCP integration with semantic search
- **Phase 6:** Real-time file watching and configuration system
- **Phase 7:** Performance optimization and comprehensive testing
- **Phase 8:** Documentation and npm release

### Vision: Universal Folder-to-MCP Tool
Transform any folder into an intelligent knowledge base with:
- **Multi-format parsing**: PDF, Word, Excel, PowerPoint with structure preservation
- **Semantic embeddings**: Nomic Embed model for intelligent content understanding  
- **Vector search**: FAISS-powered similarity search for context-aware retrieval
- **Smart chunking**: Meaning-based content segmentation
- **Real-time updates**: File watching with automatic re-indexing
- **RAG capabilities**: Enable LLMs to query folder contents intelligently

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the Model Context Protocol SDK
- Uses TypeScript for type safety and developer experience
- Designed for secure and efficient file system access
- Compatible with Claude Desktop and other MCP clients

---

**Enable your LLM to work with local folders through the Model Context Protocol!** 🚀
