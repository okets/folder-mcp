import React, { createContext, useContext, ReactNode } from 'react';
import { useNavigation } from '../hooks/useNavigation.js';

type NavigationContextType = ReturnType<typeof useNavigation>;

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode; isBlocked?: boolean }> = ({ 
    children, 
    isBlocked = false 
}) => {
    const navigation = useNavigation({ isBlocked });
    
    return (
        <NavigationContext.Provider value={navigation}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigationContext = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigationContext must be used within NavigationProvider');
    }
    return context;
};