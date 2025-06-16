/**
 * VSCode MCP Configuration
 * 
 * Configuration support for VSCode-specific MCP features including:
 * - Tool sets organization
 * - MCP prompts
 * - Development mode
 * - Resource management
 */

export interface VSCodeMCPConfig {
  dev?: {
    watch?: string;
    debug?: {
      type: string;
      port?: number;
      enabled: boolean;
    };
    hotReload?: boolean;
    autoRestart?: boolean;
  };
  
  prompts?: {
    enabled: boolean;
    prefix: string;
  };
  
  agent?: {
    implicitContext: boolean;
    integrationMode: string;
    contextAware: boolean;
  };
  
  toolSets?: ToolSetConfig;
  
  resources?: {
    enableSaveDrag: boolean;
    formats: string[];
  };
}

export interface ToolSetConfig {
  [setName: string]: {
    tools: string[];
    description: string;
    icon: string;
  };
}

/**
 * Default VSCode MCP Configuration
 */
export const DEFAULT_VSCODE_MCP_CONFIG: VSCodeMCPConfig = {
  dev: {
    watch: "dist/**/*.js",
    debug: {
      type: "node",
      port: 9229,
      enabled: true
    },
    hotReload: true,
    autoRestart: true
  },
  
  prompts: {
    enabled: true,
    prefix: "/mcp.folder-mcp"
  },
  
  agent: {
    implicitContext: true,
    integrationMode: "enhanced",
    contextAware: true
  },
  
  // Tool sets following VSCode 1.101 documented format
  toolSets: {
    "document-access": {
      tools: ["get_document_content", "get_document_metadata", "get_chunks"],
      description: "Direct document access and content retrieval",
      icon: "file-text"
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
      tools: ["hello_world", "refresh_document", "get_embeddings"],
      description: "System utilities and debugging tools",
      icon: "tools"
    }
  },
  
  resources: {
    enableSaveDrag: true,
    formats: ["text", "markdown", "json"]
  }
};

/**
 * Get tool set configuration for a specific tool
 */
export function getToolSetForTool(toolName: string, config: VSCodeMCPConfig = DEFAULT_VSCODE_MCP_CONFIG): string | null {
  const toolSets = config.toolSets || DEFAULT_VSCODE_MCP_CONFIG.toolSets!;
  
  for (const [setName, setConfig] of Object.entries(toolSets)) {
    if (setConfig.tools.includes(toolName)) {
      return setName;
    }
  }
  
  return null;
}

/**
 * Get all tools in a specific tool set
 */
export function getToolsInSet(setName: string, config: VSCodeMCPConfig = DEFAULT_VSCODE_MCP_CONFIG): string[] {
  const toolSets = config.toolSets || DEFAULT_VSCODE_MCP_CONFIG.toolSets!;
  const setConfig = toolSets[setName];
  
  return setConfig ? setConfig.tools : [];
}

/**
 * Get tool set information formatted for VSCode MCP
 */
export function formatToolSetsForVSCode(config: VSCodeMCPConfig = DEFAULT_VSCODE_MCP_CONFIG): Record<string, any> {
  const toolSets = config.toolSets || DEFAULT_VSCODE_MCP_CONFIG.toolSets!;
  
  // Format according to VSCode 1.101 documentation: 
  // {"name": {"tools": [...], "description": "...", "icon": "..."}}
  return toolSets;
}
