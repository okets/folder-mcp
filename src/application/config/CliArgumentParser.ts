/**
 * CLI Argument Parser for Theme Configuration Override
 *
 * Supports parsing CLI arguments like:
 * - folder-mcp --theme light /path/to/folder
 * - folder-mcp --theme dracula /path/to/folder
 */

import { themes, ThemeName } from '../../interfaces/tui-ink/contexts/ThemeContext.js';

// ThemeValue is ThemeName from ThemeContext - single source of truth
export type ThemeValue = ThemeName;

export interface CliArguments {
  folderPath?: string;
  theme?: ThemeValue;
  help?: boolean;
}

export interface ParsedCliResult {
  args: CliArguments;
  errors: string[];
  showHelp: boolean;
}

export class CliArgumentParser {
  
  /**
   * Parse command line arguments
   */
  static parse(argv: string[]): ParsedCliResult {
    const result: ParsedCliResult = {
      args: {},
      errors: [],
      showHelp: false
    };

    // Skip 'node' and script name
    const args = argv.slice(2);
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        result.showHelp = true;
        result.args.help = true;
        i++;
      } else if (arg === '--theme') {
        i++;
        if (i >= args.length) {
          result.errors.push('--theme requires a value (e.g., default, light, dracula, nord, ocean, etc.)');
          break;
        }

        const themeValue = args[i];
        const validThemes = Object.keys(themes) as ThemeName[];
        if (validThemes.includes(themeValue as ThemeName)) {
          result.args.theme = themeValue as ThemeValue;
        } else {
          result.errors.push(`Invalid theme value: ${themeValue}. Must be one of: ${validThemes.join(', ')}`);
        }
        i++;
      } else if (arg && arg.startsWith('--')) {
        result.errors.push(`Unknown option: ${arg}`);
        i++;
      } else if (arg) {
        // Positional argument - assume it's the folder path
        if (result.args.folderPath) {
          result.errors.push(`Multiple folder paths specified: ${result.args.folderPath} and ${arg}`);
        } else {
          result.args.folderPath = arg;
        }
        i++;
      } else {
        i++;
      }
    }

    return result;
  }

  /**
   * Get help text for CLI usage
   */
  static getHelpText(): string {
    return `
Usage: folder-mcp [options] [folder-path]

Arguments:
  [folder-path]     Optional: Path to the folder to serve (if not provided, connects to daemon)

Options:
  --theme <theme>   Override theme configuration
                    Core: default, light, minimal
                    Accessibility: high-contrast, colorblind
                    Nature: ocean, forest, sunset
                    Editor: dracula, nord, monokai, solarized, gruvbox
  --help, -h        Show this help message

Examples:
  folder-mcp                        # Connect to daemon for multi-folder support
  folder-mcp --theme dracula        # Connect to daemon with Dracula theme
  folder-mcp --theme ocean          # Connect to daemon with Ocean theme
`.trim();
  }

  /**
   * Validate parsed arguments
   */
  static validate(_args: CliArguments): string[] {
    const errors: string[] = [];
    
    // Phase 9: folderPath is now optional - MCP server can fetch folders from daemon
    // Keep the validation commented for reference but don't enforce it
    // if (!args.folderPath && !args.help) {
    //   errors.push('Folder path is required');
    // }
    
    return errors;
  }
}