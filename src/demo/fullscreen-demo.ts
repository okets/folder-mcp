#!/usr/bin/env node

// Full-screen interactive TUI demo with real animations
// Demonstrates actual folder-mcp TUI design system components

import { colors } from './styles/colors.js';
import { symbols } from './styles/symbols.js';
import { FlushingAnimation } from './animations/breathing.js';

interface ProgressBar {
  label: string;
  progress: number;
  flushing: FlushingAnimation;
  targetProgress: number;
  speed: number;
}

interface ToggleOption {
  id: string;
  label: string;
  enabled: boolean;
}

interface ButtonState {
  label: string;
  state: 'idle' | 'loading' | 'success' | 'error';
  lastStateChange: number;
}

class FullScreenTUIDemo {
  private currentScreen = 0;
  private selectedIndex = 0;
  private progressBars: ProgressBar[] = [];
  private toggleOptions: ToggleOption[] = [];
  private buttons: ButtonState[] = [];
  private animationFrame: NodeJS.Timeout | null = null;
  private isRunning = true;
  private terminalSize = { width: 80, height: 24 };
  
  private screens = [
    { name: 'menu', title: 'Demo Menu' },
    { name: 'progress', title: 'Flushing Progress Bars' },
    { name: 'toggles', title: 'Interactive Toggles' },
    { name: 'buttons', title: 'Modern Button States' },
    { name: 'forms', title: 'Form Elements' },
    { name: 'combined', title: 'All Components' }
  ];

  constructor() {
    this.setupTerminal();
    this.initializeData();
    this.bindEvents();
    this.startAnimationLoop();
    this.render();
  }

  private setupTerminal() {
    // Get terminal size
    this.terminalSize.width = process.stdout.columns || 80;
    this.terminalSize.height = process.stdout.rows || 24;
    
    // Setup raw mode for input
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    // Hide cursor and clear screen
    process.stdout.write('\x1b[?25l'); // Hide cursor
    process.stdout.write('\x1b[2J');   // Clear screen
    process.stdout.write('\x1b[H');    // Move to top-left
    
    // Handle terminal resize
    process.stdout.on('resize', () => {
      this.terminalSize.width = process.stdout.columns || 80;
      this.terminalSize.height = process.stdout.rows || 24;
      this.render();
    });
  }

  private initializeData() {
    // Initialize progress bars with flushing animations
    this.progressBars = [
      {
        label: 'Indexing files...',
        progress: 0,
        flushing: new FlushingAnimation(2000, 0.15),
        targetProgress: 85,
        speed: 0.8
      },
      {
        label: 'Building embeddings...',
        progress: 0,
        flushing: new FlushingAnimation(2200, 0.2),
        targetProgress: 65,
        speed: 0.6
      },
      {
        label: 'Server startup...',
        progress: 0,
        flushing: new FlushingAnimation(1800, 0.18),
        targetProgress: 100,
        speed: 1.2
      }
    ];

    // Initialize toggle options
    this.toggleOptions = [
      { id: 'multi-lang', label: 'Multi-language support', enabled: true },
      { id: 'gpu-accel', label: 'GPU acceleration', enabled: false },
      { id: 'hot-reload', label: 'Hot reload on file changes', enabled: true },
      { id: 'debug-mode', label: 'Enhanced debugging', enabled: false },
      { id: 'cache-embed', label: 'Cache embeddings', enabled: true }
    ];

    // Initialize buttons
    this.buttons = [
      { label: 'Start Configuration', state: 'idle', lastStateChange: Date.now() },
      { label: 'Generate Embeddings', state: 'idle', lastStateChange: Date.now() },
      { label: 'Reset Server', state: 'idle', lastStateChange: Date.now() }
    ];
  }

  private bindEvents() {
    process.stdin.on('data', (key: Buffer) => {
      const char = key.toString();
      
      if (char === 'q' || char === '\x03') { // q or Ctrl+C
        this.cleanup();
        process.exit(0);
      }
      
      if (char === '\x1b[A' || char === 'k') { // Up arrow or k
        this.navigateUp();
      } else if (char === '\x1b[B' || char === 'j') { // Down arrow or j
        this.navigateDown();
      } else if (char === '\x1b[C' || char === 'l') { // Right arrow or l
        this.navigateRight();
      } else if (char === '\x1b[D' || char === 'h') { // Left arrow or h
        this.navigateLeft();
      } else if (char === '\r' || char === ' ') { // Enter or Space
        this.handleAction();
      } else if (char === '\x1b') { // Escape
        this.currentScreen = 0;
        this.selectedIndex = 0;
        this.render();
      }
    });
  }

  private navigateUp() {
    if (this.currentScreen === 0) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    } else if (this.currentScreen === 2) { // toggles
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    } else if (this.currentScreen === 3) { // buttons
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    this.render();
  }

  private navigateDown() {
    if (this.currentScreen === 0) {
      this.selectedIndex = Math.min(this.screens.length - 1, this.selectedIndex + 1);
    } else if (this.currentScreen === 2) { // toggles
      this.selectedIndex = Math.min(this.toggleOptions.length - 1, this.selectedIndex + 1);
    } else if (this.currentScreen === 3) { // buttons
      this.selectedIndex = Math.min(this.buttons.length - 1, this.selectedIndex + 1);
    }
    this.render();
  }

  private navigateLeft() {
    if (this.currentScreen !== 0) {
      this.currentScreen = 0;
      this.selectedIndex = 0;
      this.render();
    }
  }

  private navigateRight() {
    if (this.currentScreen === 0) {
      this.currentScreen = this.selectedIndex + 1;
      this.selectedIndex = 0;
      this.render();
    }
  }

  private handleAction() {
    if (this.currentScreen === 0) {
      // Menu selection
      this.currentScreen = this.selectedIndex + 1;
      this.selectedIndex = 0;
      this.render();
    } else if (this.currentScreen === 2) { // toggles
      // Toggle the selected option
      const option = this.toggleOptions[this.selectedIndex];
      if (option) {
        option.enabled = !option.enabled;
        this.render();
      }
    } else if (this.currentScreen === 3) { // buttons
      // Trigger button action
      const button = this.buttons[this.selectedIndex];
      if (button && button.state === 'idle') {
        button.state = 'loading';
        button.lastStateChange = Date.now();
        
        // Simulate async operation
        setTimeout(() => {
          if (button) {
            button.state = Math.random() > 0.3 ? 'success' : 'error';
            button.lastStateChange = Date.now();
            
            // Reset after showing result
            setTimeout(() => {
              if (button) {
                button.state = 'idle';
                button.lastStateChange = Date.now();
              }
            }, 2000);
          }
        }, 1500);
      }
    }
  }

  private startAnimationLoop() {
    this.animationFrame = setInterval(() => {
      if (!this.isRunning) return;
      
      // Update progress bars
      this.progressBars.forEach(bar => {
        if (bar.progress < bar.targetProgress) {
          bar.progress = Math.min(bar.targetProgress, bar.progress + bar.speed);
        }
      });
      
      // Only re-render if we're on an animated screen
      if (this.currentScreen === 1 || this.currentScreen === 5) {
        this.render();
      }
    }, 50); // 20fps for smooth animation
  }

  private cleanup() {
    this.isRunning = false;
    if (this.animationFrame) {
      clearInterval(this.animationFrame);
    }
    
    // Restore terminal
    process.stdout.write('\x1b[?25h'); // Show cursor
    process.stdout.write('\x1b[2J');   // Clear screen
    process.stdout.write('\x1b[H');    // Move to top-left
    
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  }

  private colorize(text: string, color: string): string {
    const colorCodes: Record<string, string> = {
      // Sophisticated color mappings
      [colors.royal_blue]: '\x1b[38;5;69m',      // Royal blue
      [colors.royal_blue_bright]: '\x1b[38;5;75m', // Bright royal blue
      [colors.royal_blue_peak]: '\x1b[38;5;81m',   // Peak royal blue
      [colors.cyan]: '\x1b[38;5;69m',            // Royal blue (replaces cyan)
      [colors.blue]: '\x1b[38;5;69m',            // Royal blue
      [colors.deep_green]: '\x1b[38;5;22m',      // Deep green
      [colors.deep_green_bright]: '\x1b[38;5;28m', // Bright deep green
      [colors.sage_green]: '\x1b[38;5;108m',     // Light sage green
      [colors.sage_green_bright]: '\x1b[38;5;114m', // Bright sage green
      [colors.green]: '\x1b[38;5;22m',           // Deep green
      [colors.pastel_yellow]: '\x1b[38;5;223m',  // Pastel yellow
      [colors.orange]: '\x1b[38;5;223m',         // Pastel yellow (replaces orange)
      [colors.soft_purple]: '\x1b[38;5;139m',    // Soft purple
      [colors.purple]: '\x1b[38;5;139m',         // Soft purple
      [colors.error]: '\x1b[38;5;167m',          // Muted red
      [colors.red]: '\x1b[38;5;167m',            // Muted red
      [colors.text_primary]: '\x1b[37m',
      [colors.text_secondary]: '\x1b[90m',
      [colors.text_muted]: '\x1b[2;37m',
      
      // Direct hex mappings for impressive effects
      '#F5E6A3': '\x1b[38;5;223m',  // Pastel yellow for sparkles
      '#5B7FE5': '\x1b[38;5;75m',   // Bright royal blue for primary wave
      '#9CAF88': '\x1b[38;5;108m',  // Sage green for secondary wave
      '#4169E1': '\x1b[38;5;69m'    // Royal blue for base
    };
    
    return (colorCodes[color] || '') + text + '\x1b[0m';
  }

  private highlight(text: string, isSelected: boolean): string {
    if (isSelected) {
      return '\x1b[100m' + text + '\x1b[0m'; // Subtle gray background (like 5% opacity white)
    }
    return text;
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private drawBorder(title: string, width: number, height: number): string[] {
    const lines: string[] = [];
    const titleLine = title ? ` ${title} ` : '';
    const titlePadding = Math.max(0, width - titleLine.length - 2);
    
    lines.push('╭─' + titleLine + '─'.repeat(titlePadding) + '╮');
    for (let i = 0; i < height - 2; i++) {
      lines.push('│' + ' '.repeat(width) + '│');
    }
    lines.push('╰' + '─'.repeat(width) + '╯');
    
    return lines;
  }

  private renderProgressBar(bar: ProgressBar, width: number): string {
    const barWidth = width - 10; // Leave space for percentage
    
    // Generate impressive progress bar with multiple effects
    const progressData = bar.flushing.generateProgressBar(bar.progress, barWidth);
    const percentage = Math.floor(bar.progress).toString().padStart(3, ' ');
    
    // Apply different colors based on effects
    let colorizedText = '';
    for (let i = 0; i < progressData.text.length; i++) {
      const char = progressData.text[i] || ' ';
      const effect = progressData.effects.find(e => e.pos === i);
      
      if (effect) {
        switch (effect.effect) {
          case 'sparkle':
            // Bright sparkles in pastel yellow
            colorizedText += this.colorize(char, '#F5E6A3'); // pastel yellow
            break;
          case 'primary_wave':
            // Main wave in bright royal blue
            colorizedText += this.colorize(char, '#5B7FE5'); // bright royal blue
            break;
          case 'secondary_wave':
            // Secondary wave in sage green
            colorizedText += this.colorize(char, '#9CAF88'); // sage green
            break;
          default:
            colorizedText += this.colorize(char, '#4169E1'); // royal blue
        }
      } else {
        // Base color for normal filled areas
        colorizedText += this.colorize(char, '#4169E1'); // royal blue
      }
    }
    
    return `[${colorizedText}] ${this.colorize(percentage + '%', colors.text_primary)}`;
  }

  private render() {
    // Clear screen and move to top
    process.stdout.write('\x1b[2J\x1b[H');
    
    const { width, height } = this.terminalSize;
    const contentWidth = Math.min(80, width - 4);
    const contentHeight = height - 4;

    if (this.currentScreen === 0) {
      this.renderMenu(contentWidth, contentHeight);
    } else if (this.currentScreen === 1) {
      this.renderProgressScreen(contentWidth, contentHeight);
    } else if (this.currentScreen === 2) {
      this.renderTogglesScreen(contentWidth, contentHeight);
    } else if (this.currentScreen === 3) {
      this.renderButtonsScreen(contentWidth, contentHeight);
    } else if (this.currentScreen === 4) {
      this.renderFormsScreen(contentWidth, contentHeight);
    } else if (this.currentScreen === 5) {
      this.renderCombinedScreen(contentWidth, contentHeight);
    }

    // Status bar
    const statusText = `Screen: ${this.screens[this.currentScreen]?.title || 'Unknown'} | ↑↓←→hjkl Navigate | Enter/Space Select | Esc Menu | q Quit`;
    console.log('\n' + this.colorize(statusText.slice(0, width), colors.text_muted));
  }

  private renderMenu(width: number, height: number) {
    console.log(this.colorize(this.centerText('╭─ folder-mcp TUI Design System Demo ─╮', width), colors.cyan));
    console.log(this.colorize(this.centerText('│ Full-screen Interactive Experience   │', width), colors.text_secondary));
    console.log(this.colorize(this.centerText('╰─────────────────────────────────────╯', width), colors.cyan));
    console.log('');

    this.screens.slice(1).forEach((screen, index) => {
      const isSelected = index === this.selectedIndex;
      const line = `  ${symbols.play} ${screen.title}`;
      console.log(this.highlight(line, isSelected));
    });
    
    console.log('');
    console.log(this.colorize('Navigate: ↑↓ or hjkl • Select: Enter/→ • Quit: q', colors.text_muted));
  }

  private renderProgressScreen(width: number, height: number) {
    console.log(this.colorize('╭─ Flushing Progress Bars ─╮', colors.royal_blue));
    console.log('│                           │');
    
    this.progressBars.forEach((bar, index) => {
      console.log(`│ ${bar.label}`);
      console.log(`│ ${this.renderProgressBar(bar, 25)}`);
      if (index < this.progressBars.length - 1) {
        console.log('│                           │');
      }
    });
    
    console.log('│                           │');
    console.log(this.colorize('╰─────────────────────────╯', colors.royal_blue));
    console.log('');
    console.log(this.colorize('• Multiple wave effects: primary + secondary waves', colors.text_secondary));
    console.log(this.colorize('• Dynamic sparkles (✨✦) racing across bars', colors.text_secondary));
    console.log(this.colorize('• Gradient pulsing and color shifting effects', colors.text_secondary));
    console.log(this.colorize('• 20fps smooth animation with impressive visual depth', colors.text_secondary));
  }

  private renderTogglesScreen(width: number, height: number) {
    console.log(this.colorize('╭─ Interactive Toggles ─╮', colors.green));
    console.log('│                       │');
    
    this.toggleOptions.forEach((option, index) => {
      const isSelected = index === this.selectedIndex;
      const checkbox = option.enabled ? symbols.checkbox_checked : symbols.checkbox_empty;
      const textColor = option.enabled ? colors.text_primary : colors.text_muted;
      const line = `│ ${checkbox} ${option.label}`;
      
      if (isSelected) {
        console.log(this.highlight(line, true));
      } else {
        console.log(this.colorize(line, textColor));
      }
    });
    
    console.log('│                       │');
    console.log(this.colorize('╰─────────────────────╯', colors.green));
    console.log('');
    console.log(this.colorize('• ↑↓ Navigate • Space/Enter Toggle • Focus highlighting', colors.text_secondary));
  }

  private renderButtonsScreen(width: number, height: number) {
    console.log(this.colorize('╭─ Modern Button States ─╮', colors.orange));
    console.log('│                        │');
    
    this.buttons.forEach((button, index) => {
      const isSelected = index === this.selectedIndex;
      const icon = this.getButtonIcon(button.state);
      const color = this.getButtonColor(button.state);
      const line = `│ ${icon} ${button.label}`;
      
      if (isSelected) {
        console.log(this.highlight(line, true));
      } else {
        console.log(this.colorize(line, color));
      }
    });
    
    console.log('│                        │');
    console.log(this.colorize('╰──────────────────────╯', colors.orange));
    console.log('');
    console.log(this.colorize('• ↑↓ Navigate • Enter/Space Trigger • Real async state changes', colors.text_secondary));
  }

  private renderFormsScreen(width: number, height: number) {
    console.log(this.colorize('╭─ Form Elements ─╮', colors.blue));
    console.log('│                 │');
    console.log('│ Server Name:    │');
    console.log('│ ╭─────────────╮ │');
    console.log('│ │folder-mcp   │ │');
    console.log('│ ╰─────────────╯ │');
    console.log('│                 │');
    console.log('│ Language:       │');
    console.log(`│ ${symbols.radio_selected} Multi-language │`);
    console.log(`│ ${symbols.radio_empty} English only   │`);
    console.log('│                 │');
    console.log(this.colorize('╰───────────────╯', colors.blue));
    console.log('');
    console.log(this.colorize('• Rounded borders • Tab navigation • Focus management', colors.text_secondary));
  }

  private renderCombinedScreen(width: number, height: number) {
    // Split screen showing multiple components
    console.log(this.colorize('╭─ All Components Combined ─╮', colors.purple));
    
    // Progress section
    console.log('│ Progress:                  │');
    const firstBar = this.progressBars[0];
    if (firstBar) {
      console.log(`│ ${this.renderProgressBar(firstBar, 25).slice(0, 25)} │`);
    }
    
    console.log('│                           │');
    
    // Toggles section  
    console.log('│ Settings:                 │');
    const firstToggle = this.toggleOptions[0];
    if (firstToggle) {
      const checkbox = firstToggle.enabled ? symbols.checkbox_checked : symbols.checkbox_empty;
      console.log(`│ ${checkbox} ${firstToggle.label.slice(0, 20)}  │`);
    }
    
    console.log('│                           │');
    
    // Button section
    console.log('│ Actions:                  │');
    const firstButton = this.buttons[0];
    if (firstButton) {
      const icon = this.getButtonIcon(firstButton.state);
      console.log(`│ ${icon} ${firstButton.label.slice(0, 20)}    │`);
    }
    
    console.log(this.colorize('╰─────────────────────────╯', colors.purple));
    console.log('');
    console.log(this.colorize('• Live demonstration of all components working together', colors.text_secondary));
  }

  private getButtonIcon(state: string): string {
    switch (state) {
      case 'idle': return symbols.play;
      case 'loading': return symbols.loading;
      case 'success': return symbols.success;
      case 'error': return symbols.error;
      default: return symbols.play;
    }
  }

  private getButtonColor(state: string): string {
    switch (state) {
      case 'idle': return colors.text_primary;
      case 'loading': return colors.orange;
      case 'success': return colors.green;
      case 'error': return colors.red;
      default: return colors.text_primary;
    }
  }
}

// Start the full-screen demo
new FullScreenTUIDemo();