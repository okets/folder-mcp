import React, { createContext, useContext } from 'react';
import { DIContainer } from './container.js';

const DIContext = createContext<DIContainer | null>(null);

interface DIProviderProps {
    container: DIContainer;
    children: React.ReactNode;
}

export const DIProvider: React.FC<DIProviderProps> = ({ container, children }) => {
    return <DIContext.Provider value={container}>{children}</DIContext.Provider>;
};

export const useDI = () => {
    const container = useContext(DIContext);
    if (!container) {
        throw new Error('DI container not found. Make sure to wrap your app with DIProvider.');
    }
    return container;
};