import React, { useId } from 'react';
import { Text, Box } from 'ink';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';
import { useLayoutConstraints } from '../contexts/LayoutContext';
import { SelfConstrainedWrapper } from './core/SelfConstrainedWrapper';

interface ConstrainedContentProps {
    children: React.ReactNode;
    width?: number;
}

export const ConstrainedContent: React.FC<ConstrainedContentProps> = ({ children, width }) => {
    const di = useDI();
    const contentService = di.resolve(ServiceTokens.ContentService);
    const constraints = useLayoutConstraints();
    const instanceId = useId();
    
    // Use provided width or constraints
    const maxWidth = width || constraints?.maxWidth || 80;
    
    // Process children to enforce constraints
    const processNode = (node: React.ReactNode): React.ReactNode => {
        if (typeof node === 'string') {
            // Truncate plain text
            return contentService.truncateText(node, maxWidth);
        }
        
        if (React.isValidElement(node)) {
            // Check if this is a SelfConstrainedWrapper
            if (node.type === SelfConstrainedWrapper) {
                // Return the wrapper with its children untouched
                // This prevents any truncation of self-constrained content
                return node;
            }
            
            // Skip processing if component handles its own layout
            // Check if it's a Box with flexDirection="row" - likely a layout component
            if (node.type === Box && node.props.flexDirection === 'row') {
                return node; // Don't process, it handles its own layout
            }
            
            // Handle Text components
            if (node.type === Text) {
                const textContent = React.Children.toArray(node.props.children)
                    .map(child => typeof child === 'string' ? child : '')
                    .join('');
                
                const truncatedText = contentService.truncateText(textContent, maxWidth);
                
                return React.cloneElement(node, {
                    ...node.props,
                    children: truncatedText
                });
            }
            
            // Recursively process other components
            if (node.props.children) {
                // Don't process children if this is already inside a SelfConstrainedWrapper
                // This prevents double-processing of self-constrained content
                return React.cloneElement(node, {
                    ...node.props,
                    children: React.Children.map(node.props.children, processNode)
                });
            }
        }
        
        return node;
    };
    
    // Process children and ensure they all have keys
    const childrenArray = React.Children.toArray(children);
    const processedChildren = childrenArray.map((child, index) => {
        const processed = processNode(child);
        // Ensure each element has a unique key using React's useId
        if (React.isValidElement(processed)) {
            const finalKey = `${instanceId}-${index}`;
            return React.cloneElement(processed, { 
                key: finalKey
            });
        }
        return processed;
    });
    
    return <>{processedChildren}</>;
};