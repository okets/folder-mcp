# Lesson Learned: Horizontal Layout Truncation - Percentage vs Character Counting

**Date:** 2025-01-11
**Component:** `HorizontalListRenderer` (NavigationPanel)
**Problem:** Navigation panel wrapping instead of truncating at certain terminal widths
**Time to Solution:** ~3 hours of iterative debugging

---

## Executive Summary

**The Wrong Approach:** Using percentage-based truncation thresholds (e.g., "bail to vertical if truncation > 10%")
**The Right Approach:** Simple character counting (e.g., "bail to vertical if textSpace < 3 chars")

**Root Cause:** Percentage thresholds tried to predict quality, but they:
1. Created mismatch between threshold calculation and actual rendering
2. Were calculated on different bases (item width vs text width)
3. Didn't account for all safety buffers consistently

---

## What We Tried (Chronologically)

### Attempt 1: Initial Implementation with 10% Threshold
```typescript
// Calculate longest item width (text + icon)
const longestItemWidth = Math.max(...items.map(item =>
    getVisualWidth(item.text) + 2 // +2 for icon and space
));

// Check truncation percentage
const truncationNeeded = longestItemWidth - availablePerItem;
const truncationPercentage = (truncationNeeded / longestItemWidth) * 100;

// Threshold: Bail if truncation > 10%
const canFitHorizontally = truncationPercentage <= 10 && availablePerItem >= 5;
```

**Problem:** At width=36, truncation was 12.5%, exceeding 10% threshold, causing premature bailout even though items fit fine.

---

### Attempt 2: Increased Threshold to 15%
```typescript
const canFitHorizontally = truncationPercentage <= 15 && availablePerItem >= 5;
```

**Problem:** Just moved the breakpoint. At width=35, truncation became 15.7%, still causing bailout.

---

### Attempt 3: Match Threshold to Rendering Calculation
```typescript
// Threshold calculation
const availableForText = availablePerItem - iconWidth(2) - safetyBuffer(1);
const longestTextWidth = Math.max(...items.map(item => getVisualWidth(item.text)));
const truncationPercentage = (longestTextWidth - availableForText) / longestTextWidth * 100;

// Rendering calculation (same formula)
const availableForText = availablePerItem - iconWidth(2) - safetyBuffer(1);
```

**Problem:** Still percentage-based! The fundamental issue remained - percentages don't account for actual character space needs.

---

### Attempt 4: Add Safety Buffers
```typescript
const truncationSafetyBuffer = 1;
const availableForText = availablePerItem - iconWidth(2) - safetyBuffer(1);
```

**Problem:** Added more buffers but still used percentage thresholds. The mismatch between calculation and rendering persisted.

---

## The Actual Solution: Simple Character Counting

### What Changed
```typescript
// OLD: Percentage-based threshold
const longestItemWidth = Math.max(...items.map(item =>
    getVisualWidth(item.text) + iconWidth
));
const truncationPercentage = (longestItemWidth - availablePerItem) / longestItemWidth * 100;
const canFitHorizontally = truncationPercentage <= 15 && availablePerItem >= 5;

// NEW: Simple character counting
const availableForText = availablePerItem - iconWidth(2) - safetyBuffer(1);
const canFitHorizontally = availableForText >= 3; // Minimum 3 chars for "Ab…"
```

### The Logic Flow (Simple)

**Step 1: Calculate Available Width**
```
totalWidth = terminalWidth
- borders (3 chars: left + right + internal)
- separators (2 chars per gap between items)
- safety buffer (1 char to prevent terminal wrapping)
= availableWidth
```

**Step 2: Divide Equally Among Items**
```
spacePerItem = floor(availableWidth / itemCount)
```

**Step 3: Calculate Text Space**
```
textSpace = spacePerItem - icon (1) - space after icon (1) - safety (1)
```

**Step 4: Simple Threshold**
```
if (textSpace < 3) {
    // Too small for meaningful text ("Ab…")
    switchToVertical()
} else {
    // Truncate text to fit in textSpace
    if (textWidth > textSpace) {
        text = text.substring(0, textSpace - 1) + '…'
    }
}
```

---

## Why Percentage Thresholds Failed

### Problem 1: Ambiguous Base
Percentages were calculated on different bases at different times:
- Threshold: `(itemWidth - available) / itemWidth`
- But itemWidth = text + icon, and available = for everything
- Created conceptual mismatch

### Problem 2: Predicting Quality
Percentages tried to predict "is this truncation acceptable?" but:
- 10% of "Demo Controls" (13 chars) = 1.3 chars = "Demo Contro…" ← looks fine!
- 10% of "Hi" (2 chars) = 0.2 chars = "Hi" ← no truncation needed!
- Same percentage, different outcomes

### Problem 3: Mismatch with Rendering
Even when we "matched" calculations, we had:
- Threshold: `availableForText = available - icon - buffer`
- Rendering: `availableForText = available - icon - buffer`
- BUT: Threshold used this for percentage, rendering used it for actual truncation
- The percentage was an unnecessary abstraction layer

### Problem 4: Multiple Buffers Accumulation
We had:
- Structural safety buffer: 1 char
- Truncation safety buffer: 1 char
- Icon and space: 2 chars

Each buffer was correct individually, but when calculating percentages, we couldn't clearly see if all buffers were accounted for in the same way on both sides of the equation.

---

## Why Character Counting Works

### Benefit 1: Direct Measurement
No abstraction layer:
- "I have 10 chars of space"
- "This text is 14 chars"
- "Truncate to 9 chars + ellipsis"
- Simple, verifiable, no interpretation needed

### Benefit 2: Single Threshold
One clear rule: `textSpace >= 3`
- Means: At minimum show "Ab…"
- Universal: Doesn't matter what the original text was
- Testable: Easy to verify with calculator

### Benefit 3: Exact Match with Rendering
Threshold calculation IS the rendering calculation:
```typescript
// Both use identical formula
const availableForText = availablePerItem - iconWidth(2) - safetyBuffer(1);

// Threshold: Is there enough space?
if (availableForText >= 3) { /* use horizontal */ }

// Rendering: Truncate to fit
if (textWidth > availableForText) {
    text = text.substring(0, availableForText - 1) + '…';
}
```

### Benefit 4: Visible Buffers
All buffers are explicit and visible:
```
spacePerItem = 15
- icon: 1
- space: 1
- safety: 1
= 12 chars for text
```
Can trace each subtraction, verify it matches rendering.

---

## Key Insights

### 1. Percentages Hide Absolute Constraints
When working with fixed-width terminal layouts, **character counts are the fundamental unit**. Percentages are a derived metric that obscures the actual constraint: "will these N characters fit in M space?"

### 2. Threshold Should Match Rendering Exactly
If threshold calculation and rendering calculation differ even slightly, edge cases will cause mismatches. The solution: **threshold IS rendering** - same formula, same result.

### 3. Simplicity Over Cleverness
A "smart" percentage-based threshold that tries to predict quality is actually **less robust** than a simple absolute threshold: "3 chars minimum".

### 4. Debug by Measuring Both Sides
The breakthrough came from adding debug logging that showed:
- What threshold calculated
- What rendering actually did
- The mismatch between them

Without this visibility, we were fixing symptoms instead of root causes.

---

## Architecture Lessons

### Anti-Pattern: Dual Calculations
```typescript
// ANTI-PATTERN: Threshold calculates one way, rendering calculates another
function shouldUseHorizontal(items, width) {
    const available = calculateSpace(width); // Formula A
    const needed = calculateNeeded(items);    // Formula B
    return (needed / available) < 0.10;       // Percentage threshold
}

function renderHorizontal(items, width) {
    const textSpace = calculateTextSpace(width); // Formula C
    items.forEach(item => {
        if (item.text.length > textSpace) {
            truncate(item.text, textSpace);      // Direct truncation
        }
    });
}
```

### Best Practice: Single Source of Truth
```typescript
// BEST PRACTICE: Threshold and rendering use identical calculation
function calculateTextSpace(width, itemCount) {
    const available = width - structuralOverhead;
    const perItem = Math.floor(available / itemCount);
    return perItem - iconWidth - safetyBuffer; // SINGLE formula
}

function shouldUseHorizontal(items, width) {
    const textSpace = calculateTextSpace(width, items.length);
    return textSpace >= 3; // Absolute threshold
}

function renderHorizontal(items, width) {
    const textSpace = calculateTextSpace(width, items.length); // SAME formula
    items.forEach(item => {
        if (item.text.length > textSpace) {
            truncate(item.text, textSpace);
        }
    });
}
```

---

## Testing Recommendations

### What To Test
1. **Edge widths**: Test at widths where threshold triggers (e.g., width=33 if threshold is 3 chars)
2. **Character counting**: Manually count characters in rendered output vs calculation
3. **No wrapping**: Verify that at NO width does text wrap to next line
4. **Progressive truncation**: Verify that as width decreases, truncation increases smoothly

### How To Test
```bash
# Run TUI at specific width
npm run tui

# Capture debug output
npm run tui 2>debug.log

# Resize terminal and observe:
# - At what width does truncation start?
# - At what width does it switch to vertical?
# - Does any intermediate width cause wrapping?

# Manually verify character counts:
# Terminal width: 35
# Expected: 35 - 3 (borders) - 2 (separator) - 1 (safety) = 29 / 2 = 14 per item
# Expected: 14 - 2 (icon) - 1 (safety) = 11 chars for text
# Visual: Count characters on screen - should match!
```

---

## Code Review Checklist

When reviewing truncation/layout code:

- [ ] Are thresholds based on character counts (not percentages)?
- [ ] Do threshold and rendering use identical space calculation?
- [ ] Are all safety buffers accounted for consistently?
- [ ] Can you manually verify the math with a calculator?
- [ ] Is there a single source of truth for space calculation?
- [ ] Are edge cases tested (minimum width, maximum width)?
- [ ] Does debug logging show character-level details?

---

## Related Patterns

### StatusBar Progressive Degradation
StatusBar doesn't use percentage thresholds either - it tries to fit, and if it doesn't, it removes elements progressively:
1. Try full format
2. Try without descriptions
3. Try without colons
4. Remove items from right

This is also character-counting based, not percentage-based.

### SelectionListItem Adaptive Layout
SelectionListItem DOES use 10% threshold, but for a different purpose:
- It's switching between vertical and horizontal LAYOUTS
- Not truncating within a single layout
- The 10% threshold represents "visual quality" for DISPLAY mode choice
- Once a layout is chosen, truncation is done with character counting

The lesson: Percentages for **layout mode selection** are OK. Percentages for **truncation thresholds** are problematic.

---

## Final Recommendation

**For any horizontal text layout with truncation:**
1. Calculate available character space using simple arithmetic
2. Use absolute character threshold (e.g., `>= 3`) for bailout
3. Truncate text to fit calculated space
4. Make threshold calculation identical to rendering calculation
5. Test with manual character counting

**Avoid:**
- Percentage-based truncation thresholds
- Dual calculation paths (threshold vs rendering)
- Abstract quality metrics
- Predicting whether truncation "looks good"

**Remember:**
> "When in doubt, count the chars" - The fundamental unit of terminal layout is the character, not the percentage.
