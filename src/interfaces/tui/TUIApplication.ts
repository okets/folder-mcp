import blessed from 'neo-blessed';
import { RoundBoxContainer, ContainerItem } from './components/RoundBoxContainer.js';
import { ListItem } from './components/ListItem.js';
import { StatusBar } from './components/StatusBar.js';
import { VisualElement } from './components/VisualElement.js';
import { theme } from './design/theme.js';

/**
 * Main TUI Application - Creates the interface matching our target design
 * Implements the exact layout shown in frontend.md target UI
 */
export class TUIApplication {
    private screen!: blessed.Widgets.Screen;
    private statusBar!: StatusBar;
    private configContainer!: RoundBoxContainer;
    private statusContainer!: RoundBoxContainer;
    private headerBox!: blessed.Widgets.BoxElement;
    private activeElement: VisualElement | null = null;

    constructor() {
        try {
            this.setupScreen();
            this.createComponents();
            this.setupKeyboardHandling();
            this.populateWithData();
            this.start();
        } catch (error) {
            console.error('Error during TUI initialization:', error);
            throw error;
        }
    }

    private setupScreen(): void {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'folder-mcp TUI',
            fullUnicode: true,
            dockBorders: false,
            style: {
                bg: theme.colors.background
            }
        });

        // Global quit handler
        this.screen.key(['q', 'C-c'], () => {
            process.exit(0);
        });
    }

    private createComponents(): void {
        // Header with folder-mcp logo (left-aligned)
        this.headerBox = blessed.box({
            parent: this.screen,
            top: 0,
            left: 0,
            width: 18,
            height: 3,
            content: '╭────────────────╮\n│ 📁 folder-mcp  │\n╰────────────────╯',
            style: {
                fg: theme.colors.textPrimary
            },
            tags: true
        });

        // Configuration container (left side, 70% width)
        this.configContainer = new RoundBoxContainer({
            parent: this.screen,
            title: ' Configuration ',
            left: 0,
            top: 4,
            width: '70%',
            height: '80%-4',
        });

        // Add config container to screen
        this.screen.append(this.configContainer.blessedElement);

        // Status container (right side, 30% width)
        this.statusContainer = new RoundBoxContainer({
            parent: this.screen,
            title: ' Status ',
            left: '70%',
            top: 4,
            width: '30%',
            height: '80%-4',
        });

        // Add status container to screen
        this.screen.append(this.statusContainer.blessedElement);

        // Status bar at bottom
        this.statusBar = new StatusBar({});
        this.screen.append(this.statusBar.blessedElement);

        // Set up focus change handling
        this.screen.on('element focus', (el) => {
            // Find the VisualElement wrapper for this blessed element
            const visualElement = this.findVisualElement(el);
            if (visualElement) {
                this.setActiveElement(visualElement);
            }
        });
    }

    private findVisualElement(blessedElement: any): VisualElement | null {
        // Check if it's one of our main containers
        if (blessedElement === this.configContainer.blessedElement) {
            return this.configContainer;
        } else if (blessedElement === this.statusContainer.blessedElement) {
            return this.statusContainer;
        }
        
        // Could also check children recursively if needed
        return null;
    }

    private setupKeyboardHandling(): void {
        // Tab navigation between main containers
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
    }

    private populateWithData(): void {
        // Configuration items from target UI
        const configItems: ContainerItem[] = [
            {
                content: 'Create optimized configuration for my machine',
                fullContent: `Create optimized configuration for my machine

Will detect:
• Available memory
• Select embedding model manually  
• Configure advanced options
• Set custom cache directory
• Configure network timeouts
• Enable debug logging
• Set memory limits
• Load from existing config file
• Reset to factory defaults
• Export current configuration
• Run configuration wizard`
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

        // Status items
        const statusItems: ContainerItem[] = [
            {
                content: 'All core components ha...',
                fullContent: `All core components have been loaded successfully.

Status Details:
• Checking cached conf...
• Loading default sett...
• Validating embedding...

System is ready for configuration.`
            },
            {
                content: '• Checking cached conf...',
                fullContent: 'Checking cached configuration files in user directory...'
            },
            {
                content: '• Loading default sett...',
                fullContent: 'Loading default settings from system configuration...'
            },
            {
                content: '• Validating embedding...',
                fullContent: 'Validating embedding model compatibility and requirements...'
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
        // Check which container currently has focus
        if (this.activeElement === this.configContainer || 
            (this.activeElement && this.findRootContainer(this.activeElement) === this.configContainer)) {
            this.configContainer.setLabel(' Configuration ⁽ⁱⁿ ᶠᵒᶜᵘˢ⁾');
            this.statusContainer.setLabel(' Status ᵀᵃᵇ⁺ˢ');
        } else if (this.activeElement === this.statusContainer || 
                  (this.activeElement && this.findRootContainer(this.activeElement) === this.statusContainer)) {
            this.statusContainer.setLabel(' Status ⁽ⁱⁿ ᶠᵒᶜᵘˢ⁾');
            this.configContainer.setLabel(' Configuration ᵀᵃᵇ⁺ˢ');
        }
        
        // Force screen render to update labels
        this.screen.render();
    }

    private findRootContainer(element: VisualElement): VisualElement | null {
        let current = element;
        while (current._parent) {
            current = current._parent;
        }
        return current;
    }

    private start(): void {
        // Set initial focus to configuration container
        this.configContainer.focus();
        
        // Initial render
        this.screen.render();
        
        // Keep the screen active by not exiting
        // The screen will handle the event loop
    }

    /**
     * Get the main screen for external access
     */
    getScreen(): blessed.Widgets.Screen {
        return this.screen;
    }
}