import React, { useMemo, useEffect } from 'react';
import { Box, Text } from 'ink';
import { AppLayout } from '../components/AppLayout.js';
import { TerminalSize } from '../hooks/useTerminal.js';
import { FocusState } from '../hooks/useFocus.js';
import { KeyboardHandler } from '../keyboard/KeyboardHandler.js';
import { RoundBoxContainer } from '../components/roundbox/RoundBoxContainer.js';
import { VisualElement } from '../components/VisualElement.js';
import { KeyBinding, KeyboardManager } from '../keyboard/KeyboardManager.js';

interface ConfigScreenProps {
  terminalSize: TerminalSize;
  onNext?: () => void;
  focusState: FocusState;
  tuiAppElement: VisualElement;
}

class ConfigScreenElement extends VisualElement {
  private configContainer: RoundBoxContainer | null = null;
  private statusContainer: RoundBoxContainer | null = null;
  private focusState: FocusState | null = null;
  private onRender: (() => void) | null = null;

  constructor() {
    super('config-screen');
  }

  setContainers(configContainer: RoundBoxContainer, statusContainer: RoundBoxContainer): void {
    this.configContainer = configContainer;
    this.statusContainer = statusContainer;
    
    // Add containers as children
    this.addChild(configContainer);
    this.addChild(statusContainer);
  }

  setFocusState(focusState: FocusState, onRender: () => void): void {
    this.focusState = focusState;
    this.onRender = onRender;
  }

  processKeystroke(key: string): boolean {
    console.error(`ConfigScreenElement: Processing "${key}"`);
    
    // Handle tab navigation
    if (key === 'tab') {
      console.error('ConfigScreenElement: Tab will be handled by parent');
      // This will be handled by parent TUIApplication
      return false;
    }
    
    // Delegate to active container based on focus
    const activeContainer = this.focusState?.currentFocus === 'main' ? 
      this.configContainer : this.statusContainer;
    
    console.error(`ConfigScreenElement: Delegating to ${activeContainer?.constructor.name || 'none'} (focus: ${this.focusState?.currentFocus})`);
    
    if (activeContainer && activeContainer.processKeystroke(key)) {
      console.error(`ConfigScreenElement: Container handled "${key}"`);
      if (this.onRender) {
        this.onRender();
      }
      return true;
    }
    
    console.error(`ConfigScreenElement: Container did not handle "${key}"`);
    return false;
  }

  getRenderContent(): string[] {
    return ['ConfigScreen'];
  }

  getShortcuts(): KeyBinding[] {
    return [
      { key: 'Tab', description: 'Switch Focus' },
      { key: 'Tab+C', description: 'Focus Config' },
      { key: 'Tab+S', description: 'Focus Status' }
    ];
  }
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ 
  terminalSize, 
  onNext,
  focusState,
  tuiAppElement
}) => {
  console.error(`ConfigScreen: Rendering with focusState.currentFocus = ${focusState.currentFocus}`);
  // Static data - raw data for round-box-elements
  const configItemsData = useMemo(() => [
    { 
      content: 'Create optimized configuration for my machine',
      fullContent: 'Create optimized configuration for my machine\n\nThis option will automatically detect your hardware capabilities and configure the system accordingly.\n\nFeatures:\n• Auto-detect GPU acceleration\n• Optimize memory settings\n• Select best embedding model\n• Configure cache sizes\n\nThis is the recommended option for most users.'
    },
    { 
      content: 'Use automatic hardware detection',
      fullContent: 'Use automatic hardware detection\n\nAutomatically scan and configure based on your system specifications.\n\nWill detect:\n• Available memory\n• CPU cores\n• GPU availability\n• Storage speed\n• Network capabilities\n\nConfiguration will be optimized for your specific hardware.'
    },
    { 
      content: 'Select embedding model manually',
      fullContent: 'Select embedding model manually\n\nChoose from available embedding models based on your needs.\n\nAvailable models:\n• Nomic AI v1.5 (recommended)\n• MixedBread AI\n• OpenAI text-embedding-3\n• Custom models\n\nEach model has different trade-offs between speed, accuracy, and resource usage.'
    },
    { 
      content: 'Configure advanced options',
      fullContent: 'Configure advanced options\n\nFine-tune system settings for expert users.\n\nAdvanced settings:\n• Cache strategies\n• Indexing parameters\n• Network timeouts\n• Debug levels\n• Memory limits\n• File watching patterns\n\nOnly recommended for experienced users.'
    },
    { 
      content: 'Set custom cache directory',
      fullContent: 'Set custom cache directory\n\nSpecify a custom location for cache files.\n\nOptions:\n• Choose directory location\n• Set cache size limits\n• Configure cleanup policies\n• Enable cache encryption\n• Set backup strategies\n\nImproves performance by storing frequently accessed data.'
    },
    { 
      content: 'Configure network timeouts',
      fullContent: 'Configure network timeouts\n\nSet timeouts for network operations.\n\nSettings:\n• Connection timeout: 30s\n• Read timeout: 60s\n• Write timeout: 30s\n• Retry attempts: 3\n• Backoff strategy: Exponential\n\nPrevents hanging on slow network connections.'
    },
    { 
      content: 'Enable debug logging',
      fullContent: 'Enable debug logging\n\nTurn on detailed logging for troubleshooting.\n\nLogging levels:\n• ERROR: Critical errors only\n• WARN: Warnings and errors\n• INFO: General information\n• DEBUG: Detailed debugging\n• TRACE: Very detailed tracing\n\nHelps diagnose issues during development.'
    },
    { 
      content: 'Set memory limits',
      fullContent: 'Set memory limits\n\nConfigure memory usage boundaries.\n\nMemory settings:\n• Max heap size: 2GB\n• Cache limit: 512MB\n• Buffer size: 64MB\n• GC threshold: 80%\n• Memory monitoring: Enabled\n\nPrevents out-of-memory errors.'
    },
    { 
      content: 'Load from existing config file',
      fullContent: 'Load from existing config file\n\nImport configuration from an existing YAML file.\n\nSupported formats:\n• config.yaml\n• .env files\n• JSON configuration\n• TOML files\n\nThis will override current settings with the imported configuration.'
    },
    { 
      content: 'Reset to factory defaults',
      fullContent: 'Reset to factory defaults\n\nReset all settings to their original values.\n\nThis will:\n• Clear all custom settings\n• Restore default embedding models\n• Reset cache configurations\n• Clear user preferences\n• Remove custom file patterns\n\nThis action cannot be undone.'
    },
    { 
      content: 'Export current configuration',
      fullContent: 'Export current configuration\n\nSave current settings to a file.\n\nExport options:\n• YAML format\n• JSON format\n• Environment variables\n• Docker compose format\n• Kubernetes config\n\nUseful for backup and deployment.'
    },
    { 
      content: 'Run configuration wizard',
      fullContent: 'Run configuration wizard\n\nStep-by-step guided configuration.\n\nWizard steps:\n• Welcome and overview\n• Hardware detection\n• Model selection\n• Performance tuning\n• Final review\n\nRecommended for first-time setup.'
    }
  ], []);

  const statusItemsData = useMemo(() => [
    { 
      content: 'System initialized successfully',
      fullContent: 'System initialized successfully\n\nAll core components have been loaded and are ready.\n\nInitialized components:\n• Dependency Injection Container\n• Configuration System\n• Logging Infrastructure\n• Memory Management\n• File System Watchers\n\nSystem is ready for configuration.'
    },
    { 
      content: 'Checking cached configuration files',
      fullContent: 'Checking cached configuration files\n\nScanning for existing configuration and cache data.\n\nFound:\n• config.yaml: Present (2.1KB)\n• Cache directory: 15.7MB\n• User preferences: Loaded\n• Previous settings: Available\n• Backup configs: 3 files\n\nCache validation completed successfully.'
    },
    { 
      content: 'Loading default settings from config.yaml',
      fullContent: 'Loading default settings from config.yaml\n\nReading configuration from the main config file.\n\nLoaded settings:\n• Embedding model: Nomic v1.5\n• Cache size: 1GB\n• Debug level: INFO\n• File watchers: Enabled\n• Network timeout: 30s\n• Max memory: 2GB\n\nConfiguration loaded successfully.'
    },
    { 
      content: 'Validating embedding model availability',
      fullContent: 'Validating embedding model availability\n\nChecking if the configured embedding model is accessible.\n\nValidation results:\n• Model endpoint: Responsive\n• API authentication: Valid\n• Rate limits: Normal (1000/hour)\n• Model version: v1.5.2\n• Response time: 45ms avg\n\nEmbedding model is ready for use.'
    }
  ], []);

  // Create VisualElement instances
  const [renderTrigger, setRenderTrigger] = React.useState(0);
  
  const configScreenElement = useMemo(() => {
    return new ConfigScreenElement();
  }, []);
  
  const configContainer = useMemo(() => {
    const container = new RoundBoxContainer('config');
    container.setElements(configItemsData);
    return container;
  }, []); // Remove dependency on configItemsData since it's stable
  
  const statusContainer = useMemo(() => {
    const container = new RoundBoxContainer('status');
    container.setElements(statusItemsData);
    return container;
  }, []); // Remove dependency on statusItemsData since it's stable

  // Setup ConfigScreen element hierarchy
  useEffect(() => {
    configScreenElement.setContainers(configContainer, statusContainer);
    configScreenElement.setFocusState(focusState, () => setRenderTrigger(prev => prev + 1));
    
    // Add ConfigScreen as child of TUIApplication
    tuiAppElement.addChild(configScreenElement);
    
    return () => {
      tuiAppElement.removeChild(configScreenElement);
    };
  }, [configScreenElement, configContainer, statusContainer, focusState, tuiAppElement]);
  
  // Update ConfigScreen's focus state when focus changes
  useEffect(() => {
    try {
      console.error(`ConfigScreen: useEffect triggered with focusState.currentFocus = ${focusState.currentFocus}`);
      console.error(`ConfigScreen: configContainer = ${configContainer ? configContainer.constructor.name : 'null'}, statusContainer = ${statusContainer ? statusContainer.constructor.name : 'null'}`);
      
      // Update the ConfigScreenElement's internal state
      configScreenElement.setFocusState(focusState, () => setRenderTrigger(prev => prev + 1));
      
      // Set the appropriate container as the active element in KeyboardManager
      const keyboardManager = KeyboardManager.getInstance();
      console.error(`ConfigScreen: KeyboardManager instance obtained`);
      
      if (focusState.currentFocus === 'main') {
        console.error('ConfigScreen: About to set config container as active');
        keyboardManager.setActiveElement(configContainer);
        console.error('ConfigScreen: Config container set as active');
      } else if (focusState.currentFocus === 'status') {
        console.error('ConfigScreen: About to set status container as active');
        keyboardManager.setActiveElement(statusContainer);
        console.error('ConfigScreen: Status container set as active');
      }
      
      // Trigger re-render
      setRenderTrigger(prev => prev + 1);
    } catch (error) {
      console.error(`ConfigScreen: Error in useEffect:`, error);
    }
  }, [focusState.currentFocus, configScreenElement, configContainer, statusContainer]);

  // Generate content - Re-render on focus or navigation changes
  const configContent = useMemo(() => {
    return configContainer.getRenderContent();
  }, [configContainer, focusState.currentFocus, renderTrigger]);

  const statusContent = useMemo(() => {
    return statusContainer.getRenderContent();
  }, [statusContainer, focusState.currentFocus]); // Remove renderTrigger dependency for status

  // Convert string arrays to React elements for AppLayout
  const mainContent = (
    <Box flexDirection="column" paddingY={1}>
      {configContent.map((line: string, index: number) => (
        <Box key={index}>
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );

  const notificationContent = (
    <Box flexDirection="column" paddingY={1}>
      {statusContent.map((line: string, index: number) => (
        <Box key={index}>
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );

  return (
    <AppLayout
      terminalSize={terminalSize}
      mainTitle="Configuration"
      mainBorderColor="#A65EF6"  // Purple like the logo
      mainChildren={mainContent}
      mainContent={configContent}
      notificationTitle="Status"
      notificationBorderColor="#F59E0B"  // Orange/yellow hex color
      notificationChildren={notificationContent}
      notificationContent={statusContent}
      focusState={focusState}
    />
  );
};