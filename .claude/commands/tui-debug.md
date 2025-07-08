# TUI Debug Command

## Purpose
Start the human-agent collaborative TUI debugging process when the user reports a visual bug in the terminal interface.

## When to Use
- User reports text wrapping outside borders
- User reports incorrect truncation (too aggressive or not working)
- User reports visual layout issues in TUI components
- User provides ASCII screenshots showing visual problems
- User mentions TUI rendering problems

## Process Overview
This is a **ping-pong collaborative workflow** where:
1. **Human**: Reports visual bug with description/screenshot
2. **Agent**: Adds comprehensive character-level debug logs
3. **Agent**: Builds the code (`npm run build`)
4. **Human**: Runs TUI with stderr capture (`npm run tui 2>debug.log`)
5. **Human**: Shares debug.log contents
6. **Agent**: Analyzes debug output character-by-character
7. **Agent**: Identifies root cause and implements fix
8. **Repeat steps 2-7** until bug is resolved
9. **Agent**: Removes debug logs when complete

## What Agent Should Do

### Step 1: Add Debug Logs
Add comprehensive logging to relevant TUI components based on the bug report:

**For LogItem issues:**
```typescript
// At render method start
if (this.text.includes('TARGET_TEXT')) {
    console.error(`\n=== LOGITEM RENDER DEBUG ===`);
    console.error(`Text: "${this.text}" (${this.text.length} chars)`);
    console.error(`Icon: "${this.icon}" (${this.icon.length} chars)`);
    console.error(`maxWidth passed: ${maxWidth}`);
}

// At width calculations
console.error(`BUFFER: ${BUFFER}, availableForText: ${availableForText}`);
console.error(`Will truncate? ${text.length} > ${availableForText} = ${needsTruncation}`);
```

**For SecondaryPanel issues:**
```typescript
// At width calculation
console.error(`\n=== SECONDARYPANEL WIDTH CALCULATION ===`);
console.error(`Terminal columns: ${columns}`);
console.error(`Panel width: ${width}`);
console.error(`itemMaxWidth: ${itemMaxWidth}`);
console.error(`=== END PANEL WIDTH ===\n`);
```

### Step 2: Build Code
Always run `npm run build` after adding debug logs.

### Step 3: Wait for Human
Tell human to run: `npm run tui 2>debug.log` and share the debug.log contents.

### Step 4: Analyze Debug Output
Look for:
- Character count mismatches between expected and actual
- Width calculations that don't add up
- Truncation logic bypasses
- Buffer calculations that are too aggressive/conservative
- Text lengths vs available space discrepancies

### Step 5: Implement Fix
Based on debug analysis, fix the root cause:
- Adjust buffer calculations
- Fix truncation logic bypasses
- Correct width flow calculations
- Fix component rendering paths

### Step 6: Iterate
Repeat steps 2-5 until human confirms visual bug is resolved.

### Step 7: Clean Up
Remove all debug logging code when bug is confirmed fixed.

## Key Debugging Principles

### Character-Level Precision
- Every character position matters in TUI
- Debug logs must show exact character counts
- Compare calculated vs actual available space
- Account for icons, spaces, ellipsis, progress bars

### Common TUI Bug Patterns
1. **Same-color rendering path bypasses** - Text concatenation without truncation
2. **Buffer calculations too aggressive** - Reserved space larger than actual needs  
3. **Width flow miscalculation** - Terminal → Panel → Component → Item chain broken
4. **Progress bar space reservation** - Hardcoded widths not matching actual rendering

### Systematic Analysis
- Follow width flow: Terminal columns → Panel width → Component width → Item width
- Verify each calculation step with debug output
- Look for off-by-one errors in character counting
- Check for hardcoded values that don't match visual reality

## Success Criteria
- Human confirms visual bug is resolved
- TUI renders correctly without text wrapping or cutting
- Debug logs removed from codebase
- Code builds successfully without debug output

## Example Usage
```
Human: "The LogItem text is wrapping outside the border instead of truncating"
Agent: [Adds debug logs to LogItem truncation logic, builds code]
Agent: "Please run: npm run tui 2>debug.log and share the debug.log contents"
Human: [Shares debug.log]
Agent: [Analyzes output, finds truncation bypass in same-color path, fixes it]
Agent: [Builds code] "Please test again"
Human: "Fixed! Text now truncates properly"
Agent: [Removes debug logs, builds clean code]
```

## Notes
- This is a **collaborative process** - Agent cannot see TUI visually
- Human provides visual feedback, Agent provides systematic analysis
- Debug logs are temporary and must be removed when done
- Focus on character-level precision, not approximate solutions