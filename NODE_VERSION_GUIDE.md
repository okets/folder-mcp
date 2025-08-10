# Node.js Version Management Guide

## Required Version
This project requires **Node.js ≥20.0.0**. The recommended version is **24.2.0**.

## Quick Setup

### 1. Check Your Current Version
```bash
node --version
```

### 2. Install Node Version Manager

#### On macOS/Linux (nvm)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Restart terminal, then:
nvm use
```

#### On Windows (nvm-windows)
1. Download from: https://github.com/coreybutler/nvm-windows/releases
2. Install and restart terminal
3. Run: `nvm use 24.2.0`

### 3. Alternative: Direct Installation
- Download from: https://nodejs.org/
- Choose version 20.x LTS or newer

## For Contributors

### First Time Setup
```bash
git clone <repository>
cd folder-mcp
nvm use          # Uses version from .nvmrc
npm install      # Will fail if Node version is too old
```

### Switching Between Projects
```bash
nvm use          # Automatically uses .nvmrc version
```

## For End Users

The `npm install -g folder-mcp` command will check your Node version and provide clear error messages if it's too old.

## Troubleshooting

### Multiple Node Versions on Windows
- VSCode uses one version, PowerShell uses another
- Solution: Use `nvm use 24.2.0` in each terminal
- Or set system PATH to prioritize one version

### Version Mismatch Errors
```bash
npm run build    # Will show clear error if version is wrong
```

## Why This Matters
- **Consistency**: All developers use the same Node version
- **Features**: Project uses Node 20+ features that don't exist in older versions
- **Performance**: Newer Node versions are faster and more stable
- **Security**: Older versions may have security vulnerabilities