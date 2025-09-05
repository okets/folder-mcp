# Folder Path Identification Changes

## Summary
Implemented folder_path as the primary identifier for MCP endpoints to resolve folder name collision issues.

## Problem Statement
When multiple folders have the same name but different paths (e.g., `/Users/alice/Work/Documents` and `/Users/alice/Personal/Documents`), MCP clients (like Claude) cannot distinguish between them when using just the folder name as an identifier.

## Solution
Changed all MCP endpoints to use `folder_path` instead of `folder_id` as the primary identifier. This ensures unambiguous folder identification since paths are guaranteed unique by the operating system.

## Changes Made

### 1. MCP Tool Schemas (`src/mcp-server.ts`)
- Changed all `folder_id` parameters to `folder_path`
- Updated descriptions to clarify that full paths are expected
- Affected tools:
  - `list_documents`: Now requires `folder_path`
  - `search`: Now requires `folder_path` 
  - `get_document_data`: Now requires `folder_path`
  - `get_document_outline`: Now requires `folder_path`

### 2. List Folders Response (`src/interfaces/mcp/daemon-mcp-endpoints.ts`)
- Enhanced `listFolders()` to show path as primary identifier
- Added comprehensive metadata display:
  - Status with emoji indicators (✅ active, ⏳ indexing, ❌ error, ⏸️ pending)
  - Indexing progress percentage for folders being indexed
  - Error messages for failed folders
  - Document count and total size
  - Document types breakdown (PDF, DOCX, XLSX counts)
  - Last indexed and last accessed timestamps
- Improved formatting with status summary header

### 3. MCP Endpoint Handlers (`src/interfaces/mcp/daemon-mcp-endpoints.ts`)
- Updated all method signatures to use `folderPath` parameter:
  - `search(query, folderPath, options)`
  - `listDocuments(folderPath, limit)`
  - `getDocument(folderPath, documentId)`
  - `getDocumentOutline(folderPath, documentId)`
- Updated error messages to reference folder paths instead of IDs

### 4. Daemon REST Client (`src/interfaces/mcp/daemon-rest-client.ts`)
- Changed all method parameters from `folderId` to `folderPath`:
  - `getDocuments(folderPath, options)`
  - `getDocumentData(folderPath, docId)`
  - `getDocumentOutline(folderPath, docId)`
  - `searchFolder(folderPath, searchParams)`
- Enhanced FolderConfig interface with new metadata fields:
  - `indexingProgress?: number` (0-100 for indexing status)
  - `errorMessage?: string` (error details)
  - `documentTypes?: Record<string, number>` (file type counts)
  - `totalSize?: number` (total bytes)
  - `lastAccessed?: string` (ISO timestamp)
- Note: Topics field commented out for Sprint 10 implementation

## Benefits

1. **Unambiguous Identification**: Paths are guaranteed unique by the OS
2. **No Collision Possible**: Each folder has a unique path
3. **Clear Parameter Naming**: `folder_path` leaves no ambiguity about what the parameter is
4. **Rich Metadata**: list_folders provides comprehensive information for decision-making
5. **Better UX**: MCP clients can show meaningful information to users
6. **Simple Implementation**: No complex ID mapping or resolution needed

## Example Usage

### Before (Ambiguous)
```typescript
// Which Documents folder?
search("tax returns", "Documents")  
```

### After (Clear)
```typescript
// Unambiguous path identification
search("tax returns", "/Users/alice/Personal/Documents")
```

## List Folders Response Example
```
🗂️ Available Folders (3 total)
════════════════════════════════════════
Status Summary: 2 active, 1 indexing, 0 pending, 0 errors

📁 /Users/alice/Work/Documents
   Name: Documents
   Status: ✅ active
   Model: all-MiniLM-L6-v2
   Documents: 152
   Total Size: 45.30 MB
   Types: PDF (89), DOCX (43), XLSX (20)
   Last indexed: 2024-01-15T10:30:00Z

📁 /Users/alice/Personal/Documents
   Name: Documents
   Status: ✅ active
   Model: all-MiniLM-L6-v2
   Documents: 89
   Total Size: 23.10 MB
   Types: PDF (45), DOCX (30), TXT (14)
   Last indexed: 2024-01-15T09:15:00Z

📁 /Users/alice/Courses/Chemistry
   Name: Chemistry
   Status: ⏳ indexing
   Progress: 65%
   Model: sentence-transformers/all-mpnet-base-v2
   Documents: 45
```

## Testing
- Build successful: `npm run build`
- Syntax validation passed for all modified files
- No backward compatibility concerns (pre-release)

## Future Considerations
- Topics will be added in Sprint 10 for semantic folder selection
- Path normalization may be needed for cross-platform support
- Consider adding path validation to prevent directory traversal attacks