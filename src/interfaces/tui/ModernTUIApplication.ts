import blessed from 'neo-blessed';
import { ModernContainer, ModernContainerItem } from './components/ModernContainer.js';
import { ModernHeader } from './components/ModernHeader.js';
import { StatusBar } from './components/StatusBar.js';
import { ListItem } from './components/ListItem.js';
import { VisualElement } from './components/VisualElement.js';
import { modernTheme } from './design/modernTheme.js';

/**
 * ModernTUIApplication - Beautiful, modern TUI with enhanced visual design
 */
export class ModernTUIApplication {
    private screen!: blessed.Widgets.Screen;
    private header!: ModernHeader;
    private statusBar!: StatusBar;
    private configContainer!: ModernContainer;
    private statusContainer!: ModernContainer;
    private activeElement: VisualElement | null = null;

    constructor() {
        try {
            this.setupScreen();
            this.createComponents();
            this.setupKeyboardHandling();
            this.populateWithData();
            this.start();
        } catch (error) {
            console.error('Error during ModernTUI initialization:', error);
            throw error;
        }
    }

    private setupScreen(): void {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'folder-mcp • Modern TUI',
            fullUnicode: true,
            dockBorders: false,
            // Disable mouse for easier text selection
            mouse: false,
            style: {
                bg: modernTheme.colors.background
            }
        });

        // Global quit handler
        this.screen.key(['q', 'C-c'], () => {
            process.exit(0);
        });
    }

    private createComponents(): void {
        // Modern header
        this.header = new ModernHeader({
            parent: this.screen
        });
        this.screen.append(this.header.blessedElement);

        // Configuration container (left side, 65% width)
        this.configContainer = new ModernContainer({
            title: ' Configuration ',
            subtitle: 'Setup your folder-mcp server',
            left: 1,
            top: 3,
            width: '65%',
            height: '85%-3'
        });
        this.screen.append(this.configContainer.blessedElement);

        // Status container (right side, 32% width)  
        this.statusContainer = new ModernContainer({
            title: ' System Status ',
            subtitle: 'Current system state',
            left: '67%',
            top: 3,
            width: '32%',
            height: '85%-3'
        });
        this.screen.append(this.statusContainer.blessedElement);

        // Modern status bar
        this.statusBar = new StatusBar({});
        this.screen.append(this.statusBar.blessedElement);

        // Set up focus change handling
        this.screen.on('element focus', (el) => {
            const visualElement = this.findVisualElement(el);
            if (visualElement) {
                this.setActiveElement(visualElement);
            }
        });
    }

    private findVisualElement(blessedElement: any): VisualElement | null {
        if (blessedElement === this.configContainer.blessedElement) {
            return this.configContainer;
        } else if (blessedElement === this.statusContainer.blessedElement) {
            return this.statusContainer;
        }
        return null;
    }

    private setupKeyboardHandling(): void {
        // Enhanced Tab navigation with smooth focus transitions
        this.screen.key(['tab'], () => {
            if (this.activeElement === this.configContainer) {
                this.statusContainer.focus();
                this.setActiveElement(this.statusContainer);
            } else {
                this.configContainer.focus();
                this.setActiveElement(this.configContainer);
            }
        });

        // Shift+Tab for reverse navigation
        this.screen.key(['S-tab'], () => {
            if (this.activeElement === this.statusContainer) {
                this.configContainer.focus();
                this.setActiveElement(this.configContainer);
            } else {
                this.statusContainer.focus();
                this.setActiveElement(this.statusContainer);
            }
        });

        // Help key
        this.screen.key(['h', '?'], () => {
            this.showHelp();
        });

        // Debug key - save screenshot/state
        this.screen.key(['d'], () => {
            this.saveDebugSnapshot();
        });

    }

    private populateWithData(): void {
        // Configuration items with modern styling and status indicators
        const configItems: ModernContainerItem[] = [
            {
                content: 'Create optimized configuration for my machine',
                fullContent: `Create optimized configuration for my machine

${modernTheme.symbols.bullet} Automatic hardware detection
${modernTheme.symbols.bullet} Optimal embedding model selection  
${modernTheme.symbols.bullet} Memory and performance tuning
${modernTheme.symbols.bullet} Network timeout optimization
${modernTheme.symbols.bullet} Cache directory configuration

This option will automatically detect your system capabilities and 
configure folder-mcp for optimal performance.`,
            },
            {
                content: 'Manual configuration wizard',
                fullContent: `Manual configuration wizard

${modernTheme.symbols.bullet} Step-by-step setup process
${modernTheme.symbols.bullet} Custom model selection
${modernTheme.symbols.bullet} Advanced options access
${modernTheme.symbols.bullet} Expert-level fine-tuning

Choose this option if you want full control over every 
configuration parameter.`,
            },
            {
                content: 'Load existing configuration',
                fullContent: `Load existing configuration

${modernTheme.symbols.bullet} Import from config file
${modernTheme.symbols.bullet} Restore previous settings
${modernTheme.symbols.bullet} Quick setup recovery

Load settings from a previously saved configuration file.`,
            }
        ];

        configItems.forEach(item => {
            const listItem = new ListItem({
                content: item.content,
                fullContent: item.fullContent || item.content
            });
            
            item.element = listItem;
            this.configContainer.addItem(item);
        });

        // Status items with visual indicators
        const statusItems: ModernContainerItem[] = [
            {
                content: 'System components loaded',
                fullContent: `System components loaded successfully

${modernTheme.symbols.success} Core modules initialized
${modernTheme.symbols.success} Dependencies resolved
${modernTheme.symbols.success} Memory allocation complete

All essential components are ready for operation.`,
                status: 'success'
            },
            {
                content: 'Checking cached configuration',
                fullContent: `Checking cached configuration

${modernTheme.symbols.loading} Scanning user directory
${modernTheme.symbols.loading} Validating config format
${modernTheme.symbols.loading} Loading preferences

Searching for existing configuration files...`,
                status: 'loading'
            },
            {
                content: 'Loading default settings',
                fullContent: `Loading default settings

${modernTheme.symbols.info} Applying system defaults
${modernTheme.symbols.info} Setting up base configuration
${modernTheme.symbols.info} Preparing environment

Initializing with safe default values...`,
            },
            {
                content: 'Validating embedding models',
                fullContent: `Validating embedding models

${modernTheme.symbols.warning} Model compatibility check
${modernTheme.symbols.warning} GPU acceleration test
${modernTheme.symbols.warning} Memory requirements

Ensuring optimal model selection for your system...`,
                status: 'warning'
            }
        ];

        statusItems.forEach(item => {
            const listItem = new ListItem({
                content: item.content,
                fullContent: item.fullContent || item.content
            });
            
            item.element = listItem;
            this.statusContainer.addItem(item);
        });
    }

    private setActiveElement(element: VisualElement): void {
        this.activeElement = element;
        this.statusBar.updateShortcuts(element);
        this.updateContainerLabels();
    }

    private updateContainerLabels(): void {
        // Beautiful focus indicators
        if (this.activeElement === this.configContainer || 
            (this.activeElement && this.findRootContainer(this.activeElement) === this.configContainer)) {
            this.configContainer.setLabel(' Configuration ⁽ᶠᵒᶜᵘˢᵉᵈ⁾');
            this.statusContainer.setLabel(' System Status ᵗᵃᵇ');
        } else if (this.activeElement === this.statusContainer || 
                  (this.activeElement && this.findRootContainer(this.activeElement) === this.statusContainer)) {
            this.statusContainer.setLabel(' System Status ⁽ᶠᵒᶜᵘˢᵉᵈ⁾');
            this.configContainer.setLabel(' Configuration ᵗᵃᵇ');
        }
        
        this.screen.render();
    }

    private findRootContainer(element: VisualElement): VisualElement | null {
        let current = element;
        while (current._parent) {
            current = current._parent;
        }
        return current;
    }

    private showHelp(): void {
        // Create beautiful help overlay
        const helpBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '70%',
            content: this.getHelpContent(),
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: modernTheme.colors.borderFocus
                },
                bg: modernTheme.colors.surface,
                fg: modernTheme.colors.textPrimary
            }
        });

        helpBox.key(['escape', 'q', 'h'], () => {
            this.screen.remove(helpBox);
            this.screen.render();
        });

        helpBox.focus();
        this.screen.render();
    }

    private getHelpContent(): string {
        return `{center}{bold}folder-mcp Modern TUI Help{/bold}{/center}

{${modernTheme.colors.accent}-fg}Navigation:{/}
${modernTheme.symbols.selected} ↑↓ or j/k    Navigate items
${modernTheme.symbols.selected} →/Enter      Expand/activate item  
${modernTheme.symbols.selected} ←/Esc        Collapse/go back
${modernTheme.symbols.selected} Tab          Switch between panels
${modernTheme.symbols.selected} Shift+Tab    Reverse switch

{${modernTheme.colors.accent}-fg}Actions:{/}
${modernTheme.symbols.selected} h or ?       Show this help
${modernTheme.symbols.selected} q or Ctrl+C  Quit application

{${modernTheme.colors.accent}-fg}Visual Indicators:{/}
${modernTheme.symbols.unselected} Normal item
${modernTheme.symbols.selected} Selected item  
${modernTheme.symbols.expanded} Expanded item
${modernTheme.symbols.success} Success/completed
${modernTheme.symbols.warning} Warning/attention needed
${modernTheme.symbols.error} Error/failed
${modernTheme.symbols.loading} Loading/in progress

{center}{${modernTheme.colors.textMuted}-fg}Press Esc or q to close this help{/}{/center}`;
    }

    private start(): void {
        // Set initial focus and update header
        this.configContainer.focus();
        this.header.updateStatus('Ready for configuration');
        
        // Force update displays
        this.setActiveElement(this.configContainer);
        
        this.screen.render();
        
        // Keep the process alive - this prevents the TUI from exiting
        const keepAlive = setInterval(() => {
            // Do nothing, just keep the event loop running
        }, 1000);
        
        // Clean up on exit
        process.on('exit', () => {
            clearInterval(keepAlive);
        });
    }


    private saveDebugSnapshot(): void {
        console.log('\n=== TUI DEBUG SNAPSHOT ===');
        console.log('Active Element:', this.activeElement?.constructor.name);
        console.log('Screen Size:', this.screen.width, 'x', this.screen.height);
        console.log('=== END SNAPSHOT ===\n');
    }

    getScreen(): blessed.Widgets.Screen {
        return this.screen;
    }
}