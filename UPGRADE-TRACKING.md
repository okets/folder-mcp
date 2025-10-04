# Package Upgrade Tracking

**Created**: 2025-08-31
**Updated**: 2025-10-04
**Purpose**: Track current working versions before upgrades for safe rollback capability

## Current Status: ✅ ALL TESTS PASSING
- **Test Suite**: All 491+ tests passing
- **Build**: Clean TypeScript compilation
- **Dependencies**: All packages working correctly
- **Last Verified**: 2025-10-04 - Full version audit

---

## Node.js Dependencies

### 🟢 Low Complexity Updates (Safe - Patch/Minor)

| Package | Current (Installed) | Latest Available | Type | Notes |
|---------|---------------------|------------------|------|-------|
| `commander` | 14.0.0 | 14.0.1 | Patch | CLI framework - minor fixes |
| `mammoth` | 1.10.0 | 1.11.0 | Minor | DOCX parser updates |
| `pdf2json` | 3.2.0 | 3.2.2 | Patch | PDF parser bug fixes |
| `strip-ansi` | 7.1.0 | 7.1.2 | Patch | ANSI code stripping |
| `systeminformation` | 5.27.7 | 5.27.10 | Patch | System info library |
| `tsx` | 4.20.4 | 4.20.6 | Patch | TypeScript execution |
| `typescript` | 5.9.2 | 5.9.3 | Patch | TypeScript compiler |

### 🟡 Medium Complexity Updates (Minor Versions)

| Package | Current (Installed) | Latest Available | Type | Notes |
|---------|---------------------|------------------|------|-------|
| `@modelcontextprotocol/sdk` | 1.17.3 | 1.19.1 | Minor | MCP protocol updates - test carefully |
| `@types/react` | 19.1.10 | 19.2.0 | Minor | React type definitions |
| `@typescript-eslint/eslint-plugin` | 8.39.1 | 8.45.0 | Minor | ESLint rule updates |
| `@typescript-eslint/parser` | 8.39.1 | 8.45.0 | Minor | TypeScript parser updates |
| `@typescript-eslint/typescript-estree` | 8.39.1 | 8.45.0 | Minor | AST parser updates |
| `better-sqlite3` | 12.2.0 | 12.4.1 | Minor | SQLite bindings - critical for DB |
| `chalk` | 5.5.0 | 5.6.2 | Minor | Terminal styling library |
| `eslint` | 9.33.0 | 9.37.0 | Minor | JavaScript linter |
| `ink` | 6.2.0 | 6.3.1 | Minor | TUI React library |
| `react` | 19.1.1 | 19.2.0 | Minor | React core library |

### 🔴 High Impact Updates (Major Versions)

| Package | Current (Installed) | Latest Available | Type | Notes |
|---------|---------------------|------------------|------|-------|
| `@types/node` | 20.19.11 | 24.6.2 | Major | Node.js v24 type definitions - breaking changes |
| `eslint-plugin-react-hooks` | 5.2.0 | 6.1.1 | Major | React hooks ESLint rules - may need config updates |
| `onnxruntime-node` | 1.22.0-rev | 1.23.0 | Minor | ONNX runtime - critical for embeddings |

### 🟠 Special Cases

| Package | Current (Installed) | Latest Available | Type | Notes |
|---------|---------------------|------------------|------|-------|
| `@types/chokidar` | 2.1.7 | 1.7.5 | Regression | Latest is older version - DO NOT UPDATE |
| `sqlite-vec` | 0.1.6 | 0.1.7-alpha.2 | Alpha | Alpha release - stick with stable 0.1.6 |

### ✅ Recently Updated (Working)

| Package | Previous | Current (Working) | Update Date | Status |
|---------|----------|-------------------|-------------|--------|
| `vitest` | 1.6.1 | 3.2.4 | 2025-08-31 | ✅ All tests passing |
| `@vitest/coverage-v8` | 1.6.1 | 3.2.4 | 2025-08-31 | ✅ Working correctly |

---

## Python Dependencies

### 🟢 Low Complexity Updates (Patch Versions)

| Package | Current (Installed) | Latest Available | Type | Notes |
|---------|---------------------|------------------|------|-------|
| `certifi` | 2025.7.14 | 2025.8.3 | Patch | SSL certificates |
| `charset-normalizer` | 3.4.2 | 3.4.3 | Patch | Character encoding |
| `joblib` | 1.5.1 | 1.5.2 | Patch | Parallel processing |
| `MarkupSafe` | 3.0.2 | 3.0.3 | Patch | XML/HTML escaping |
| `numpy` | 2.3.2 | 2.3.3 | Patch | Numerical computing |
| `pip` | 25.0 | 25.2 | Minor | Package manager |
| `PyYAML` | 6.0.2 | 6.0.3 | Patch | YAML parsing |
| `requests` | 2.32.4 | 2.32.5 | Patch | HTTP library |
| `scipy` | 1.16.1 | 1.16.2 | Patch | Scientific computing |
| `scikit-learn` | 1.7.1 | 1.7.2 | Patch | Machine learning library |
| `typing_extensions` | 4.14.1 | 4.15.0 | Patch | Type system extensions |

### 🟡 Medium Complexity Updates (Minor Versions)

| Package | Current (Installed) | Latest Available | Type | Notes |
|---------|---------------------|------------------|------|-------|
| `faiss-cpu` | 1.11.0.post1 | 1.12.0 | Minor | Vector similarity search - test carefully |
| `filelock` | 3.18.0 | 3.19.1 | Minor | File locking utility |
| `fsspec` | 2025.7.0 | 2025.9.0 | Minor | Filesystem interfaces |
| `hf-xet` | 1.1.5 | 1.1.10 | Patch | Hugging Face XET integration |
| `huggingface-hub` | 0.34.3 | 0.35.3 | Minor | Hugging Face Hub client |
| `regex` | 2025.7.29 | 2025.9.18 | Minor | Regular expressions |
| `safetensors` | 0.5.3 | 0.6.2 | Minor | Safe tensor serialization |
| `sentence-transformers` | 5.0.0 | 5.1.1 | Minor | **ALREADY UPGRADED!** Was 2.2.2, now 5.0.0 ✅ |
| `tokenizers` | 0.21.4 | 0.22.1 | Minor | Text tokenization |
| `torch` | 2.7.1 | 2.8.0 | Minor | **ALREADY UPGRADED!** Was 2.0.0, now 2.7.1 ✅ |
| `transformers` | 4.54.1 | 4.57.0 | Minor | **ALREADY UPGRADED!** Was 4.20.0, now 4.54.1 ✅ |

### ✅ Major Upgrades Already Completed!

Good news! The major Python upgrades from the August plan have already been completed:

| Package | Old (Aug 2025) | Current (Installed) | Target (Oct 2025) | Status |
|---------|----------------|---------------------|-------------------|--------|
| `sentence-transformers` | 2.2.2 | 5.0.0 | 5.1.1 | ✅ Major upgrade done, minor update available |
| `torch` | 2.0.0 | 2.7.1 | 2.8.0 | ✅ Major upgrade done, minor update available |
| `transformers` | 4.20.0 | 4.54.1 | 4.57.0 | ✅ Major upgrade done, minor update available |

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
# Rollback to October 2025 working versions (current state)
npm install --save-dev \
  @typescript-eslint/eslint-plugin@8.39.1 \
  @typescript-eslint/parser@8.39.1 \
  @typescript-eslint/typescript-estree@8.39.1 \
  @vitest/coverage-v8@3.2.4 \
  eslint@9.33.0 \
  tsx@4.20.4 \
  typescript@5.9.2 \
  vitest@3.2.4

npm install --save \
  @modelcontextprotocol/sdk@1.17.3 \
  @types/react@19.1.10 \
  better-sqlite3@12.2.0 \
  chalk@5.5.0 \
  ink@6.2.0 \
  react@19.1.1 \
  systeminformation@5.27.7
```

### Verify Rollback
```bash
npm run build
npm test
npm run tui  # Test TUI interface
```

### Python Rollback
```bash
# Rollback to October 2025 working versions (current state)
pip install sentence-transformers==5.0.0
pip install torch==2.7.1
pip install transformers==4.54.1
pip install faiss-cpu==1.11.0.post1
pip install numpy==2.3.2
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

## Recommended Upgrade Strategy (October 2025)

### Phase 1: Safe Quick Wins (Low Risk) 🟢
Start with patch versions that are unlikely to cause issues:

```bash
# Node.js safe updates
npm update commander pdf2json strip-ansi systeminformation tsx typescript

# Python safe updates
pip install --upgrade certifi charset-normalizer joblib MarkupSafe numpy PyYAML requests scipy scikit-learn typing-extensions
```

**Estimated Time**: 15-20 minutes
**Risk Level**: Very Low
**Test Required**: Quick smoke test

### Phase 2: Medium Impact Updates 🟡
Update minor versions with more comprehensive testing:

```bash
# Node.js medium updates
npm update @modelcontextprotocol/sdk @types/react chalk eslint ink react mammoth
npm update @typescript-eslint/eslint-plugin @typescript-eslint/parser @typescript-eslint/typescript-estree

# Python medium updates
pip install --upgrade sentence-transformers torch transformers tokenizers huggingface-hub safetensors
```

**Estimated Time**: 45-60 minutes
**Risk Level**: Medium
**Test Required**: Full test suite + manual TUI testing + Python embeddings testing

### Phase 3: Critical Updates (Test Carefully) 🔴
These require the most attention:

```bash
# Critical Node.js updates
npm update better-sqlite3  # Database bindings - critical
npm update onnxruntime-node  # ONNX runtime - affects embeddings

# Only if needed:
npm update @types/node@24.6.2  # Major version - breaking changes possible
npm update eslint-plugin-react-hooks@6.1.1  # Major version - may need config updates
```

**Estimated Time**: 1-2 hours
**Risk Level**: High
**Test Required**: Full integration testing, database operations, embeddings, TUI, MCP endpoints

### Phase 4: Do NOT Update ⛔
```bash
# DO NOT UPDATE THESE:
# @types/chokidar - Latest version is a regression (1.7.5 < 2.1.7)
# sqlite-vec - Latest is alpha (0.1.7-alpha.2), stick with stable 0.1.6
```

---

## Upgrade History

### 2025-10-04: Version Audit ✅
- **Action**: Comprehensive version audit of all dependencies
- **Findings**:
  - Major Python upgrades already completed (sentence-transformers, torch, transformers)
  - 22 Node.js packages have updates available
  - 21 Python packages have updates available
  - Created new upgrade strategy with phased approach
- **Result**: Documentation updated with current state and upgrade plan

### 2025-08-31: Vitest Upgrade ✅
- **From**: vitest@1.6.1, @vitest/coverage-v8@1.6.1
- **To**: vitest@3.2.4, @vitest/coverage-v8@3.2.4
- **Result**: Success - All tests passing
- **Issues**: Fixed deprecated 'basic' reporter → 'default' with summary disabled
- **Time**: ~15 minutes

### [Between Aug-Oct 2025]: Major Python Upgrades ✅
- **sentence-transformers**: 2.2.2 → 5.0.0 (Major performance improvements achieved!)
- **torch**: 2.0.0 → 2.7.1 (Apple Silicon optimizations)
- **transformers**: 4.20.0 → 4.54.1 (Latest Hugging Face features)
- **Result**: ✅ Working perfectly - the performance goals from August have been achieved!

---

## Notes

### Package Complexity Assessment
- **🟢 Green**: Safe, backward compatible, quick updates (patch/minor)
- **🟡 Yellow**: Moderate risk, requires testing (minor with potential changes)
- **🔴 Red**: High impact, significant testing needed (major or critical infrastructure)
- **🟠 Orange**: Special cases requiring investigation or avoidance
- **⛔ Do Not Update**: Regressions, alpha versions, or known issues

### Key Achievements
✅ **Major Python performance goals achieved!** The big upgrades identified in August 2025 have been successfully completed:
- sentence-transformers 2.2.2 → 5.0.0 (2-4.5x performance gain)
- torch 2.0.0 → 2.7.1 (Apple Silicon optimizations)
- transformers 4.20.0 → 4.54.1 (Latest features)

### Current Opportunities
1. **better-sqlite3**: Database performance improvements in 12.4.1
2. **onnxruntime-node**: ONNX runtime updates in 1.23.0
3. **Final Python polish**: Bring sentence-transformers/torch/transformers to latest minor versions
4. **ESLint ecosystem**: Unified update to latest 8.45.0 across all ESLint packages

### Maintenance Strategy
- Keep this file updated with each successful upgrade
- Always test thoroughly before marking versions as "working"
- Prefer phased upgrades: Safe (🟢) → Medium (🟡) → Critical (🔴)
- Document any configuration changes required for upgrades
- Never skip testing, even for "safe" patch updates