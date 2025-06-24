#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { TextInputDemo } from './TextInputDemo.js';
import { ConfigurationFormDemo } from './ConfigurationFormDemo.js';
import { DIContainer } from '../di/container.js';
import { DIProvider } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { ThemeService } from '../services/ThemeService.js';
import { ContentService } from '../services/ContentService.js';
import { DebugService } from '../services/DebugService.js';
import { ConfigurationService } from '../services/ConfigurationService.js';
import { FormNavigationService } from '../services/FormNavigationService.js';
import { InputService } from '../services/InputService.js';
import { ValidationService } from '../services/ValidationService.js';
import { StatusBarService } from '../services/StatusBarService.js';

// Setup DI container
const container = new DIContainer();
container.register(ServiceTokens.ThemeService, new ThemeService());
container.register(ServiceTokens.ContentService, new ContentService());
container.register(ServiceTokens.DebugService, new DebugService());

// Register configuration services
const validationService = new ValidationService();
container.register(ServiceTokens.ValidationService, validationService);
container.register(ServiceTokens.ConfigurationService, new ConfigurationService(validationService));
container.register(ServiceTokens.FormNavigationService, new FormNavigationService());
container.register(ServiceTokens.InputService, new InputService());
container.register(ServiceTokens.StatusBarService, new StatusBarService());

// Get demo type from command line
const demoType = process.argv[2] || 'config';

const App: React.FC = () => {
    let Demo: React.FC;
    
    switch (demoType) {
        case 'textinput':
            Demo = TextInputDemo;
            break;
        case 'config':
        default:
            Demo = ConfigurationFormDemo;
            break;
    }

    return (
        <DIProvider container={container}>
            <Demo />
        </DIProvider>
    );
};

render(<App />);