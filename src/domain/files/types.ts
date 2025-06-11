export interface FileContent {
  path: string;
  content: string;
  metadata: FileMetadata;
}

export interface FileMetadata {
  originalPath: string;
  type: string;
  size: number;
  modified: Date;
} 