/**
 * Temporary stub for config interfaces
 * TODO: Remove when CLI services are updated to use new config system
 */

export interface IConfigurationManager {
  load(): Promise<void>;
  getConfig(): any;
  getSources(): any;
  get(key: string): any;
  set(key: string, value: any): Promise<void>;
  on(event: string, callback: any): void;
}

export interface IProfileManager {
  getActiveProfile(): any;
  list(): any;
}

export interface IConfigValidator {
  // Minimal stub interface
}