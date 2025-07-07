/**
 * Temporary stub for Help System Service
 * TODO: Remove when help system is updated to use new config system
 */

export class HelpSystemService {
  constructor() {}

  getCommands(): any[] {
    return [];
  }

  getCommandHelp(command: string): any {
    return null;
  }

  formatHelp(help: any): string {
    return '';
  }

  generateContextualHelp(context: any): string {
    return '';
  }

  getConfigurationHelpInfo(): any {
    return null;
  }
}