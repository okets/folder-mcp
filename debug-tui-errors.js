#!/usr/bin/env node

console.log("TUI Error Analysis");
console.log("==================");
console.log();

console.log("IDENTIFIED ISSUES:");
console.log();

console.log("1. MULTIPLE useInput HOOKS (causing 'Raw mode is not supported' error):");
console.log("   - AppFullscreen.tsx: useRootInput() calls useInput");
console.log("   - TextInput component (line 43): Direct useInput call");
console.log("   - TextInputNode component (line 49): Direct useInput call");
console.log("   SOLUTION: All input should go through the root input handler only");
console.log();

console.log("2. DUPLICATE REACT KEYS:");
console.log("   - LayoutContainer.tsx (lines 56, 99): Using numeric index as key");
console.log("   - When multiple LayoutContainers exist, they'll have duplicate keys (0, 1, etc.)");
console.log("   SOLUTION: Use unique keys like 'layout-narrow-0' or 'layout-wide-0'");
console.log();

console.log("3. POTENTIAL KEY CONFLICTS:");
console.log("   - ConfigurationPanelSimple uses item.id as base for keys");
console.log("   - When in edit mode, creates keys like 'folder-path-label', 'folder-path-value'");
console.log("   - When not in edit mode, uses just 'folder-path'");
console.log("   - This could conflict if the same item appears in multiple states");
console.log();

console.log("RECOMMENDED FIXES:");
console.log("1. Remove useInput from TextInput and TextInputNode components");
console.log("2. Route all input through the focus chain system");
console.log("3. Fix LayoutContainer to use unique keys");
console.log("4. Ensure all list items have globally unique keys");