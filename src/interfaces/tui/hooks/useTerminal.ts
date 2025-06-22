import { useEffect, useState } from 'react';

export interface TerminalSize {
  width: number;
  height: number;
}

export const useTerminal = () => {
  const [size, setSize] = useState<TerminalSize>({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24
  });

  useEffect(() => {
    // Don't use alternate screen buffer - just clear and position
    process.stdout.write('\x1b[2J');     // Clear entire screen
    process.stdout.write('\x1b[1;1H');   // Move cursor to row 1, column 1 (top-left)
    process.stdout.write('\x1b[?25l');   // Hide cursor

    // Handle terminal resize
    const handleResize = () => {
      setSize({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24
      });
    };

    process.stdout.on('resize', handleResize);

    // Cleanup on unmount
    return () => {
      process.stdout.off('resize', handleResize);
      // Restore cursor
      process.stdout.write('\x1b[?25h'); // Show cursor
    };
  }, []);

  return { size };
};