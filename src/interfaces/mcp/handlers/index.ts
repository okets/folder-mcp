/**
 * MCP Handlers Index
 * 
 * Exports all MCP handlers for document intelligence functionality.
 * These handlers provide Claude Desktop integration with the same features as gRPC endpoints.
 */

export { BasicHandler } from './basic.js';
export { SearchHandler } from './search.js';
export { NavigationHandler } from './navigation.js';
export { DocumentAccessHandler } from './document-access.js';
export { SummarizationHandler } from './summarization.js';
export { SpecializedHandler } from './specialized.js';
export { MCPResourcesHandler } from './resources.js';
export type { MCPResource, MCPResourceContent } from './resources.js';
