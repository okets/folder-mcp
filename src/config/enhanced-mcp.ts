/**
 * Enhanced MCP Features Configuration
 * 
 * This module defines configuration for MCP protocol extensions that enhance
 * the user experience and development workflow. These features go beyond the
 * core MCP specification to provide better tooling and integration.
 * 
 * IMPORTANT: These are NOT part of the official MCP specification. They are
 * experimental extensions that were originally documented in VSCode 1.101
 * MCP integration, but are designed to be client-agnostic.
 * 
 * CURRENT SUPPORT:
 * - VSCode 1.101+ (with MCP extension) - Full support for all features
 * - Other MCP clients - Will safely ignore unknown features and use standard MCP
 * 
 * ============================================================================
 * FEATURE BREAKDOWN:
 * ============================================================================
 * 
 * 🛠️  TOOL SETS (Client UI Enhancement)
 * ────────────────────────────────────────────────────────────────────────────
 * Purpose: Organize MCP tools into logical groups for better UX
 * Usage: Clients can group tools in menus/palettes instead of flat lists
 * Status: Extension to MCP - not part of official spec
 * Support: VSCode 1.101+ (fully supported), other clients (safely ignored)
 * Example: "document-access" set contains get_document_content, get_metadata, etc.
 * 
 * 🎮 SLASH COMMANDS (Client UI Feature - NOT Official MCP Prompts)
 * ────────────────────────────────────────────────────────────────────────────
 * Purpose: Provide quick shortcuts in client UIs (like "/search documents")
 * Usage: Clients can offer slash command autocomplete and shortcuts
 * Status: Client-specific UI enhancement - NOT the official MCP "prompts" feature
 * Support: VSCode 1.101+ (slash command UI), other clients (feature ignored) 
 * Note: This is different from official MCP prompts (which are prompt templates)
 * 
 * 🔧 DEVELOPMENT MODE (Development Enhancement)
 * ────────────────────────────────────────────────────────────────────────────
 * Purpose: Enable hot reload, debugging, and development-time features
 * Usage: Set watch patterns, debug ports, auto-restart behavior
 * Status: Development convenience - not part of MCP runtime spec
 * 
 * 💾 RESOURCES (Experimental MCP Extension)
 * ────────────────────────────────────────────────────────────────────────────
 * Purpose: Enable save/drag functionality for MCP resources
 * Usage: Allows clients to save search results, export data, etc.
 * Status: Experimental extension to MCP resources concept
 * Support: VSCode 1.101+ (save/drag UI), other clients (gracefully ignored)
 * 
 * ============================================================================
 * COMPATIBILITY & USAGE:
 * ============================================================================
 * 
 * ✅ Forward Compatible: Clients that don't support these features ignore them
 * ✅ Optional: Server works fine without any enhanced features enabled
 * ✅ Client Agnostic: Any MCP client can implement these extensions
 * ⚠️  Experimental: These features may change as MCP specification evolves
 * 
 * To enable: Set FOLDER_MCP_DEVELOPMENT_ENABLED=true environment variable
 * To disable: Simply don't set the environment variable (standard MCP only)
 */

/**
 * Enhanced MCP Configuration Interface
 * 
 * Defines the structure for optional MCP protocol extensions that enhance
 * the development and user experience beyond core MCP functionality.
 */
export interface EnhancedMCPConfig {
  /**
   * Development Mode Configuration
   * 
   * Enables development-time features like hot reload and debugging.
   * This is purely for development convenience and not part of MCP runtime.
   */
  dev?: {
    /** File patterns to watch for changes (enables hot reload) */
    watch?: string;
    /** Debug configuration for development */
    debug?: {
      type: string;      // Debug type (e.g., "node")
      port?: number;     // Debug port (e.g., 9229)
      enabled: boolean;  // Whether debugging is enabled
    };
    /** Enable hot reload on file changes */
    hotReload?: boolean;
    /** Auto-restart server on crashes during development */
    autoRestart?: boolean;
  };
  
  /**
   * Slash Commands Configuration (NOT Official MCP Prompts)
   * 
   * IMPORTANT: This is NOT the official MCP "prompts" feature from the spec.
   * Official MCP prompts are reusable prompt templates with arguments.
   * 
   * This is a client UI feature for slash command shortcuts like "/search".
   * Rename this if it causes confusion with official MCP prompts.
   */
  prompts?: {
    /** Enable slash command style shortcuts in clients */
    enabled: boolean;
    /** Prefix for slash commands (e.g., "/mcp.folder-mcp") */
    prefix: string;
  };
  
  /**
   * Agent Integration Configuration
   * 
   * Controls how the MCP server integrates with AI agents and clients
   * to provide enhanced context and workflow support.
   */
  agent?: {
    /** Provide implicit context to reduce tool call verbosity */
    implicitContext: boolean;
    /** Integration mode for enhanced client features */
    integrationMode: string;
    /** Enable context-aware responses */
    contextAware: boolean;
  };
  
  /**
   * Tool Sets Configuration (Client UI Enhancement)
   * 
   * Organizes MCP tools into logical groups for better UX in clients.
   * This is an extension to help clients organize tools in menus/palettes
   * instead of showing a flat list of all available tools.
   */
  toolSets?: ToolSetConfig;
  
  /**
   * Resources Configuration (Experimental MCP Extension)
   * 
   * Enables enhanced resource management features like save/drag functionality.
   * This extends the basic MCP resources concept with additional capabilities.
   */
  resources?: {
    /** Enable save/drag functionality for resources */
    enableSaveDrag: boolean;
    /** Supported formats for resource export */
    formats: string[];
  };
}

/**
 * Tool Set Configuration Interface
 * 
 * Defines logical groupings of MCP tools for better client UX.
 * Each tool set has a name, list of tools, description, and icon.
 */
export interface ToolSetConfig {
  [setName: string]: {
    /** List of MCP tool names that belong to this set */
    tools: string[];
    /** Human-readable description of what this tool set does */
    description: string;
    /** Icon identifier for UI representation (client-dependent) */
    icon: string;
  };
}

/**
 * Default Enhanced MCP Configuration
 * 
 * This configuration demonstrates all available enhanced MCP features.
 * These features are OPTIONAL and extend the core MCP functionality.
 * 
 * ============================================================================
 * USAGE SCENARIOS:
 * ============================================================================
 * 
 * 🎯 Standard MCP Usage (Most Common):
 * - Don't set FOLDER_MCP_DEVELOPMENT_ENABLED environment variable
 * - Server operates in pure MCP compatibility mode
 * - All clients work normally with standard MCP tools
 * 
 * 🚀 Enhanced Experience (Advanced Clients):
 * - Set FOLDER_MCP_DEVELOPMENT_ENABLED=true
 * - Clients that support these features get enhanced UX
 * - Clients that don't support them ignore the extensions safely
 * 
 * 🔧 Development Mode:
 * - Enhanced features + development tools enabled
 * - Hot reload, debugging, file watching
 * - Useful for MCP server development and testing
 * 
 * ============================================================================
 * FEATURE IMPLEMENTATION STATUS:
 * ============================================================================
 * 
 * ✅ Tool Sets: Fully implemented, organizes tools into logical groups
 * ✅ Development Mode: Implemented, provides hot reload and debugging
 * ✅ Agent Integration: Implemented, enhances context and workflow
 * ⚠️  Slash Commands: Implemented but may need renaming (not official MCP prompts)
 * ⚠️  Resources: Basic implementation, may need alignment with MCP spec evolution
 * 
 * ============================================================================
 */
export const DEFAULT_ENHANCED_MCP_CONFIG: EnhancedMCPConfig = {
  /**
   * Development Mode Configuration
   * Only active during development - not used in production deployments
   */
  dev: {
    watch: "dist/**/*.js",     // Watch compiled JS files for changes
    debug: {
      type: "node",            // Node.js debugging
      port: 9229,              // Standard Node.js debug port
      enabled: true            // Enable debugging support
    },
    hotReload: true,           // Restart server on file changes
    autoRestart: true          // Auto-restart on crashes
  },
  
  /**
   * Slash Commands Configuration
   * 
   * WARNING: This is NOT the official MCP "prompts" feature!
   * Official MCP prompts are reusable prompt templates.
   * This is a client UI feature for slash command shortcuts.
   */
  prompts: {
    enabled: true,                    // Enable slash command shortcuts
    prefix: "/mcp.folder-mcp"         // Prefix for slash commands in client UI
  },
  
  /**
   * Agent Integration Configuration
   * Enhances how the MCP server works with AI agents
   */
  agent: {
    implicitContext: true,            // Provide context automatically
    integrationMode: "enhanced",      // Use enhanced integration features
    contextAware: true                // Enable context-aware responses
  },
  
  /**
   * Tool Sets Configuration
   * 
   * Organizes MCP tools into logical groups for better client UX.
   * This helps clients show organized menus instead of flat tool lists.
   * 
   * Format follows the extension pattern documented in VSCode 1.101,
   * but is designed to be usable by any MCP client.
   */
  toolSets: {
    "document-access": {
      tools: ["get_document_content", "get_document_metadata", "get_chunks"],
      description: "Direct document access and content retrieval",
      icon: "file-text"   // Client-dependent icon identifier
    },
    "content-analysis": {
      tools: ["summarize_document", "batch_summarize", "query_table"],
      description: "Document analysis and summarization",
      icon: "graph"
    },
    "workspace-navigation": {
      tools: ["list_folders", "list_documents", "get_status"],
      description: "Workspace exploration and status monitoring", 
      icon: "folder"
    },
    "search-intelligence": {
      tools: ["search_documents", "search_chunks"],
      description: "Semantic search and content discovery",
      icon: "search"
    },
    "system-operations": {
      tools: ["get_status", "refresh_document", "get_embeddings"],
      description: "System utilities and debugging tools",
      icon: "tools"
    }
  },
  
  /**
   * Resources Configuration
   * 
   * Enables enhanced resource management beyond basic MCP resources.
   * Allows clients to save/export search results and other data.
   */
  resources: {
    enableSaveDrag: true,                    // Enable save/drag functionality
    formats: ["text", "markdown", "json"]   // Supported export formats
  }
};

/**
 * Get Tool Set for Specific Tool
 * 
 * Given a tool name, returns which tool set it belongs to.
 * This helps clients understand the logical grouping of tools.
 * 
 * @param toolName - Name of the MCP tool to look up
 * @param config - Enhanced MCP configuration (optional, uses default if not provided)
 * @returns Tool set name if found, null if tool is not in any set
 * 
 * @example
 * ```typescript
 * const setName = getToolSetForTool("search_documents");
 * // Returns: "search-intelligence"
 * ```
 */
export function getToolSetForTool(toolName: string, config: EnhancedMCPConfig = DEFAULT_ENHANCED_MCP_CONFIG): string | null {
  const toolSets = config.toolSets || DEFAULT_ENHANCED_MCP_CONFIG.toolSets!;
  
  for (const [setName, setConfig] of Object.entries(toolSets)) {
    if (setConfig.tools.includes(toolName)) {
      return setName;
    }
  }
  
  return null;
}

/**
 * Get All Tools in a Tool Set
 * 
 * Returns all tool names that belong to a specific tool set.
 * Useful for clients that want to show all tools in a particular category.
 * 
 * @param setName - Name of the tool set to query
 * @param config - Enhanced MCP configuration (optional, uses default if not provided)
 * @returns Array of tool names in the set, empty array if set doesn't exist
 * 
 * @example
 * ```typescript
 * const tools = getToolsInSet("search-intelligence");
 * // Returns: ["search_documents", "search_chunks"]
 * ```
 */
export function getToolsInSet(setName: string, config: EnhancedMCPConfig = DEFAULT_ENHANCED_MCP_CONFIG): string[] {
  const toolSets = config.toolSets || DEFAULT_ENHANCED_MCP_CONFIG.toolSets!;
  const setConfig = toolSets[setName];
  
  return setConfig ? setConfig.tools : [];
}

/**
 * Format Tool Sets for MCP Clients
 * 
 * Returns tool set configuration in the standard format expected by MCP clients.
 * This provides the raw tool set data that clients can use to organize their UI.
 * 
 * @param config - Enhanced MCP configuration (optional, uses default if not provided)
 * @returns Tool sets formatted as: {setName: {tools: [...], description: "...", icon: "..."}}
 * 
 * @example
 * ```typescript
 * const formatted = formatToolSetsForClients();
 * // Returns: {
 * //   "document-access": {
 * //     tools: ["get_document_content", "get_document_metadata", "get_chunks"],
 * //     description: "Direct document access and content retrieval",
 * //     icon: "file-text"
 * //   },
 * //   ...
 * // }
 * ```
 * 
 * @note This is the format that gets sent to MCP clients as part of server capabilities.
 *       Clients can use this to organize tools in menus, palettes, or other UI elements.
 */
export function formatToolSetsForClients(config: EnhancedMCPConfig = DEFAULT_ENHANCED_MCP_CONFIG): Record<string, any> {
  const toolSets = config.toolSets || DEFAULT_ENHANCED_MCP_CONFIG.toolSets!;
  
  // Return the tool sets in the standard MCP extension format
  return toolSets;
}

/*
 * ============================================================================
 * USAGE EXAMPLES AND INTEGRATION GUIDE
 * ============================================================================
 * 
 * ## Basic MCP Server (Standard Compatibility)
 * ```typescript
 * // Don't set FOLDER_MCP_DEVELOPMENT_ENABLED environment variable
 * // Server operates in standard MCP mode - works with all clients
 * const server = new MCPServer(options, logger, null);
 * ```
 * 
 * ## Enhanced MCP Server (Advanced Features)
 * ```typescript
 * // Set FOLDER_MCP_DEVELOPMENT_ENABLED=true environment variable
 * import { DEFAULT_ENHANCED_MCP_CONFIG } from './enhanced-mcp.js';
 * const server = new MCPServer(options, logger, DEFAULT_ENHANCED_MCP_CONFIG);
 * ```
 * 
 * ## Custom Enhanced Configuration
 * ```typescript
 * const customConfig: EnhancedMCPConfig = {
 *   // Only enable tool sets, disable other features
 *   toolSets: DEFAULT_ENHANCED_MCP_CONFIG.toolSets,
 *   dev: { ...DEFAULT_ENHANCED_MCP_CONFIG.dev, hotReload: false },
 *   // Disable slash commands (they're not official MCP prompts anyway)
 *   prompts: { enabled: false, prefix: "" }
 * };
 * const server = new MCPServer(options, logger, customConfig);
 * ```
 * 
 * ## Client Integration Examples
 * ```typescript
 * // Client discovers tool sets through capabilities
 * const capabilities = await server.getCapabilities();
 * if (capabilities.tools?.toolSets) {
 *   // Organize tools by sets in UI
 *   const documentTools = capabilities.tools.toolSets["document-access"];
 *   showToolGroup("Document Access", documentTools.tools);
 * }
 * ```
 * 
 * ============================================================================
 * MIGRATION AND COMPATIBILITY NOTES
 * ============================================================================
 * 
 * 🔄 From Standard MCP:
 * - All existing MCP tools continue to work unchanged
 * - Enhanced features are purely additive
 * - No breaking changes to core MCP functionality
 * 
 * ⚠️  Future MCP Spec Changes:
 * - If official MCP adds similar features, we may need to align
 * - Tool sets may become part of official MCP specification
 * - "prompts" config should be renamed to avoid confusion with official MCP prompts
 * 
 * 🎯 Client Development:
 * - Check for enhanced capabilities before using them
 * - Gracefully degrade if features are not available
 * - Don't assume all MCP servers support these extensions
 * - VSCode 1.101+ users will get the full enhanced experience
 * - Other MCP client users will get standard MCP functionality
 * 
 * 📋 Testing Support:
 * - Use VSCode 1.101+ with MCP extension to test enhanced features
 * - Use other MCP clients to verify graceful degradation
 * - Set FOLDER_MCP_DEVELOPMENT_ENABLED=true to activate these features
 * 
 * ============================================================================
 */
