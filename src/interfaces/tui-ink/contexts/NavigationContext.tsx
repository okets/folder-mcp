import React, { createContext, useContext, ReactNode, memo } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { buildProps } from '../utils/conditionalProps';

type NavigationContextType = ReturnType<typeof useNavigation>;

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
    children: ReactNode; 
    isBlocked?: boolean;
    configItemCount?: number;
    statusItemCount?: number;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = memo(({ 
    children, 
    isBlocked = false,
    configItemCount,
    statusItemCount
}) => {
    const navigation = useNavigation({ 
        isBlocked, 
        ...buildProps({ configItemCount, statusItemCount })
    });
    
    return (
        <NavigationContext.Provider value={navigation}>
            {children}
        </NavigationContext.Provider>
    );
});

export const useNavigationContext = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigationContext must be used within NavigationProvider');
    }
    return context;
};