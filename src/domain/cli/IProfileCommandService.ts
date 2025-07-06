/**
 * Profile Command Service Interface
 * 
 * Domain interface for profile management command operations.
 * Provides the contract for profile list/show/set/create/delete/copy operations.
 */

export interface ProfileInfo {
  name: string;
  path: string;
  isActive: boolean;
  createdAt: Date;
  lastModified: Date;
  description?: string | undefined;
  size: number; // File size in bytes
}

export interface ProfileCreateOptions {
  fromProfile?: string;
  description?: string;
  template?: 'development' | 'production' | 'testing' | 'minimal';
  copyCurrentConfig?: boolean;
}

export interface ProfileCopyOptions {
  overwrite?: boolean;
  mergeMode?: 'replace' | 'merge' | 'overlay';
}

export interface ProfileDeleteOptions {
  force?: boolean;
  backup?: boolean;
}

export interface ProfileListOptions {
  includeInactive?: boolean;
  showDetails?: boolean;
  format?: 'table' | 'list' | 'json';
}

export interface ProfileShowOptions {
  format?: 'yaml' | 'json';
  showMetadata?: boolean;
  expandIncludes?: boolean;
}

export interface ProfileSetOptions {
  validateBeforeSwitch?: boolean;
  createIfNotExists?: boolean;
}

export interface ProfileListResult {
  profiles: ProfileInfo[];
  activeProfile?: string;
  totalProfiles: number;
}

export interface ProfileOperationResult {
  success: boolean;
  message: string;
  profile?: string;
  previousProfile?: string;
  warnings?: string[];
}

/**
 * Domain interface for profile command operations
 */
export interface IProfileCommandService {
  /**
   * List all available profiles
   */
  listProfiles(options?: ProfileListOptions): Promise<ProfileListResult>;

  /**
   * Show detailed information about a specific profile
   */
  showProfile(name: string, options?: ProfileShowOptions): Promise<ProfileInfo>;

  /**
   * Switch to a different profile
   */
  setActiveProfile(name: string, options?: ProfileSetOptions): Promise<ProfileOperationResult>;

  /**
   * Create a new profile
   */
  createProfile(name: string, options?: ProfileCreateOptions): Promise<ProfileOperationResult>;

  /**
   * Delete a profile
   */
  deleteProfile(name: string, options?: ProfileDeleteOptions): Promise<ProfileOperationResult>;

  /**
   * Copy a profile to a new name
   */
  copyProfile(fromName: string, toName: string, options?: ProfileCopyOptions): Promise<ProfileOperationResult>;

  /**
   * Get current active profile information
   */
  getActiveProfile(): Promise<ProfileInfo | null>;

  /**
   * Validate profile configuration
   */
  validateProfile(name: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
}