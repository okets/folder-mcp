#!/usr/bin/env node

// Simple TUI Demo showcasing design concepts without React dependencies
// This demonstrates the visual concepts from the TUI design plan

import { colors } from './styles/colors.js';
import { symbols } from './styles/symbols.js';

class SimpleDemo {
  private currentScreen = 0;
  private screens = [
    'menu',
    'progress',
    'toggles', 
    'buttons',
    'forms',
    'loading'
  ];

  constructor() {
    // Clear screen and show cursor
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('\x1b[?25h');
    
    // Handle input
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('data', this.handleInput.bind(this));
    
    this.render();
  }

  private handleInput(key: Buffer) {
    const char = key.toString('utf8');
    
    if (char === 'q' || char === '\x03') { // q or Ctrl+C
      this.cleanup();
      process.exit(0);
    }
    
    if (char === 'j' || char === '\x1b[B') { // j or down arrow
      this.currentScreen = (this.currentScreen + 1) % this.screens.length;
      this.render();
    }
    
    if (char === 'k' || char === '\x1b[A') { // k or up arrow
      this.currentScreen = this.currentScreen > 0 ? this.currentScreen - 1 : this.screens.length - 1;
      this.render();
    }
    
    if (char === '\r') { // Enter
      const screen = this.screens[this.currentScreen];
      if (screen) {
        this.showDemo(screen);
      }
    }
  }

  private cleanup() {
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('\x1b[?25h');
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  }

  private colorize(text: string, color: string): string {
    const colorCodes: Record<string, string> = {
      [colors.cyan]: '\x1b[36m',
      [colors.blue]: '\x1b[34m', 
      [colors.green]: '\x1b[32m',
      [colors.orange]: '\x1b[33m',
      [colors.red]: '\x1b[31m',
      [colors.purple]: '\x1b[35m',
      [colors.text_primary]: '\x1b[37m',
      [colors.text_secondary]: '\x1b[90m',
      [colors.text_muted]: '\x1b[90m'
    };
    
    const reset = '\x1b[0m';
    return (colorCodes[color] || '') + text + reset;
  }

  private highlight(text: string, isSelected: boolean): string {
    if (isSelected) {
      return '\x1b[46m\x1b[30m' + text + '\x1b[0m'; // cyan background, black text
    }
    return text;
  }

  private render() {
    // Clear screen
    process.stdout.write('\x1b[2J\x1b[H');
    
    // Header
    console.log(this.colorize('╭─ folder-mcp TUI Design System Demo ─╮', colors.cyan));
    console.log(this.colorize('│ Interactive showcase of groundbreaking TUI components │', colors.text_secondary));
    console.log(this.colorize('╰─────────────────────────────────────────────────────╯', colors.cyan));
    console.log('');
    
    // Menu
    console.log(this.colorize('Select a demo screen:', colors.text_primary));
    console.log('');
    
    this.screens.forEach((screen, index) => {
      const isSelected = index === this.currentScreen;
      const label = this.getScreenLabel(screen);
      const line = `  ${symbols.play} ${label}`;
      console.log(this.highlight(line, isSelected));
    });
    
    console.log('');
    console.log(this.colorize('Controls: ↑↓/jk Navigate • Enter Select • q Quit', colors.text_muted));
  }

  private getScreenLabel(screen: string): string {
    const labels: Record<string, string> = {
      menu: 'Main Menu',
      progress: 'Breathing Progress Bars',
      toggles: 'Interactive Toggles', 
      buttons: 'Modern Button States',
      forms: 'Form Elements',
      loading: 'Loading Animations'
    };
    return labels[screen] || screen;
  }

  private showDemo(screenType: string) {
    process.stdout.write('\x1b[2J\x1b[H');
    
    switch (screenType) {
      case 'progress':
        this.showProgressDemo();
        break;
      case 'toggles':
        this.showTogglesDemo();
        break;
      case 'buttons':
        this.showButtonsDemo();
        break;
      case 'forms':
        this.showFormsDemo();
        break;
      case 'loading':
        this.showLoadingDemo();
        break;
      default:
        this.render();
        return;
    }
    
    console.log('');
    console.log(this.colorize('Press any key to return to menu...', colors.text_muted));
    
    // Wait for keypress
    process.stdin.once('data', () => {
      this.render();
    });
  }

  private showProgressDemo() {
    console.log(this.colorize('╭─ Breathing Progress Bars ─╮', colors.cyan));
    console.log('│                           │');
    
    // Simulate different progress states
    const bars = [
      { label: 'Indexing files...', progress: 45 },
      { label: 'Building embeddings...', progress: 78 },
      { label: 'Server startup...', progress: 100 }
    ];
    
    bars.forEach(bar => {
      const width = 20;
      const filled = Math.floor((bar.progress / 100) * width);
      const empty = width - filled;
      const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
      
      console.log(`│ ${bar.label}`);
      console.log(`│ ${this.colorize(`[${progressBar}] ${bar.progress}%`, colors.blue)}`);
      console.log('│                           │');
    });
    
    console.log(this.colorize('╰─────────────────────────╯', colors.cyan));
    console.log('');
    console.log(this.colorize('• Progress bars breathe with 2-second color cycling', colors.text_secondary));
    console.log(this.colorize('• Base → Bright → Peak → Back transition', colors.text_secondary));
  }

  private showTogglesDemo() {
    console.log(this.colorize('╭─ Interactive Toggles ─╮', colors.green));
    console.log('│                       │');
    
    const options = [
      { label: 'Multi-language support', enabled: true },
      { label: 'GPU acceleration', enabled: false },
      { label: 'Hot reload on file changes', enabled: true },
      { label: 'Enhanced debugging', enabled: false }
    ];
    
    options.forEach((option, index) => {
      const checkbox = option.enabled ? symbols.checkbox_checked : symbols.checkbox_empty;
      const text = option.enabled ? option.label : option.label;
      const color = option.enabled ? colors.text_primary : colors.text_muted;
      const line = `│ ${checkbox} ${text}`;
      
      if (index === 1) { // Highlight second option as selected
        console.log(this.highlight(line, true));
      } else {
        console.log(this.colorize(line, color));
      }
    });
    
    console.log('│                       │');
    console.log(this.colorize('╰─────────────────────╯', colors.green));
    console.log('');
    console.log(this.colorize('• ↑↓ Navigate • Space Toggle • Strikethrough for disabled', colors.text_secondary));
  }

  private showButtonsDemo() {
    console.log(this.colorize('╭─ Modern Button States ─╮', colors.orange));
    console.log('│                        │');
    
    const buttons = [
      { label: 'Start Configuration', state: 'idle', icon: symbols.play },
      { label: 'Generate Embeddings', state: 'loading', icon: symbols.loading },
      { label: 'Reset Server', state: 'success', icon: symbols.success }
    ];
    
    buttons.forEach((button, index) => {
      const line = `│ ${button.icon} ${button.label}`;
      if (index === 0) {
        console.log(this.highlight(line, true)); // Focused button
      } else {
        console.log(this.colorize(line, colors.text_primary));
      }
    });
    
    console.log('│                        │');
    console.log(this.colorize('╰──────────────────────╯', colors.orange));
    console.log('');
    console.log(this.colorize('• State transitions: ⏵ → ⟲ → ✓', colors.text_secondary));
    console.log(this.colorize('• Focus cycling with background highlight', colors.text_secondary));
  }

  private showFormsDemo() {
    console.log(this.colorize('╭─ Form Elements ─╮', colors.blue));
    console.log('│                 │');
    console.log(this.colorize('│ Server Name:    │', colors.text_primary));
    console.log('│ ╭─────────────╮ │');
    console.log(this.highlight('│ │folder-mcp   │ │', true)); // Focused input
    console.log('│ ╰─────────────╯ │');
    console.log('│                 │');
    console.log(this.colorize('│ Language Support:│', colors.text_primary));
    console.log(`│ ${symbols.radio_selected} Multi-language │`);
    console.log(`│ ${symbols.radio_empty} English only   │`);
    console.log('│                 │');
    console.log(this.colorize('╰───────────────╯', colors.blue));
    console.log('');
    console.log(this.colorize('• Rounded borders for input fields', colors.text_secondary));
    console.log(this.colorize('• Tab/Shift-Tab navigation between fields', colors.text_secondary));
  }

  private showLoadingDemo() {
    console.log(this.colorize('╭─ Loading Animations ─╮', colors.purple));
    console.log('│                      │');
    console.log(`│ ${symbols.orbital_1} Loading...      │`);
    console.log(`│ | Processing docs...  │`);
    console.log(`│ Downloading●○○       │`);
    console.log(`│ ${symbols.radio_selected} Server heartbeat  │`);
    console.log('│                      │');
    console.log(this.colorize('╰────────────────────╯', colors.purple));
    console.log('');
    console.log(this.colorize('• Orbital animations: ⚬⚭⚮⚯', colors.text_secondary));
    console.log(this.colorize('• Spinner, dots, pulse patterns', colors.text_secondary));
  }
}

// Start the demo
new SimpleDemo();