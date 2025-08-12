/**
 * Centralized error messages for embedding services.
 * These messages are targeted at developers/contributors who are working on the codebase.
 */

export class EmbeddingErrors {
  /**
   * Error when Python is not installed or not found in PATH
   */
  static pythonNotFound(modelDisplayName: string): string {
    const platform = process.platform;
    if (platform === 'win32') {
      return `Python 3.8+ not found. Please install from python.org or Microsoft Store, then restart folder-mcp`;
    }
    return `Python 3.8+ not found. Please install Python and ensure it's in your PATH`;
  }
  
  /**
   * Error when Python is installed but required ML packages are missing
   */
  static pythonDependenciesMissing(modelDisplayName: string): string {
    const platform = process.platform;
    if (platform === 'win32') {
      return `Missing Python packages. Please run: pip install torch sentence-transformers jsonrpclib-pelix`;
    }
    return `Missing Python packages. Please run: pip3 install torch sentence-transformers jsonrpclib-pelix`;
  }
  
  /**
   * Error when Python is installed but specific ML packages are missing
   */
  static specificPythonDependenciesMissing(modelDisplayName: string, missingPackages: string): string {
    const platform = process.platform;
    const pipCmd = platform === 'win32' ? 'pip' : 'pip3';
    
    if (platform === 'win32') {
      return `Missing Python packages: ${missingPackages}. Please run: ${pipCmd} install ${missingPackages.replace(/,/g, '')} (Note: PyTorch download is ~2GB)`;
    }
    return `Missing Python packages: ${missingPackages}. Please run: ${pipCmd} install ${missingPackages.replace(/,/g, '')}`;
  }
  
  /**
   * Error when trying to use Ollama models but the service isn't running
   */
  static ollamaNotRunning(modelDisplayName: string): string {
    return `Ollama service not running on port 11434`;
  }
  
  /**
   * Generic error for when a model fails to initialize
   */
  static modelInitializationFailed(modelDisplayName: string, reason?: string): string {
    if (reason) {
      return `${modelDisplayName}: Failed to initialize - ${reason}`;
    }
    return `${modelDisplayName}: Failed to initialize`;
  }
}