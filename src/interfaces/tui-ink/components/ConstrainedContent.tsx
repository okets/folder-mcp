import React from 'react';
import { Text, Box } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';

interface ConstrainedContentProps {
    children: React.ReactNode;
    width?: number;
}

export const ConstrainedContent: React.FC<ConstrainedContentProps> = ({ children, width }) => {
    const di = useDI();
    const contentService = di.resolve(ServiceTokens.ContentService);
    const constraints = useLayoutConstraints();
    
    // Use provided width or constraints
    const maxWidth = width || constraints?.maxWidth || 80;
    
    // Process children to enforce constraints
    const processNode = (node: React.ReactNode): React.ReactNode => {
        if (typeof node === 'string') {
            // Truncate plain text
            return contentService.truncateText(node, maxWidth);
        }
        
        if (React.isValidElement(node)) {
            // Skip processing if component handles its own layout (like StatusItemLayout output)
            // Check if it's a Box with flexDirection="row" - likely a layout component
            if (node.type === Box && node.props.flexDirection === 'row') {
                if (process.env.DEBUG_TRUNCATE) {
                    console.error('[ConstrainedContent] Skipping Box with row layout');
                }
                return node; // Don't process, it handles its own layout
            }
            
            // Handle Text components
            if (node.type === Text) {
                const textContent = React.Children.toArray(node.props.children)
                    .map(child => typeof child === 'string' ? child : '')
                    .join('');
                
                const truncatedText = contentService.truncateText(textContent, maxWidth);
                
                if (process.env.DEBUG_TRUNCATE) {
                    console.error(`[ConstrainedContent] Processing Text: "${textContent}" -> "${truncatedText}"`);
                }
                
                return React.cloneElement(node, {
                    ...node.props,
                    children: truncatedText
                });
            }
            
            // Recursively process other components
            if (node.props.children) {
                return React.cloneElement(node, {
                    ...node.props,
                    children: React.Children.map(node.props.children, processNode)
                });
            }
        }
        
        return node;
    };
    
    return <>{React.Children.map(children, processNode)}</>;
};