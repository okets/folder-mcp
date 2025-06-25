import React, { createContext, useContext, ReactNode } from 'react';
import { useNavigation } from '../hooks/useNavigation.js';

type NavigationContextType = ReturnType<typeof useNavigation>;

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ 
    children: ReactNode; 
    isBlocked?: boolean;
    configItemCount?: number;
    statusItemCount?: number;
}> = ({ 
    children, 
    isBlocked = false,
    configItemCount,
    statusItemCount
}) => {
    const navigation = useNavigation({ isBlocked, configItemCount, statusItemCount });
    
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