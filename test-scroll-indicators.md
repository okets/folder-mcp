# Scroll Indicator Fix Verification

## Changes Made

### Before (Element-Based Logic) ❌
```typescript
const isFirstVisible = index === 0;
const isLastVisible = index === visibleElements.length - 1;

if (isFirstVisible && scrollIndicators.showUp) {
    prefix = '│▲';
} else if (isLastVisible && scrollIndicators.showDown) {
    prefix = '│▼';  // ← Wrong: on first line of last element
}
```

### After (Line-Based Logic) ✅
```typescript
let currentViewportLine = 0;
const maxViewportLines = viewport.contentHeight;

// For each rendered line:
if (currentViewportLine === 0 && scrollIndicators.showUp) {
    prefix = '│▲'; // First line of viewport
} else if (currentViewportLine === maxViewportLines - 1 && scrollIndicators.showDown) {
    prefix = '│▼'; // Last line of viewport
}
currentViewportLine++;
```

## Expected Visual Fix

### Before ❌
```
││▼   Content Type         ┃│  ← ▼ on first line of last element
││    Selection: Choose    ┃│
││    the type of          ┃│
││    content you'll be     │
││    indexing to          ▼│  ← Viewport ends here
││    processing            │
│└─  ✓ Confirm Selection    │
```

### After ✅
```
││    Content Type         ┃│
││    Selection: Choose    ┃│
││    the type of          ┃│
││    content you'll be    ┃│
││    indexing to          ▼│  ← ▼ now at actual viewport bottom
│└─  ✓ Confirm Selection    │
```

## Test Cases to Verify

1. **Short Content (No Scrolling)**
   - No scroll indicators should appear
   - All content fits in viewport

2. **Content Exceeds Viewport (Scrolling Required)**
   - `│▲` appears on line 0 when scrolled down
   - `│▼` appears on last viewport line when more content below

3. **Multi-Line Elements**
   - Indicators positioned by line, not element boundaries
   - Elements spanning multiple lines handle correctly

4. **Edge Cases**
   - Single-line elements
   - Array-based elements (multiple React elements)
   - Viewport height = 1 (minimum case)

## Testing Instructions

1. Launch `npm run tui`
2. Navigate to "Add Folder Wizard" 
3. Press Enter to expand
4. Use ↑↓ arrows to scroll through content
5. Verify `│▼` appears exactly at bottom of visible content area
6. Verify `│▲` appears exactly at top when scrolled down

## Success Criteria

- ✅ `│▼` appears on the last visible line of content (not first line of last element)
- ✅ `│▲` appears on the first visible line when there's content above
- ✅ No visual "phantom space" below scroll indicators
- ✅ Indicators disappear when all content fits in viewport
- ✅ Multi-line elements handled correctly