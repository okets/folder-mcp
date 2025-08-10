# Contributing to folder-mcp

## 🚨 Critical: Node.js Version Management

**Before reporting bugs or debugging**, ensure you're using the correct Node.js version:

### Quick Environment Check
```bash
# 1. Check your Node version matches requirements
npm run debug:info

# 2. If version is wrong, fix it:
nvm use                    # Uses .nvmrc version
# or 
nvm install 24.2.0 && nvm use 24.2.0
```

### Common Debugging Issues from Wrong Node Versions

| Issue | Cause | Solution |
|-------|--------|----------|
| "Works on my machine" | Different Node versions | Run `npm run debug:info` on both machines |
| Random test failures | Async timing differences | Ensure same Node version with `nvm use` |
| Import/export errors | Module system changes | Upgrade to Node 20+ |
| Performance issues | V8 engine differences | Use consistent Node version |
| TypeScript errors | @types/node mismatch | Check `npm run debug:info` output |

## Debugging Workflow

### 1. Environment Verification
```bash
# Always start debugging with this:
npm run debug:info

# Should show:
# ✅ Node version requirement satisfied
# Node: v24.2.0 | Platform: darwin | Arch: arm64
```

### 2. Report Environment in Issues
When reporting bugs, **always include**:
- Full output of `npm run debug:info`
- Platform-specific details (Windows Terminal vs PowerShell vs WSL)
- Screenshots if TUI-related

### 3. Cross-Platform Testing
If you're contributing features:
```bash
# Test on your platform
npm test

# Ask for cross-platform verification in PR
# Include debug:info output in PR description
```

## Windows Contributors Special Notes

### Multiple Node Versions Issue
Windows often has multiple Node installations:
- **VSCode**: Uses one version
- **PowerShell**: Uses another version  
- **CMD**: Uses yet another version

### Solution
```powershell
# Install nvm-windows: https://github.com/coreybutler/nvm-windows
nvm install 24.2.0
nvm use 24.2.0
nvm alias default 24.2.0

# Verify in each terminal:
node --version    # Should show v24.2.0
```

## Development Workflow

### 1. First Time Setup
```bash
git clone https://github.com/your-org/folder-mcp
cd folder-mcp
nvm use                    # Uses .nvmrc automatically
npm install               # Checks Node version
npm run debug:info        # Verify environment
npm test                  # Should pass
```

### 2. Before Making Changes
```bash
npm run debug:info        # Document your environment
npm test                  # Baseline - should pass
```

### 3. After Making Changes
```bash
npm run build             # Build your changes
npm test                  # Tests should still pass
npm run debug:info        # Include in PR if changed
```

## Debugging Specific Issues

### TUI Visual Bugs
```bash
# Run with environment info
npm run debug:info
npm run tui 2>debug.log

# Include both environment info AND debug.log in bug report
```

### Embedding/Python Issues  
```bash
# Environment context is critical for Python subprocess issues
npm run debug:info
npm run test:embedding:python

# Include full debug:info output - Python path matters!
```

### Configuration Issues
```bash
npm run debug:info                    # Shows environment variables
npm run config show --sources        # Shows config hierarchy
```

## PR Guidelines

### Required Information
Every PR must include:
1. **Environment tested on**: Output of `npm run debug:info`
2. **Cross-platform consideration**: Note if Windows/macOS/Linux specific
3. **Test results**: `npm test` output
4. **Breaking changes**: Any Node version requirement changes

### Example PR Template
```markdown
## Environment Tested
```
[Output of npm run debug:info]
```

## Changes Made
- Feature X added
- Bug Y fixed

## Testing
- [x] All tests pass (`npm test`)  
- [x] Manual testing completed
- [x] Cross-platform considerations addressed
```

This ensures debugging consistency across all contributors and eliminates "works on my machine" issues!