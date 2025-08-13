import React, { createContext, useContext, useMemo } from 'react';

interface ProgressModeContextType {
    progressMode: 'short' | 'long';
}

const ProgressModeContext = createContext<ProgressModeContextType>({
    progressMode: 'short'
});

export const useProgressMode = () => {
    try {
        const context = useContext(ProgressModeContext);
        return context.progressMode;
    } catch {
        // Return default if not in a provider
        return 'short';
    }
};

interface ProgressModeProviderProps {
    width: number;
    children: React.ReactNode;
}

export const ProgressModeProvider: React.FC<ProgressModeProviderProps> = ({ width, children }) => {
    // Determine mode based on panel width
    // Need at least 50 chars for long mode to look good
    const progressMode: 'short' | 'long' = width >= 50 ? 'long' : 'short';
    
    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({ progressMode }), [progressMode]);
    
    return (
        <ProgressModeContext.Provider value={contextValue}>
            {children}
        </ProgressModeContext.Provider>
    );
};