import React from 'react';
import { Box, Text } from 'ink';
import { ShortcutContext } from '../shortcuts/types.js';
import { useShortcuts } from '../shortcuts/hooks/useShortcuts.js';

interface StatusBarProps {
  context: ShortcutContext;
  version?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  context, 
  version = 'v1.0.0' 
}) => {
  const { shortcuts } = useShortcuts(context);
  
  // Format shortcuts with bold keys in brackets
  const formatShortcut = (shortcut: { key: string; description: string }) => (
    <Text key={shortcut.key} color="gray">
      <Text bold color="white">[{shortcut.key}]</Text> {shortcut.description}
    </Text>
  );
  
  const formattedShortcuts = shortcuts.map((shortcut, index) => (
    <React.Fragment key={shortcut.key}>
      {index > 0 && <Text color="gray"> • </Text>}
      {formatShortcut(shortcut)}
    </React.Fragment>
  ));
  
  return (
    <Box paddingX={1} justifyContent="center">
      {formattedShortcuts}
    </Box>
  );
};