# Package Upgrade Tracking

**Created**: 2025-08-31  
**Purpose**: Track current working versions before upgrades for safe rollback capability

## Current Status: ✅ ALL TESTS PASSING
- **Test Suite**: All 491+ tests passing
- **Build**: Clean TypeScript compilation
- **Dependencies**: All packages working correctly
- **Last Verified**: 2025-08-31 after Vitest 1.6.1 → 3.2.4 upgrade

---

## Node.js Dependencies

### 🟢 Low Complexity Updates (Safe)

| Package | Current (Working) | Latest Available | Type | Notes |
|---------|-------------------|------------------|------|-------|
| `@modelcontextprotocol/sdk` | 1.12.1 | 1.17.4 | Minor | MCP protocol updates |
| `@types/react` | 19.1.8 | 19.1.12 | Patch | Type definitions only |
| `@typescript-eslint/eslint-plugin` | 8.39.0 | 8.41.0 | Minor | ESLint rule updates |
| `@typescript-eslint/parser` | 8.39.0 | 8.41.0 | Minor | TypeScript parser updates |
| `@typescript-eslint/typescript-estree` | 8.39.0 | 8.41.0 | Minor | AST parser updates |
| `chalk` | 5.4.1 | 5.6.0 | Minor | Terminal styling library |
| `eslint` | 9.32.0 | 9.34.0 | Minor | JavaScript linter |
| `ink` | 6.0.0 | 6.2.3 | Minor | TUI React library |
| `systeminformation` | 5.27.7 | 5.27.8 | Patch | System info library |
| `tsx` | 4.20.3 | 4.20.5 | Patch | TypeScript execution |

### 🟡 Medium Complexity Updates

| Package | Current (Working) | Latest Available | Type | Notes |
|---------|-------------------|------------------|------|-------|
| `@types/node` | 20.0.0 | 24.3.0 | Major | Node.js v24 type definitions |
| `typescript` | 5.0.0 | 5.8.0 | Minor/Major | Performance improvements, potential breaking changes |

### 🟠 Special Cases

| Package | Current (Working) | Latest Available | Type | Notes |
|---------|-------------------|------------------|------|-------|
| `@types/chokidar` | 2.1.7 | 1.7.5 | Regression | Latest is older - investigate |
| `express` | 5.1.0 | 5.1.1+ | Current | Already on latest major (v5) |

### ✅ Recently Updated (Working)

| Package | Previous | Current (Working) | Update Date | Status |
|---------|----------|-------------------|-------------|--------|
| `vitest` | 1.6.1 | 3.2.4 | 2025-08-31 | ✅ All tests passing |
| `@vitest/coverage-v8` | 1.6.1 | 3.2.4 | 2025-08-31 | ✅ Working correctly |

---

## Python Dependencies

### 🔴 High Impact Updates (Major Performance Gains)

| Package | Current (Working) | Latest Available | Type | Benefits |
|---------|-------------------|------------------|------|----------|
| `sentence-transformers` | 2.2.2 | 5.1.0 | Major | 2-4.5x performance improvements with ONNX/OpenVINO |
| `torch` | ≥2.0.0 | 2.8.0 | Major | Latest PyTorch optimizations, Apple Silicon improvements |
| `transformers` | ≥4.20.0 | 4.47.0+ | Major | Hugging Face model library updates |

### 🟢 Stable Dependencies

| Package | Current (Working) | Status | Notes |
|---------|-------------------|--------|-------|
| `faiss-cpu` | ≥1.7.4 | Stable | Vector similarity search |
| `jsonrpclib-pelix` | ≥0.4.3 | Stable | JSON-RPC communication |
| `numpy` | ≥1.21.0 | Stable | Numerical computing |
| `typing-extensions` | ≥4.0.0 | Stable | Type system extensions |

---

## Core System Information

### Node.js Environment
- **Node.js Version**: v24.2.0
- **npm Version**: Unknown (check with `npm --version`)
- **Platform**: Darwin (macOS)
- **Architecture**: ARM64 (Apple Silicon)

### Project Configuration
- **TypeScript**: Strict mode enabled
- **Test Framework**: Vitest 3.2.4 (recently upgraded)
- **Build Tool**: TypeScript compiler (tsc)
- **Package Manager**: npm

---

## Rollback Commands

### Emergency Rollback for Node.js Dependencies
```bash
# Rollback to current working versions
npm install --save-dev \
  @typescript-eslint/eslint-plugin@8.39.0 \
  @typescript-eslint/parser@8.39.0 \
  @typescript-eslint/typescript-estree@8.39.0 \
  @vitest/coverage-v8@3.2.4 \
  eslint@9.32.0 \
  tsx@4.20.3 \
  typescript@5.0.0 \
  vitest@3.2.4

npm install --save \
  @modelcontextprotocol/sdk@1.12.1 \
  @types/react@19.1.8 \
  chalk@5.4.1 \
  ink@6.0.0 \
  systeminformation@5.27.7
```

### Verify Rollback
```bash
npm run build
npm test
```

### Python Rollback
```bash
# Rollback Python dependencies
pip install sentence-transformers==2.2.2
pip install "torch>=2.0.0,<2.1.0"
pip install "transformers>=4.20.0,<4.30.0"
```

---

## Upgrade Process Checklist

### Before Each Upgrade
- [ ] Commit current working state
- [ ] Run full test suite: `npm test`
- [ ] Verify build works: `npm run build`
- [ ] Document current versions in this file

### After Each Upgrade
- [ ] Run full test suite: `npm test`
- [ ] Test TUI interface: `npm run tui`
- [ ] Test Python embeddings (if applicable)
- [ ] Verify MCP server functionality
- [ ] Update this document with new working versions

### Critical Test Commands
```bash
# Essential verification after upgrades
npm run debug:env
npm test
npm run build
npm run tui  # Test TUI interface
```

---

## Upgrade History

### 2025-08-31: Vitest Upgrade ✅
- **From**: vitest@1.6.1, @vitest/coverage-v8@1.6.1
- **To**: vitest@3.2.4, @vitest/coverage-v8@3.2.4
- **Result**: Success - All tests passing
- **Issues**: Fixed deprecated 'basic' reporter → 'default' with summary disabled
- **Time**: ~15 minutes

### [Future upgrades will be documented here]

---

## Notes

### Package Complexity Assessment
- **🟢 Green**: Safe, backward compatible, quick updates
- **🟡 Yellow**: Moderate risk, requires testing
- **🔴 Red**: High impact, significant testing needed
- **🟠 Orange**: Special cases requiring investigation

### Performance Opportunities
1. **sentence-transformers 5.1.0**: Biggest potential performance gain (2-4.5x speedup)
2. **PyTorch 2.8.0**: Apple Silicon optimizations
3. **TypeScript 5.8.0**: Build performance improvements

### Maintenance Strategy
- Keep this file updated with each successful upgrade
- Always test thoroughly before marking versions as "working"
- Prefer smaller, incremental updates over massive version jumps
- Document any configuration changes required for upgrades