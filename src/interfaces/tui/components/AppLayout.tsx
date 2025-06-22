import React from 'react';
import { Box } from 'ink';
import { RoundBoxContainer } from './RoundBoxContainer.js';
import { StatusBoxContainer } from './StatusBoxContainer.js';
import { TerminalSize } from '../hooks/useTerminal.js';
import { useResponsive } from '../hooks/useResponsive.js';
import { FocusState } from '../hooks/useFocus.js';

interface AppLayoutProps {
  terminalSize: TerminalSize;
  mainTitle: string;
  mainBorderColor?: string;
  mainChildren: React.ReactNode;
  notificationTitle: string;
  notificationBorderColor?: string;
  notificationChildren: React.ReactNode;
  focusState?: FocusState;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  terminalSize,
  mainTitle,
  mainBorderColor = 'cyan',
  mainChildren,
  notificationTitle,
  notificationBorderColor = 'yellow',
  notificationChildren,
  focusState
}) => {
  const layout = useResponsive(terminalSize);
  
  if (layout.shouldStack) {
    // Stacked layout for narrow terminals
    return (
      <Box flexDirection="column" width="100%" height="100%">
        {/* Main container (80% of height) */}
        <RoundBoxContainer
          title={mainTitle}
          borderColor={mainBorderColor}
          width={layout.mainWidth}
          height={Math.floor((terminalSize.height - 10) * 0.8)}
          isFocused={focusState?.currentFocus === 'main'}
          isFocusable={true}
          {...(focusState?.currentFocus !== 'main' && { focusHint: 'ᵀᵃᵇ⁺ᶜ' })}
          scrollPosition={focusState?.scrollPosition.main || 0}
        >
          {mainChildren}
        </RoundBoxContainer>
        
        {/* Notification container (20% of height) */}
        <Box marginTop={1}>
          <RoundBoxContainer
            title={notificationTitle}
            borderColor={notificationBorderColor}
            width={layout.notificationWidth}
            height={Math.floor((terminalSize.height - 10) * 0.2)}
            isFocused={focusState?.currentFocus === 'status'}
            isFocusable={true}
            {...(focusState?.currentFocus !== 'status' && { focusHint: 'ᵀᵃᵇ⁺ˢ' })}
            scrollPosition={focusState?.scrollPosition.status || 0}
          >
            {notificationChildren}
          </RoundBoxContainer>
        </Box>
      </Box>
    );
  }
  
  // Side-by-side layout for wide terminals
  return (
    <Box flexDirection="row" width="100%" height="100%">
      {/* Main container (80% of width) */}
      <RoundBoxContainer
        title={mainTitle}
        borderColor={mainBorderColor}
        width={layout.mainWidth}
        height={terminalSize.height - 10}
        isFocused={focusState?.currentFocus === 'main'}
        isFocusable={true}
        {...(focusState?.currentFocus !== 'main' && { focusHint: 'ᵀᵃᵇ⁺ᶜ' })}
        scrollPosition={focusState?.scrollPosition.main || 0}
      >
        {mainChildren}
      </RoundBoxContainer>
      
      {/* Notification container (20% of width) */}
      <Box marginLeft={2}>
        <RoundBoxContainer
          title={notificationTitle}
          borderColor={notificationBorderColor}
          width={layout.notificationWidth}
          height={terminalSize.height - 10}
          isFocused={focusState?.currentFocus === 'status'}
          isFocusable={true}
          {...(focusState?.currentFocus !== 'status' && { focusHint: 'ᵀᵃᵇ⁺ˢ' })}
          scrollPosition={focusState?.scrollPosition.status || 0}
        >
          {notificationChildren}
        </RoundBoxContainer>
      </Box>
    </Box>
  );
};