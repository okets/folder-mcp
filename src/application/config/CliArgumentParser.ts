/**
 * CLI Argument Parser for Theme Configuration Override
 * 
 * Supports parsing CLI arguments like:
 * - folder-mcp --theme light /path/to/folder
 * - folder-mcp --theme dark /path/to/folder
 * - folder-mcp --theme auto /path/to/folder
 */

export interface CliArguments {
  folderPath?: string;
  theme?: 'light' | 'dark' | 'auto';
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
          result.errors.push('--theme requires a value (light, dark, or auto)');
          break;
        }
        
        const themeValue = args[i];
        if (themeValue === 'light' || themeValue === 'dark' || themeValue === 'auto') {
          result.args.theme = themeValue;
        } else {
          result.errors.push(`Invalid theme value: ${themeValue}. Must be one of: light, dark, auto`);
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
  --theme <theme>   Override theme configuration (light, dark, auto)
  --help, -h        Show this help message

Examples:
  folder-mcp /path/to/documents
  folder-mcp --theme dark /path/to/documents  
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