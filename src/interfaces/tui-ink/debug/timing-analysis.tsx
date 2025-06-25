import React, { useEffect } from 'react';
import { render } from 'ink';
import { AppFullscreen } from '../AppFullscreen.js';
import { DIProvider } from '../di/DIContext.js';
import { setupDI } from '../di/setup.js';
import { ServiceTokens } from '../di/tokens.js';

// Wrap InputContextService to log timing
const createTimingLogger = () => {
    const di = setupDI();
    const originalService = di.resolve(ServiceTokens.InputContextService);
    
    const timingLog: Array<{
        timestamp: number;
        action: string;
        elementId: string;
        details: any;
    }> = [];
    
    const startTime = Date.now();
    
    // Wrap methods to log timing
    const wrappedService = {
        ...originalService,
        registerHandler: (elementId: string, handler: any, priority: number, keyBindings?: any[]) => {
            const timestamp = Date.now() - startTime;
            timingLog.push({
                timestamp,
                action: 'registerHandler',
                elementId,
                details: { priority, keyBindings: keyBindings?.map(kb => kb.key) }
            });
            console.error(`[${timestamp}ms] REGISTER: ${elementId} (priority: ${priority})`);
            return originalService.registerHandler(elementId, handler, priority, keyBindings);
        },
        unregisterHandler: (elementId: string) => {
            const timestamp = Date.now() - startTime;
            timingLog.push({
                timestamp,
                action: 'unregisterHandler',
                elementId,
                details: {}
            });
            console.error(`[${timestamp}ms] UNREGISTER: ${elementId}`);
            return originalService.unregisterHandler(elementId);
        }
    };
    
    // Replace service in DI
    di.override(ServiceTokens.InputContextService, wrappedService);
    
    return { di, timingLog };
};

// Timing Analysis Component
const TimingAnalysisApp: React.FC = () => {
    useEffect(() => {
        // Log when main app renders
        console.error('[APP] TimingAnalysisApp mounted');
        
        return () => {
            console.error('[APP] TimingAnalysisApp unmounted');
        };
    }, []);
    
    return <AppFullscreen />;
};

// Run the timing analysis
const runTimingAnalysis = () => {
    console.error('=== TIMING ANALYSIS START ===');
    const { di, timingLog } = createTimingLogger();
    
    const { unmount } = render(
        <DIProvider value={di}>
            <TimingAnalysisApp />
        </DIProvider>
    );
    
    // Run for 2 seconds then print results
    setTimeout(() => {
        console.error('\n=== TIMING ANALYSIS RESULTS ===');
        console.error('Registration Order:');
        timingLog.forEach(entry => {
            console.error(`  ${entry.timestamp}ms: ${entry.action} "${entry.elementId}" ${JSON.stringify(entry.details)}`);
        });
        
        console.error('\n=== TIMING ANALYSIS END ===');
        unmount();
        process.exit(0);
    }, 2000);
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTimingAnalysis();
}