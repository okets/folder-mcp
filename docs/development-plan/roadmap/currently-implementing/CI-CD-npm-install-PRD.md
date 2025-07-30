# CI/CD and npm Install - Product Requirements Document

## Executive Summary

This document outlines the complete CI/CD pipeline and npm distribution strategy for folder-mcp, a tool that transforms any machine into an MCP server with semantic search capabilities. The solution enables frictionless installation across Windows, macOS, and Linux platforms while bundling Python-based GPU-accelerated embeddings.

### Key Goals
- **Zero-friction installation**: `npm install -g folder-mcp` just works
- **Cross-platform support**: Windows, macOS (Intel/ARM), Linux
- **Bulletproof reliability**: 95%+ installation success rate
- **Production-ready**: Auto-starting daemon with user-level permissions

## Problem Statement

### Current Challenges
1. **Python Dependencies**: GPU-accelerated embeddings require Python, torch, and sentence-transformers
2. **Cross-Platform Complexity**: Different platforms need different binaries and installation methods
3. **User Experience**: Current installation requires manual Python setup, build tools, and technical knowledge
4. **Distribution Size**: Full Python environment + ML models can exceed 1GB

### User Impact
- Developers cannot easily install and use folder-mcp
- Installation failures due to missing dependencies
- Platform-specific issues require manual intervention
- No standardized distribution mechanism

## Solution Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Actions                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐      │
│  │   Windows   │  │    macOS    │  │     Linux       │      │
│  │   Builder   │  │   Builder   │  │    Builder      │      │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘      │
│         │                │                  │               │
│         └────────────────┴──────────────────┘               │
│                          │                                  │
│                    GitHub Releases                          │
│                    (Binary Storage)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                     ┌──────┴────────┐
                     │  npm Registry │
                     │  (folder-mcp) │
                     └──────┬────────┘
                            │
                     ┌──────┴────────┐
                     │  npm install  │
                     │  (postinstall)│
                     └──────┬────────┘
                            │
                ┌───────────┴───────────┐
                │   Download Platform   │
                │   Specific Binary     │
                └───────────┬───────────┘
                            │
                     ┌──────┴────────┐
                     │  Ready to Use │
                     │  folder-mcp   │
                     └───────────────┘
```

### Core Components

1. **CI/CD Pipeline**: Multi-platform builds on GitHub Actions
2. **Binary Distribution**: Pre-compiled Python executables via GitHub Releases
3. **npm Package**: Lightweight package with postinstall binary download
4. **Auto-Start Daemon**: Platform-specific service installation

## Technical Requirements

### 1. Python Binary Requirements

#### 1.1 Binary Specifications
- **Format**: Single-file executable using PyInstaller
- **Contents**: Python interpreter + all dependencies + embedding service
- **Size Target**: 40-60MB compressed per platform
- **Startup Time**: < 2 seconds
- **Memory Usage**: < 600MB with model loaded

#### 1.2 Platform Targets
```
python-embeddings-win32-x64.exe    # Windows 10+ (64-bit)
python-embeddings-darwin-x64       # macOS 11+ (Intel)
python-embeddings-darwin-arm64     # macOS 11+ (Apple Silicon)
python-embeddings-linux-x64        # Linux (glibc 2.17+)
```

#### 1.3 Included Dependencies
- Python 3.11 runtime
- sentence-transformers==2.2.2
- torch>=2.0.0 (CPU optimized)
- transformers>=4.20.0
- numpy>=1.21.0
- faiss-cpu>=1.7.4
- jsonrpclib-pelix>=0.4.3

### 2. CI/CD Pipeline Requirements

#### 2.1 GitHub Actions Workflow
```yaml
name: Build and Release
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-python-binaries:
    strategy:
      matrix:
        include:
          - os: windows-latest
            name: win32-x64
            python: '3.11'
          - os: macos-13
            name: darwin-x64
            python: '3.11'
          - os: macos-latest
            name: darwin-arm64
            python: '3.11'
          - os: ubuntu-latest
            name: linux-x64
            python: '3.11'
```

#### 2.2 Build Process
1. Checkout code
2. Setup Python environment
3. Install dependencies
4. Run PyInstaller with optimization flags
5. Compress binary (UPX where applicable)
6. Sign binary (Windows/macOS)
7. Upload to GitHub Releases

#### 2.3 Testing Requirements
- Binary must start successfully
- Health check endpoint must respond
- Basic embedding generation test
- Size validation (< 80MB uncompressed)

### 3. npm Package Requirements

#### 3.1 Package Structure
```
folder-mcp/
├── package.json
├── bin/
│   └── folder-mcp          # Main CLI entry
├── dist/                   # Compiled TypeScript
├── scripts/
│   ├── postinstall.js      # Binary download logic
│   └── uninstall.js        # Cleanup logic
└── .binary/                # Downloaded binaries (git-ignored)
```

#### 3.2 package.json Configuration
```json
{
  "name": "folder-mcp",
  "version": "1.0.0",
  "bin": {
    "folder-mcp": "./bin/folder-mcp"
  },
  "scripts": {
    "postinstall": "node scripts/postinstall.js",
    "preuninstall": "node scripts/uninstall.js"
  },
  "files": [
    "dist/",
    "bin/",
    "scripts/"
  ],
  "binaryConfig": {
    "version": "1.0.0",
    "baseUrl": "https://github.com/hanan/folder-mcp/releases/download",
    "platforms": {
      "win32-x64": "python-embeddings-win32-x64.exe",
      "darwin-x64": "python-embeddings-darwin-x64",
      "darwin-arm64": "python-embeddings-darwin-arm64",
      "linux-x64": "python-embeddings-linux-x64"
    }
  }
}
```

#### 3.3 Postinstall Script Logic
```javascript
// scripts/postinstall.js
async function postinstall() {
  const platform = getPlatform(); // win32-x64, darwin-arm64, etc.
  const binaryName = config.platforms[platform];
  
  if (!binaryName) {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }
  
  const url = `${config.baseUrl}/v${config.version}/${binaryName}`;
  const destination = path.join(__dirname, '..', '.binary', binaryName);
  
  await downloadBinary(url, destination);
  await verifyChecksum(destination);
  await makeExecutable(destination);
}
```

### 4. Auto-Start Daemon Requirements

#### 4.1 Platform-Specific Installation

**Windows (Task Scheduler)**:
```powershell
schtasks /create /tn "FolderMCP" /tr "%APPDATA%\npm\folder-mcp-daemon" /sc onlogon /rl highest
```

**macOS (launchd)**:
```xml
<!-- ~/Library/LaunchAgents/com.folder-mcp.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.folder-mcp</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/folder-mcp-daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

**Linux (systemd)**:
```ini
# ~/.config/systemd/user/folder-mcp.service
[Unit]
Description=Folder MCP Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/folder-mcp-daemon
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

#### 4.2 Daemon Features
- User-level permissions (no sudo required)
- Automatic restart on failure
- Health monitoring endpoint
- Graceful shutdown handling
- Log rotation

### 5. Model Management Requirements

#### 5.1 Curated Model List
```json
{
  "models": {
    "all-MiniLM-L6-v2": {
      "size": "80MB",
      "dimensions": 384,
      "speed": "fast",
      "quality": "good"
    },
    "all-mpnet-base-v2": {
      "size": "420MB", 
      "dimensions": 768,
      "speed": "medium",
      "quality": "excellent"
    }
  }
}
```

#### 5.2 First-Run Model Download
- Download on first embedding request
- Progress reporting to TUI
- Atomic downloads (temp file → rename)
- Checksum verification
- Cache in `~/.folder-mcp/models/`

## Implementation Plan

### Phase 1: Fix Python System (Week 1)
- [ ] Fix Python import issues (absolute imports)
- [ ] Update PythonEmbeddingService spawn logic
- [ ] Create PyInstaller spec file
- [ ] Test local binary creation

### Phase 2: CI/CD Pipeline (Week 2)
- [ ] Create GitHub Actions workflow
- [ ] Implement multi-platform builds
- [ ] Add binary compression/signing
- [ ] Set up GitHub Releases automation

### Phase 3: npm Package (Week 3)
- [ ] Create postinstall download script
- [ ] Implement platform detection
- [ ] Add progress reporting
- [ ] Test installation flow

### Phase 4: Auto-Start Integration (Week 4)
- [ ] Implement Windows Task Scheduler setup
- [ ] Implement macOS launchd setup
- [ ] Implement Linux systemd setup
- [ ] Add uninstall cleanup

### Phase 5: Testing & Documentation (Week 5)
- [ ] End-to-end installation tests
- [ ] Cross-platform validation
- [ ] Performance benchmarks
- [ ] User documentation

## Success Metrics

### Installation Success
- **Target**: 95%+ successful installs
- **Measurement**: Telemetry from postinstall script
- **Failure Tracking**: Error types and platforms

### Performance Metrics
- **Binary Size**: < 60MB per platform
- **Download Time**: < 1 minute on 10Mbps
- **Startup Time**: < 2 seconds
- **First Embedding**: < 5 seconds

### User Experience
- **Zero Configuration**: Works immediately after install
- **Cross-Platform**: Same experience on all platforms
- **Reliability**: Auto-restart on crashes
- **Uninstall**: Complete cleanup

## Risk Mitigation

### Technical Risks

1. **Binary Size Growth**
   - **Risk**: PyInstaller binaries exceed 100MB
   - **Mitigation**: Exclude unnecessary modules, use UPX compression
   - **Fallback**: Host on CDN with better bandwidth

2. **Antivirus False Positives**
   - **Risk**: Unsigned binaries flagged as malware
   - **Mitigation**: Code signing certificates for Windows/macOS
   - **Documentation**: Clear instructions for exceptions

3. **Platform Compatibility**
   - **Risk**: Binary fails on older OS versions
   - **Mitigation**: Test on minimum supported versions
   - **Solution**: Build on oldest supported OS

4. **Download Failures**
   - **Risk**: GitHub Releases rate limiting or downtime
   - **Mitigation**: Multiple mirror URLs
   - **Fallback**: Retry with exponential backoff

### Operational Risks

1. **CI/CD Costs**
   - **Risk**: GitHub Actions minutes exhausted
   - **Mitigation**: Optimize build times, cache dependencies
   - **Solution**: Self-hosted runners if needed

2. **Release Coordination**
   - **Risk**: Binary versions out of sync with npm package
   - **Mitigation**: Automated version bumping
   - **Process**: Single release triggers all builds

## Timeline & Milestones

### Week 1-2: Foundation
- Python system fixes
- Local binary creation
- Basic CI/CD setup

### Week 3-4: Distribution
- npm package creation
- Postinstall system
- Platform testing

### Week 5-6: Polish
- Auto-start implementation
- Documentation
- Beta testing

### Week 7-8: Launch
- Final testing
- npm publish
- Marketing preparation

## Appendix A: Platform Support Matrix

| Platform | Min Version | Architecture | Binary Size | Notes |
|----------|------------|--------------|-------------|-------|
| Windows | 10 (1809) | x64 | ~45MB | Requires VC++ 2015 |
| macOS | 11.0 | x64 | ~50MB | Intel only |
| macOS | 11.0 | arm64 | ~50MB | Apple Silicon |
| Ubuntu | 18.04 | x64 | ~45MB | glibc 2.27+ |
| CentOS | 7 | x64 | ~45MB | glibc 2.17+ |

## Appendix B: Binary Optimization Techniques

1. **PyInstaller Optimizations**
   - `--onefile` for single executable
   - `--windowed` removed (no GUI)
   - `--strip` for symbol removal
   - Custom hooks for package exclusion

2. **Compression**
   - UPX on Linux/Windows (30-50% reduction)
   - Native compression on macOS
   - 7-zip for download packages

3. **Model Optimization**
   - Quantized models where possible
   - Lazy loading of large components
   - Memory-mapped model files

## Appendix C: Security Considerations

1. **Code Signing**
   - Windows: EV Certificate ($300/year)
   - macOS: Apple Developer ID ($99/year)
   - Linux: GPG signatures

2. **Binary Verification**
   - SHA-256 checksums for all binaries
   - Signed checksum file
   - Automatic verification in postinstall

3. **Runtime Security**
   - No elevated permissions required
   - Sandboxed file access
   - Input validation for all APIs