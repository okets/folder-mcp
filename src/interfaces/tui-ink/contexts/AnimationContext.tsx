import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface AnimationContextValue {
    animationsPaused: boolean;
    toggleAnimations: () => void;
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [animationsPaused, setAnimationsPaused] = useState(false);
    
    const toggleAnimations = useCallback(() => {
        setAnimationsPaused(prev => !prev);
    }, []);
    
    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        animationsPaused,
        toggleAnimations
    }), [animationsPaused, toggleAnimations]);
    
    return (
        <AnimationContext.Provider value={contextValue}>
            {children}
        </AnimationContext.Provider>
    );
};

export const useAnimationContext = () => {
    const context = useContext(AnimationContext);
    if (!context) {
        throw new Error('useAnimationContext must be used within AnimationProvider');
    }
    return context;
};