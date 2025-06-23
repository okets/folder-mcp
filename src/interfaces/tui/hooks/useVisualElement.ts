import { useState, useEffect } from 'react';
import { VisualElement } from '../components/VisualElement.js';

/**
 * React hook that subscribes to VisualElement changes and triggers re-renders
 * This bridges the imperative VisualElement world with React's declarative model
 */
export function useVisualElement<T extends VisualElement>(element: T): T {
  const [version, setVersion] = useState(0);
  
  useEffect(() => {
    // Subscribe to element changes
    const unsubscribe = element.subscribe(() => {
      setVersion(v => v + 1); // Force React re-render
    });
    
    // Return cleanup function
    return unsubscribe;
  }, [element]);
  
  // Return the element - React will re-render when version changes
  return element;
}