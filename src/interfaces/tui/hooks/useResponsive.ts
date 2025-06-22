import { TerminalSize } from './useTerminal.js';

export interface ResponsiveLayout {
  isWide: boolean;
  isTall: boolean;
  mainWidth: number;
  notificationWidth: number;
  shouldStack: boolean;
}

export const useResponsive = (terminalSize: TerminalSize): ResponsiveLayout => {
  // Responsive breakpoints - your terminal is 91×28, so let's lower the threshold
  const WIDE_THRESHOLD = 80;   // Minimum width for side-by-side layout
  const TALL_THRESHOLD = 25;   // Minimum height for comfortable stacked layout
  
  const isWide = terminalSize.width >= WIDE_THRESHOLD;
  const isTall = terminalSize.height >= TALL_THRESHOLD;
  const shouldStack = !isWide;
  
  // Calculate widths for side-by-side layout
  let mainWidth: number;
  let notificationWidth: number;
  
  if (shouldStack) {
    // Stacked layout - both use most of the width
    mainWidth = Math.max(40, terminalSize.width - 4);
    notificationWidth = mainWidth;
  } else {
    // Side-by-side layout - main gets 80%, notification gets 20%
    const availableWidth = terminalSize.width - 4; // Account for spacing
    mainWidth = Math.floor(availableWidth * 0.75);
    notificationWidth = Math.floor(availableWidth * 0.25);
    
    // Ensure minimum widths and that they fit
    mainWidth = Math.max(35, Math.min(mainWidth, availableWidth - 20));
    notificationWidth = Math.max(15, availableWidth - mainWidth);
  }
  
  return {
    isWide,
    isTall,
    mainWidth,
    notificationWidth,
    shouldStack
  };
};