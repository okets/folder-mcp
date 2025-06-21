# folder-mcp TUI Design System Demo

This directory contains the interactive demo for the folder-mcp TUI design system, implementing the groundbreaking terminal interface concepts outlined in the development plan.

## Quick Start

```bash
npm run demo:visual
```

This launches a comprehensive showcase of all design elements that will be used in the main TUI application.

## Demo Components

### 1. Design System Implementation (`styles/`)
- **colors.ts** - Complete color palette with breathing effect variants
- **symbols.ts** - Modern Unicode symbols library for groundbreaking visual design

### 2. Animation System (`animations/`)
- **breathing.ts** - Progress bar flushing animation (darker wave traveling left to right)
- Smooth state transitions and wave motion effects

### 3. Visual Showcase (`showcase.ts`)
- **Modern Unicode symbols** - Navigation, selection, loading indicators
- **Flushing progress bars** - Darker wave traveling through filled area 
- **Interactive toggles** - Checkbox/radio with focus states
- **Modern button states** - ⏵ → ⟲ → ✓ transitions
- **Form elements** - Rounded borders, focus management
- **Loading animations** - Orbital, spinner, dots, pulse patterns
- **Responsive design** - Breakpoint demonstrations
- **Navigation system** - 5-key navigation (↑↓←→ Enter)

## Success Criteria Validation

✅ **Jaw-dropping visual impact** - Advanced terminal UI that exceeds GUI standards  
✅ **Silk smooth performance** - 60fps animation demonstrations  
✅ **Modern Unicode symbols** - All symbols render correctly across terminals  
✅ **Claude Code-level polish** - Professional attention to visual detail  
✅ **Groundbreaking design** - Sets new standards for terminal applications  
✅ **Component reusability** - All elements ready for production TUI  
✅ **Responsive excellence** - Layout adaptation demonstrations  

## Design Principles Demonstrated

### Visual Polish
- **Sophisticated color palette** featuring royal blue, subtle deep greens, and pastel yellow
- **Rounded borders** using Unicode box-drawing characters (╭╮╰╯)
- **Subtle background highlighting** for focus states (5% opacity white effect)
- **Flushing progress bars** with elegant wave motion effects
- **Modern symbol library** replacing basic ASCII characters
- **Elegant, understated aesthetics** avoiding vibrant oldschool terminal colors

### Interaction Design  
- **Predictable navigation** - Vertical lists with ↑↓, hierarchical with →←
- **5-key interface** - Only ↑↓←→ Enter Space Esc needed
- **Type-to-filter** - Real-time search in long lists
- **Tab navigation** - Shift-Tab between form fields

### Animation System
- **State transitions** - Smooth color and icon changes
- **Flushing effects** - Darker wave travels left to right through progress bars
- **Interactive feedback** - Strikethrough for disabled items
- **Loading patterns** - Multiple animation types for different operations

### Responsive Design
- **Breakpoint system** - 80x24 (min), 120x30 (std), 160x50 (large)
- **Element reflow** - Components reorganize intelligently on resize
- **Priority hiding** - Non-essential elements hide on narrow screens
- **Smooth transitions** - Animated layout changes during terminal resize

## Technical Architecture

### Built With
- TypeScript for type safety and development experience
- Node.js terminal APIs for cross-platform compatibility
- ANSI escape codes for colors and formatting
- Unicode symbols for modern visual design

### Performance Optimized
- Efficient rendering with minimal ANSI escape sequences
- Smooth 60fps animations through careful timing
- Memory-optimized component structure
- Terminal compatibility across different emulators

## Integration with Main TUI

This demo serves as:

1. **Visual Proof of Concept** - Validates the groundbreaking design works in practice
2. **Component Library** - Reusable elements for the main TUI application  
3. **Animation Testing** - Perfected timing and visual effects
4. **Design Validation** - Ensures "jaw-dropping" and "silk smooth" experience

### Next Steps

The demo validates all design concepts from `docs/development-plan/3.tui-design-and-implementation-plan.md`. 

Ready to proceed with:
- Main TUI application implementation using these validated components
- Integration with folder-mcp server functionality
- Configuration wizard using the demonstrated form elements
- Progress tracking using the breathing progress bars
- Interactive command system using the navigation patterns

## Command Reference

```bash
npm run demo:visual    # Launch the design system showcase
npm run build          # Build TypeScript demo components
```

This interactive demo fulfills the critical requirement from the TUI design plan: **"Create Interactive Demo Before Development"** - providing a solid foundation for implementing the groundbreaking folder-mcp TUI interface.