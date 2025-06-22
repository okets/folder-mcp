import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { AppLayout } from '../components/AppLayout.js';
import { TerminalSize } from '../hooks/useTerminal.js';
import { FocusState } from '../hooks/useFocus.js';

interface ConfigScreenProps {
  terminalSize: TerminalSize;
  onNext?: () => void;
  focusState: FocusState;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ 
  terminalSize, 
  onNext,
  focusState
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [notifications, setNotifications] = useState([
    'System initialized...',
    'Checking cached configuration...',
    'Loading default settings...'
  ]);

  // Simulate some interactive content
  const mainContent = (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color="white" bold>Configuration Setup</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">Step {currentStep} of 3: Choose configuration method</Text>
      </Box>
      
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text color="cyan">▸ </Text>
          <Text color="white">Create optimized configuration for my machine</Text>
        </Box>
        <Box>
          <Text color="gray">  </Text>
          <Text color="gray">Start configuration wizard</Text>
        </Box>
      </Box>
      
      <Box marginTop={2}>
        <Text color="gray" dimColor>Use ↑↓ to navigate, Enter to select</Text>
      </Box>
    </Box>
  );

  // Read-only notification area
  const notificationContent = (
    <Box flexDirection="column" paddingY={1}>
      {notifications.map((notification, index) => (
        <Box key={index} marginBottom={0}>
          <Text color="yellow">• </Text>
          <Text color="gray">{notification}</Text>
        </Box>
      ))}
      
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Terminal: {terminalSize.width}×{terminalSize.height}
        </Text>
      </Box>
    </Box>
  );

  return (
    <AppLayout
      terminalSize={terminalSize}
      mainTitle="Configuration"
      mainBorderColor="#A65EF6"  // Purple like the logo
      mainChildren={mainContent}
      notificationTitle="Status"
      notificationBorderColor="#F59E0B"  // Orange/yellow hex color
      notificationChildren={notificationContent}
      focusState={focusState}
    />
  );
};