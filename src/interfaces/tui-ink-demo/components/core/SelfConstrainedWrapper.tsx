import React from 'react';

/**
 * Wrapper component that marks its children as self-constrained.
 * This prevents parent containers from applying additional truncation.
 */
export const SelfConstrainedWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};

// Add a marker property so ConstrainedContent can detect this wrapper
(SelfConstrainedWrapper as any).selfConstrained = true;