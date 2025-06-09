# Installation Guide

## Prerequisites

Before installing folder-mcp, ensure you have:

- Node.js 18 or higher
- npm package manager
- At least 2GB of free disk space
- Internet connection for initial model download

## Installation Steps

### Option 1: Install from npm (Recommended)

```bash
npm install -g folder-mcp
```

### Option 2: Install from source

1. Clone the repository:
   ```bash
   git clone https://github.com/okets/folder-mcp.git
   cd folder-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link for global use:
   ```bash
   npm link
   ```

## Verification

After installation, verify it works:

```bash
folder-mcp --version
folder-mcp --help
```

You should see the version number and available commands.

## First Usage

To index your first folder:

```bash
folder-mcp index ./your-documents-folder
```

The tool will:
1. Scan for supported file types
2. Download the embedding model (first time only)
3. Parse and chunk documents
4. Generate embeddings
5. Create a searchable index

## Troubleshooting

### Model Download Issues
If model download fails, check your internet connection and try again. The model is cached locally after the first successful download.

### Permission Errors
Ensure you have write permissions to the target folder for cache creation.

### Memory Issues
For very large document collections, increase Node.js heap size:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```
