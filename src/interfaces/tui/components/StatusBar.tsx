import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { KeyboardManager } from '../keyboard/KeyboardManager.js';

export const StatusBar: React.FC = () => {
  const [renderTrigger, setRenderTrigger] = useState(0);
  
  // Register for updates from KeyboardManager
  useEffect(() => {
    const keyboardManager = KeyboardManager.getInstance();
    const renderCallback = () => setRenderTrigger(prev => prev + 1);
    keyboardManager.addRenderCallback(renderCallback);
    
    return () => {
      keyboardManager.removeRenderCallback(renderCallback);
    };
  }, []);
  
  const shortcuts = KeyboardManager.getInstance().getStatusBarShortcuts();
  
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