// Pure runtime detection - no dependency on curated models

export interface OllamaModelInfo {
  name: string;
  tag: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaApiResponse {
  models: OllamaModelInfo[];
}

// Basic model info for runtime-detected Ollama models
export interface OllamaBasicModel {
  id: string;
  modelName: string;
  displayName: string;
  description: string;
  size?: number;
}

export interface OllamaDetectionResult {
  isRunning: boolean;
  models: OllamaBasicModel[];  // Pure runtime info only
  detectedModels: OllamaModelInfo[];
  installCommands: string[];
  error?: string;
}

export class OllamaDetector {
  private readonly endpoint: string;
  private readonly timeout: number;

  constructor(endpoint: string = 'http://localhost:11434', timeout: number = 3000) {
    this.endpoint = endpoint;
    this.timeout = timeout;
  }

  /**
   * Detect available Ollama models - pure runtime detection
   */
  async detectModels(mode: 'assisted' | 'manual'): Promise<OllamaDetectionResult> {
    try {
      // Assisted mode never returns Ollama models (power-user feature only)
      if (mode === 'assisted') {
        return {
          isRunning: false,
          models: [],
          detectedModels: [],
          installCommands: []
        };
      }

      // Check if Ollama is running
      const isRunning = await this.checkOllamaStatus();
      
      if (!isRunning) {
        return {
          isRunning: false,
          models: [],
          detectedModels: [],
          installCommands: this.getBasicInstallCommands(),
          error: 'Ollama not running. Install and start Ollama first.'
        };
      }

      // Get available models from Ollama
      const detectedModels = await this.queryOllamaModels();
      
      // Convert to basic model info (no curated catalog lookup)
      const basicModels = this.convertToBasicModels(detectedModels);

      return {
        isRunning: true,
        models: basicModels,
        detectedModels,
        installCommands: []
      };

    } catch (error) {
      return {
        isRunning: false,
        models: [],
        detectedModels: [],
        installCommands: this.getBasicInstallCommands(),
        error: error instanceof Error ? error.message : 'Unknown error detecting Ollama models'
      };
    }
  }

  /**
   * Check if Ollama service is running
   */
  private async checkOllamaStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      return response.ok;

    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.debug('Ollama status check timed out');
      } else {
        console.debug('Ollama not available:', error instanceof Error ? error.message : String(error));
      }
      return false;
    }
  }

  /**
   * Query Ollama API for available models
   */
  private async queryOllamaModels(): Promise<OllamaModelInfo[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API responded with status ${response.status}`);
      }

      const data = await response.json() as OllamaApiResponse;
      
      // Filter for embedding models only
      return this.filterEmbeddingModels(data.models || []);

    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any)?.name === 'AbortError') {
        throw new Error('Ollama API request timed out');
      }
      throw error;
    }
  }

  /**
   * Filter out non-embedding models
   */
  private filterEmbeddingModels(models: OllamaModelInfo[]): OllamaModelInfo[] {
    const embeddingKeywords = [
      'embed', 'embedding', 'embeddings',
      'granite-embedding', 'arctic-embed', 'nomic-embed',
      'bge-', 'e5-', 'minilm'
    ];

    const chatKeywords = [
      'chat', 'instruct', 'assistant', 'llama', 'gemma', 
      'qwen', 'phi', 'mistral', 'codestral'
    ];

    return models.filter(model => {
      const name = model.name.toLowerCase();
      
      // Include if it contains embedding keywords
      const hasEmbeddingKeyword = embeddingKeywords.some(keyword => name.includes(keyword));
      if (hasEmbeddingKeyword) {
        return true;
      }

      // Exclude if it contains chat keywords
      const hasChatKeyword = chatKeywords.some(keyword => name.includes(keyword));
      if (hasChatKeyword) {
        return false;
      }

      // Include if uncertain (let user decide)
      return true;
    });
  }

  /**
   * Convert detected Ollama models to basic model info
   */
  private convertToBasicModels(detected: OllamaModelInfo[]): OllamaBasicModel[] {
    return detected.map(model => ({
      id: `ollama:${model.name}`,
      modelName: model.name,
      displayName: this.generateDisplayName(model.name),
      description: `User-managed Ollama model${model.size ? ` (${Math.round(model.size / 1024 / 1024)}MB)` : ''}`,
      size: model.size
    }));
  }

  /**
   * Generate a human-readable display name from model name
   */
  private generateDisplayName(modelName: string): string {
    // Convert model names to display names
    const displayNameMap: Record<string, string> = {
      'granite-embedding:278m': 'Granite Embedding (278M)',
      'snowflake-arctic-embed2:305m': 'Arctic Embed2 (305M)',
      'snowflake-arctic-embed2:568m': 'Arctic Embed2 (568M)',
      'nomic-embed-text': 'Nomic Embed Text',
      'all-minilm:l6-v2': 'All-MiniLM-L6-v2',
      'bge-m3': 'BGE-M3'
    };

    // Check for exact match first
    if (displayNameMap[modelName]) {
      return displayNameMap[modelName];
    }

    // Generate display name from model name
    const parts = modelName.split(':');
    const baseName = parts[0] || modelName;
    const tag = parts[1];

    // Capitalize and format
    const formatted = baseName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return tag ? `${formatted} (${tag.toUpperCase()})` : formatted;
  }

  /**
   * Get basic Ollama installation commands
   */
  private getBasicInstallCommands(): string[] {
    return [
      'Install Ollama: https://ollama.ai/download',
      'Start Ollama: ollama serve',
      'Install embedding models: ollama pull <model-name>'
    ];
  }

  /**
   * Test connection to Ollama with detailed diagnostics
   */
  async diagnoseConnection(): Promise<{
    endpoint: string;
    reachable: boolean;
    responseTime: number;
    version?: string;
    error?: string;
    suggestions: string[];
  }> {
    const startTime = Date.now();
    const suggestions: string[] = [];

    try {
      const isReachable = await this.checkOllamaStatus();
      const responseTime = Date.now() - startTime;

      if (!isReachable) {
        suggestions.push('Ensure Ollama is installed and running');
        suggestions.push('Try: ollama serve');
        suggestions.push('Check firewall settings');
        
        return {
          endpoint: this.endpoint,
          reachable: false,
          responseTime,
          error: 'Ollama service not responding',
          suggestions
        };
      }

      // Try to get version info
      let version: string | undefined;
      try {
        const versionResponse = await fetch(`${this.endpoint}/api/version`, {
          signal: AbortController.prototype.constructor ? 
            AbortSignal.timeout(this.timeout) : 
            new AbortController().signal
        });
        if (versionResponse.ok) {
          const versionData = await versionResponse.json() as { version?: string };
          version = versionData.version;
        }
      } catch {
        // Version endpoint might not be available in all Ollama versions
      }

      suggestions.push('Connection successful');
      suggestions.push('Install embedding models with: ollama pull <model-name>');

      const result: any = {
        endpoint: this.endpoint,
        reachable: true,
        responseTime,
        suggestions
      };
      
      if (version) {
        result.version = version;
      }
      
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      suggestions.push('Check if Ollama is installed and running');
      suggestions.push('Verify the endpoint URL is correct');
      suggestions.push('Check network connectivity');

      return {
        endpoint: this.endpoint,
        reachable: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        suggestions
      };
    }
  }

  /**
   * Get basic model recommendations (no curated catalog dependencies)
   */
  getModelRecommendations(languages: string[]): {
    recommended: string[];
    reasons: string[];
  } {
    const recommended: string[] = [];
    const reasons: string[] = [];

    // Check for multilingual needs
    const hasNonEnglish = languages.some(lang => lang !== 'en');
    const hasCJK = languages.some(lang => ['zh', 'ja', 'ko'].includes(lang));

    if (hasCJK) {
      recommended.push('granite-embedding:278m');
      reasons.push('Granite Embedding good for CJK languages');
    }

    if (languages.includes('en') || !hasNonEnglish) {
      recommended.push('snowflake-arctic-embed2:305m');
      reasons.push('Arctic Embed2 strong for English and European languages');
    }

    // Default fallback
    if (recommended.length === 0) {
      recommended.push('nomic-embed-text');
      reasons.push('General purpose embedding model');
    }

    return { recommended, reasons };
  }
}