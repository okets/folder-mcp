/**
 * CLI Argument Parser for Theme Configuration Override
 * 
 * Supports parsing CLI arguments like:
 * - folder-mcp --theme light /path/to/folder
 * - folder-mcp --theme dark-optimized /path/to/folder
 * - folder-mcp --theme auto /path/to/folder
 */

export interface CliArguments {
  folderPath?: string;
  theme?: 'auto' | 'light' | 'dark' | 'light-optimized' | 'dark-optimized' | 'default' | 'minimal';
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
          result.errors.push('--theme requires a value (auto, light, dark, light-optimized, dark-optimized, default, or minimal)');
          break;
        }
        
        const themeValue = args[i];
        const validThemes = ['auto', 'light', 'dark', 'light-optimized', 'dark-optimized', 'default', 'minimal'] as const;
        if (validThemes.includes(themeValue as any)) {
          result.args.theme = themeValue as typeof validThemes[number];
        } else {
          result.errors.push(`Invalid theme value: ${themeValue}. Must be one of: auto, light, dark, light-optimized, dark-optimized, default, minimal`);
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
Usage: folder-mcp [options] <folder-path>

Arguments:
  <folder-path>     Path to the folder to serve

Options:
  --theme <theme>   Override theme configuration (auto, light, dark, light-optimized, dark-optimized, default, minimal)
  --help, -h        Show this help message

Examples:
  folder-mcp /path/to/documents
  folder-mcp --theme dark-optimized /path/to/documents  
  folder-mcp --theme light /path/to/documents
  folder-mcp --theme auto /path/to/documents
`.trim();
  }

  /**
   * Validate parsed arguments
   */
  static validate(args: CliArguments): string[] {
    const errors: string[] = [];
    
    if (!args.folderPath && !args.help) {
      errors.push('Folder path is required');
    }
    
    return errors;
  }
}