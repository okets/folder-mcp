/**
 * Tests for DaemonConnector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DaemonConnector } from '../../../src/interfaces/tui-ink/daemon-connector.js';
import { DaemonRegistry } from '../../../src/daemon/registry/daemon-registry.js';

// Mock DaemonRegistry
vi.mock('../../../src/daemon/registry/daemon-registry.js', () => ({
  DaemonRegistry: {
    discover: vi.fn()
  }
}));

// Mock WebSocket
vi.mock('ws', () => ({
  default: vi.fn()
}));

describe('DaemonConnector', () => {
  let connector: DaemonConnector;
  let mockWebSocket: any;
  let mockWsInstance: any;
  const mockDaemonRegistry = vi.mocked(DaemonRegistry);

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Set up WebSocket mock instance
    mockWsInstance = {
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      terminate: vi.fn(),
      readyState: 1
    };
    
    // Get the mocked WebSocket constructor
    mockWebSocket = (await import('ws')).default;
    mockWebSocket.mockImplementation(() => mockWsInstance);
    
    connector = new DaemonConnector({
      timeoutMs: 1000,
      maxRetries: 2,
      retryDelayMs: 100,
      debug: false
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('discoverDaemon', () => {
    it('should discover daemon via registry (primary method)', async () => {
      // Mock successful registry discovery
      mockDaemonRegistry.discover.mockResolvedValue({
        pid: 12345,
        httpPort: 8765,
        wsPort: 8766,
        startTime: '2025-01-01T00:00:00Z'
      });

      // Mock successful WebSocket connection
      mockWebSocket.mockImplementation((url: string) => {
        expect(url).toBe('ws://127.0.0.1:8766');
        
        // Simulate immediate connection
        setTimeout(() => {
          const openHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'open')?.[1];
          openHandler?.();
          
          // Simulate handshake response
          const messageHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'message')?.[1];
          messageHandler?.(Buffer.from(JSON.stringify({ type: 'connection.ack' })));
        }, 10);
        
        return mockWsInstance;
      });

      const result = await connector.connect();
      
      expect(result.connectionInfo.discoveryMethod).toBe('registry');
      expect(result.connectionInfo.httpPort).toBe(8765);
      expect(result.connectionInfo.wsPort).toBe(8766);
      expect(result.connectionInfo.pid).toBe(12345);
      expect(result.ws).toBe(mockWsInstance);
    });

    it('should fall back to environment variable when registry fails', async () => {
      // Mock registry failure
      mockDaemonRegistry.discover.mockRejectedValue(new Error('Registry not found'));
      
      // Set environment variable
      process.env.FOLDER_MCP_DAEMON_PORT = '9001';
      
      // Mock successful ping and connection
      mockWebSocket.mockImplementation((url: string) => {
        if (url === 'ws://127.0.0.1:9002') {
          setTimeout(() => {
            const openHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'open')?.[1];
            openHandler?.();
            
            const messageHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'message')?.[1];
            messageHandler?.(Buffer.from(JSON.stringify({ type: 'fmdm.update' })));
          }, 10);
        }
        
        return mockWsInstance;
      });

      const result = await connector.connect();
      
      expect(result.connectionInfo.discoveryMethod).toBe('environment');
      expect(result.connectionInfo.httpPort).toBe(9001);
      expect(result.connectionInfo.wsPort).toBe(9002);
      
      // Cleanup
      delete process.env.FOLDER_MCP_DAEMON_PORT;
    });

    it('should fall back to default port when other methods fail', async () => {
      // Mock registry failure
      mockDaemonRegistry.discover.mockRejectedValue(new Error('Registry not found'));
      
      // No environment variable
      delete process.env.FOLDER_MCP_DAEMON_PORT;
      
      // Mock successful connection to default port
      mockWebSocket.mockImplementation((url: string) => {
        if (url === 'ws://127.0.0.1:31850') {
          // Create fresh mock instance for each call
          const wsInstance = {
            on: vi.fn(),
            send: vi.fn(),
            close: vi.fn(),
            terminate: vi.fn(),
            readyState: 1
          };
          
          setTimeout(() => {
            const openHandler = wsInstance.on.mock.calls.find(call => call[0] === 'open')?.[1];
            openHandler?.();
            
            const messageHandler = wsInstance.on.mock.calls.find(call => call[0] === 'message')?.[1];
            messageHandler?.(Buffer.from(JSON.stringify({ type: 'connection.ack' })));
          }, 10);
          
          return wsInstance;
        }
        
        return mockWsInstance;
      });

      const result = await connector.connect();
      
      expect(result.connectionInfo.discoveryMethod).toBe('default');
      expect(result.connectionInfo.httpPort).toBe(31849);
      expect(result.connectionInfo.wsPort).toBe(31850);
    });

    it('should perform port scanning as last resort', async () => {
      // Mock all discovery methods failing except port scan
      mockDaemonRegistry.discover.mockRejectedValue(new Error('Registry not found'));
      delete process.env.FOLDER_MCP_DAEMON_PORT;
      
      let connectionAttempts = 0;
      
      mockWebSocket.mockImplementation((url: string) => {
        connectionAttempts++;
        
        // Fail default port, succeed on first scanned port (8766)
        if (url === 'ws://127.0.0.1:8766') {
          setTimeout(() => {
            const openHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'open')?.[1];
            openHandler?.();
            
            const messageHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'message')?.[1];
            messageHandler?.(Buffer.from(JSON.stringify({ type: 'fmdm.update' })));
          }, 10);
        } else {
          // Simulate connection failure for other ports
          setTimeout(() => {
            const errorHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
            errorHandler?.(new Error('Connection refused'));
          }, 10);
        }
        
        return mockWsInstance;
      });

      const result = await connector.connect();
      
      expect(result.connectionInfo.discoveryMethod).toBe('scan');
      expect(result.connectionInfo.httpPort).toBe(8765);
      expect(result.connectionInfo.wsPort).toBe(8766);
      expect(connectionAttempts).toBeGreaterThan(1); // Multiple ports tried
    });

    it('should fail when no daemon is found', async () => {
      // Mock all discovery methods failing
      mockDaemonRegistry.discover.mockRejectedValue(new Error('Registry not found'));
      delete process.env.FOLDER_MCP_DAEMON_PORT;
      
      // Mock all connections failing
      mockWebSocket.mockImplementation(() => {
        setTimeout(() => {
          const errorHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
          errorHandler?.(new Error('Connection refused'));
        }, 10);
        
        return mockWsInstance;
      });

      await expect(connector.connect()).rejects.toThrow(
        /Failed to connect to daemon after \d+ attempts/
      );
    });

    it('should retry on connection failures', async () => {
      mockDaemonRegistry.discover.mockResolvedValue({
        pid: 12345,
        httpPort: 8765,
        wsPort: 8766,
        startTime: '2025-01-01T00:00:00Z'
      });

      let attempts = 0;
      mockWebSocket.mockImplementation(() => {
        attempts++;
        
        if (attempts < 2) {
          // First attempt fails
          setTimeout(() => {
            const errorHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
            errorHandler?.(new Error('Connection refused'));
          }, 10);
        } else {
          // Second attempt succeeds
          setTimeout(() => {
            const openHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'open')?.[1];
            openHandler?.();
            
            const messageHandler = mockWsInstance.on.mock.calls.find((call: any) => call[0] === 'message')?.[1];
            messageHandler?.(Buffer.from(JSON.stringify({ type: 'connection.ack' })));
          }, 10);
        }
        
        return mockWsInstance;
      });

      const result = await connector.connect();
      
      expect(attempts).toBe(2);
      expect(result.ws).toBe(mockWsInstance);
    });
  });

  describe('utility methods', () => {
    it('should check daemon availability', async () => {
      mockDaemonRegistry.discover.mockResolvedValue({
        pid: 12345,
        httpPort: 8765,
        wsPort: 8766,
        startTime: '2025-01-01T00:00:00Z'
      });

      const isAvailable = await connector.isDaemonAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return false when daemon not available', async () => {
      mockDaemonRegistry.discover.mockRejectedValue(new Error('Not found'));

      const isAvailable = await connector.isDaemonAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should get connection info without connecting', async () => {
      mockDaemonRegistry.discover.mockResolvedValue({
        pid: 12345,
        httpPort: 8765,
        wsPort: 8766,
        startTime: '2025-01-01T00:00:00Z'
      });

      const info = await connector.getConnectionInfo();
      
      expect(info).toEqual({
        daemonUrl: 'ws://127.0.0.1:8766',
        httpPort: 8765,
        wsPort: 8766,
        pid: 12345,
        discoveryMethod: 'registry'
      });
    });
  });
});