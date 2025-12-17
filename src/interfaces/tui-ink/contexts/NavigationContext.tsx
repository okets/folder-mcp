import React, { createContext, useContext, ReactNode, memo } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { buildProps } from '../utils/conditionalProps';
import { IListItem } from '../components/core/IListItem';

type NavigationContextType = ReturnType<typeof useNavigation>;

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
    children: ReactNode;
    isBlocked?: boolean;
    navigationItemCount?: number;  // Number of navigation items (for circular navigation)
    configItemCount?: number;
    statusItemCount?: number;
    mainPanelItems?: IListItem[];
    statusPanelItems?: IListItem[];
}

export const NavigationProvider: React.FC<NavigationProviderProps> = memo(({
    children,
    isBlocked = false,
    navigationItemCount,
    configItemCount,
    statusItemCount,
    mainPanelItems,
    statusPanelItems
}) => {
    const navigation = useNavigation({
        isBlocked,
        ...buildProps({ navigationItemCount, configItemCount, statusItemCount, mainPanelItems, statusPanelItems })
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