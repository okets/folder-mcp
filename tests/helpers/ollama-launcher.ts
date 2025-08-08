/**
 * Ollama Test Helper
 * 
 * Automatically starts Ollama service for tests if installed but not running.
 * This ensures Ollama tests can run without manual intervention.
 */

import { spawn, ChildProcess, execSync } from 'child_process';

export class OllamaTestHelper {
  private static ollamaProcess: ChildProcess | null = null;
  private static isOurProcess = false;

  /**
   * Check if Ollama is installed on the system
   */
  static isInstalled(): boolean {
    try {
      // Try common installation paths
      execSync('which ollama', { stdio: 'ignore' });
      return true;
    } catch {
      // Check if Ollama app exists on macOS
      try {
        execSync('ls /Applications/Ollama.app', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Check if Ollama service is running
   */
  static async isRunning(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start Ollama service if installed but not running
   * Returns true if Ollama is available (either was running or we started it)
   */
  static async ensureRunning(): Promise<boolean> {
    // First check if installed
    if (!this.isInstalled()) {
      console.log('ℹ️  Ollama is not installed - skipping Ollama tests');
      return false;
    }

    // Check if already running
    if (await this.isRunning()) {
      console.log('✅ Ollama is already running');
      return true;
    }

    // Try to start Ollama
    console.log('🚀 Starting Ollama service for tests...');
    try {
      // Try to start using the ollama command
      this.ollamaProcess = spawn('ollama', ['serve'], {
        detached: false,
        stdio: 'ignore'
      });
      
      this.isOurProcess = true;

      // Wait for Ollama to start (max 10 seconds)
      const maxRetries = 20;
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (await this.isRunning()) {
          console.log('✅ Ollama service started successfully');
          return true;
        }
      }

      // If we get here, Ollama didn't start in time
      console.error('⚠️  Ollama failed to start within 10 seconds');
      this.stop();
      return false;

    } catch (error) {
      console.error('⚠️  Failed to start Ollama:', error);
      
      // Try macOS app launch as fallback
      if (process.platform === 'darwin') {
        try {
          execSync('open -a Ollama', { stdio: 'ignore' });
          
          // Wait for app to start
          const maxRetries = 20;
          for (let i = 0; i < maxRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (await this.isRunning()) {
              console.log('✅ Ollama app started successfully');
              return true;
            }
          }
        } catch {
          console.error('⚠️  Failed to start Ollama app');
        }
      }
      
      return false;
    }
  }

  /**
   * Stop Ollama service if we started it
   */
  static stop(): void {
    if (this.ollamaProcess && this.isOurProcess) {
      console.log('🛑 Stopping Ollama service...');
      this.ollamaProcess.kill('SIGTERM');
      this.ollamaProcess = null;
      this.isOurProcess = false;
    }
  }

  /**
   * Ensure a specific model is available
   */
  static async ensureModel(modelName: string): Promise<boolean> {
    if (!await this.isRunning()) {
      return false;
    }

    try {
      // Check if model exists
      const response = await fetch('http://127.0.0.1:11434/api/tags');
      const data = await response.json() as { models?: Array<{ name: string }> };
      
      const hasModel = data.models?.some(m => m.name === modelName || m.name.startsWith(modelName));
      
      if (hasModel) {
        console.log(`✅ Model ${modelName} is available`);
        return true;
      }

      // Try to pull the model
      console.log(`📥 Pulling model ${modelName}...`);
      const pullResponse = await fetch('http://127.0.0.1:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!pullResponse.ok) {
        console.error(`⚠️  Failed to pull model ${modelName}`);
        return false;
      }

      // Stream the response to show progress
      const reader = pullResponse.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Parse streaming JSON responses
          const text = new TextDecoder().decode(value);
          const lines = text.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.status) {
                process.stdout.write(`\r${json.status}: ${json.completed || 0}/${json.total || 0}`);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
        console.log('\n✅ Model pulled successfully');
      }

      return true;
    } catch (error) {
      console.error(`⚠️  Error ensuring model ${modelName}:`, error);
      return false;
    }
  }
}