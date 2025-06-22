// ANSI color mapping utility for precise color control
export const useColors = () => {
  const colorize = (text: string, color: string): string => {
    const colorCodes: Record<string, string> = {
      // Custom colors with specific RGB values
      '#A65EF6': '\x1b[38;2;166;94;246m',  // Exact logo purple rgb(166,94,246)
      
      // Standard colors
      '#06B6D4': '\x1b[38;5;6m',    // cyan
      '#F59E0B': '\x1b[38;5;3m',    // yellow/orange
      '#10B981': '\x1b[38;5;2m',    // green
      '#EF4444': '\x1b[38;5;1m',    // red
      '#F9FAFB': '\x1b[37m',        // white
      '#9CA3AF': '\x1b[90m',        // gray
      
      // Ink color shortcuts
      'cyan': '\x1b[38;5;6m',
      'yellow': '\x1b[38;5;3m',
      'magenta': '\x1b[38;5;5m',
      'white': '\x1b[37m',
      'gray': '\x1b[90m'
    };
    
    return (colorCodes[color] || '') + text + '\x1b[0m';
  };

  return { colorize };
};