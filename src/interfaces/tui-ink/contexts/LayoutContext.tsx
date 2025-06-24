import React, { createContext, useContext } from 'react';
import { ILayoutConstraints } from '../models/types.js';

const LayoutConstraintContext = createContext<ILayoutConstraints | null>(null);

export const LayoutConstraintProvider: React.FC<{
    constraints: ILayoutConstraints;
    children: React.ReactNode;
}> = ({ constraints, children }) => {
    return (
        <LayoutConstraintContext.Provider value={constraints}>
            {children}
        </LayoutConstraintContext.Provider>
    );
};

export const useLayoutConstraints = (): ILayoutConstraints | null => {
    return useContext(LayoutConstraintContext);
};