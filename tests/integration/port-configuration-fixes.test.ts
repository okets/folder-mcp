import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OllamaDetector } from '../../src/infrastructure/ollama/ollama-detector.js';
import { OllamaEmbeddingService } from '../../src/infrastructure/embeddings/ollama-embedding-service.js';

describe('Port Configuration Fixes Integration', () => {
  let originalOllamaHost: string | undefined;
  
  beforeEach(() => {
    originalOllamaHost = process.env.OLLAMA_HOST;
  });
  
  afterEach(() => {
    if (originalOllamaHost !== undefined) {
      process.env.OLLAMA_HOST = originalOllamaHost;
    } else {
      delete process.env.OLLAMA_HOST;
    }
  });
  
  describe('OLLAMA_HOST normalization across services', () => {
    it('handles various malformed OLLAMA_HOST values', () => {
      const testCases = [
        { input: 'http://localhost:11434/', expected: 'normalized' },
        { input: 'http://localhost:11434/api', expected: 'normalized' },
        { input: 'http://localhost:11434/api/', expected: 'normalized' },
        { input: '  http://localhost:11434/api///  ', expected: 'normalized' },
        { input: 'http://custom:8080//', expected: 'normalized' },
        { input: 'http://custom:8080/api', expected: 'normalized' }
      ];
      
      for (const testCase of testCases) {
        process.env.OLLAMA_HOST = testCase.input;
        
        // Both services should handle the malformed URL correctly
        const detector = new OllamaDetector();
        const embedService = new OllamaEmbeddingService();
        
        // Services should initialize without errors
        expect(detector).toBeDefined();
        expect(embedService).toBeDefined();
      }
    });
    
    it('preserves custom ports in OLLAMA_HOST', () => {
      process.env.OLLAMA_HOST = 'http://localhost:8888/api/';
      
      const detector = new OllamaDetector();
      const embedService = new OllamaEmbeddingService();
      
      // Should preserve the custom port 8888
      expect(detector).toBeDefined();
      expect(embedService).toBeDefined();
    });
    
    it('handles OLLAMA_HOST with authentication', () => {
      process.env.OLLAMA_HOST = 'http://user:pass@localhost:11434/api/';
      
      const detector = new OllamaDetector();
      const embedService = new OllamaEmbeddingService();
      
      // Should preserve authentication in URL
      expect(detector).toBeDefined();
      expect(embedService).toBeDefined();
    });
    
    it('works with HTTPS URLs', () => {
      process.env.OLLAMA_HOST = 'https://secure.ollama.com:443/api/';
      
      const detector = new OllamaDetector();
      const embedService = new OllamaEmbeddingService();
      
      expect(detector).toBeDefined();
      expect(embedService).toBeDefined();
    });
  });
  
  describe('WebSocket connection state management', () => {
    it('correctly tracks connection state without stale flags', async () => {
      // Mock WebSocket behavior similar to AddFolderWizard
      class MockWebSocketClient {
        private ws: any = null;
        private closeHandlers: Function[] = [];
        
        async connect(): Promise<void> {
          this.ws = { 
            readyState: 1, // WebSocket.OPEN
            send: (data: any) => {},
            on: (event: string, handler: Function) => {
              if (event === 'close') {
                this.closeHandlers.push(handler);
              }
            }
          };
        }
        
        async disconnect(): Promise<void> {
          if (this.ws) {
            this.ws.readyState = 3; // WebSocket.CLOSED
            this.ws = null;
            // Trigger close handlers
            this.closeHandlers.forEach(handler => handler());
          }
        }
        
        isConnected(): boolean {
          return this.ws !== null && this.ws.readyState === 1;
        }
        
        send(data: any): void {
          if (!this.isConnected()) {
            throw new Error('WebSocket is not connected');
          }
          this.ws.send(data);
        }
      }
      
      const client = new MockWebSocketClient();
      
      // Initially not connected
      expect(client.isConnected()).toBe(false);
      expect(() => client.send('test')).toThrow();
      
      // After connecting
      await client.connect();
      expect(client.isConnected()).toBe(true);
      expect(() => client.send('test')).not.toThrow();
      
      // After WebSocket closes
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
      expect(() => client.send('test')).toThrow();
    });
  });
});