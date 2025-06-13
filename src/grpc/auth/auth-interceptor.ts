/**
 * gRPC Authentication Interceptor
 * 
 * Provides API key authentication for remote gRPC transport connections.
 * Bypasses authentication for Unix Domain Socket connections.
 */

import { 
  ServerUnaryCall, 
  ServerReadableStream, 
  ServerWritableStream, 
  ServerDuplexStream,
  sendUnaryData,
  status,
  Metadata,
  ServiceError
} from '@grpc/grpc-js';
import { ApiKeyManager } from './api-key-manager.js';
import { ILoggingService } from '../../di/interfaces.js';
import { createGrpcError } from '../utils/proto-loader.js';

export interface AuthContext {
  isAuthenticated: boolean;
  isLocalConnection: boolean;
  apiKey?: string;
  folder?: string;
  remoteAddress?: string;
}

export interface AuthInterceptorOptions {
  requireAuth?: boolean;
  trustedLocalAddresses?: string[];
  rateLimitWindow?: number;
  maxFailedAttempts?: number;
}

export class AuthInterceptor {
  private readonly failedAttempts = new Map<string, number>();
  private readonly rateLimitWindow: number;
  private readonly maxFailedAttempts: number;
  private readonly trustedLocalAddresses: Set<string>;

  constructor(
    private readonly apiKeyManager: ApiKeyManager,
    private readonly logger: ILoggingService,
    private readonly folder: string,
    private readonly options: AuthInterceptorOptions = {}
  ) {
    this.rateLimitWindow = options.rateLimitWindow || 60000; // 1 minute
    this.maxFailedAttempts = options.maxFailedAttempts || 5;
    this.trustedLocalAddresses = new Set([
      '127.0.0.1',
      '::1',
      'localhost',
      ...(options.trustedLocalAddresses || [])
    ]);

    // Clean up failed attempts periodically
    setInterval(() => this.cleanupFailedAttempts(), this.rateLimitWindow);
  }

  /**
   * Create server interceptor for unary calls
   */
  createUnaryInterceptor() {
    return <RequestType, ResponseType>(
      call: ServerUnaryCall<RequestType, ResponseType>,
      callback: sendUnaryData<ResponseType>,
      next: (call: ServerUnaryCall<RequestType, ResponseType>, callback: sendUnaryData<ResponseType>) => void
    ) => {
      this.authenticateCall(call)
        .then(authContext => {
          if (authContext.isAuthenticated) {
            // Add auth context to call metadata for downstream use
            this.addAuthContextToCall(call, authContext);
            next(call, callback);
          } else {
            this.handleAuthenticationFailure(call, callback);
          }
        })
        .catch(error => {
          this.logger.error('Authentication error', error instanceof Error ? error : new Error(String(error)));
          const grpcError = createGrpcError(status.INTERNAL, 'Authentication system error');
          callback(grpcError);
        });
    };
  }

  /**
   * Create server interceptor for streaming calls
   */
  createStreamingInterceptor() {
    return <RequestType, ResponseType>(
      call: ServerReadableStream<RequestType, ResponseType> | 
            ServerWritableStream<RequestType, ResponseType> | 
            ServerDuplexStream<RequestType, ResponseType>,
      next: (call: any) => void
    ) => {
      this.authenticateCall(call)
        .then(authContext => {
          if (authContext.isAuthenticated) {
            // Add auth context to call metadata for downstream use
            this.addAuthContextToCall(call, authContext);
            next(call);
          } else {
            this.handleStreamingAuthFailure(call);
          }
        })
        .catch(error => {
          this.logger.error('Authentication error', error instanceof Error ? error : new Error(String(error)));
          call.destroy(createGrpcError(status.INTERNAL, 'Authentication system error'));
        });
    };
  }

  /**
   * Authenticate a gRPC call
   */
  private async authenticateCall(call: any): Promise<AuthContext> {
    const remoteAddress = this.getRemoteAddress(call);
    const isLocalConnection = this.isLocalConnection(call, remoteAddress);

    // If authentication is not required, allow all connections
    if (!this.options.requireAuth) {
      return {
        isAuthenticated: true,
        isLocalConnection,
        remoteAddress
      };
    }

    // Always allow local connections (Unix socket or localhost)
    if (isLocalConnection) {
      this.logger.debug('Allowing local connection', { remoteAddress });
      return {
        isAuthenticated: true,
        isLocalConnection: true,
        remoteAddress
      };
    }

    // Check rate limiting for remote connections
    if (this.isRateLimited(remoteAddress)) {
      this.logger.warn('Rate limited authentication attempt', { remoteAddress });
      return {
        isAuthenticated: false,
        isLocalConnection: false,
        remoteAddress
      };
    }

    // Extract and validate API key for remote connections
    const apiKey = this.extractApiKey(call);
    if (!apiKey) {
      this.recordFailedAttempt(remoteAddress);
      this.logger.warn('Missing API key for remote connection', { remoteAddress });
      return {
        isAuthenticated: false,
        isLocalConnection: false,
        remoteAddress
      };
    }

    // Validate API key against the folder
    const isValidKey = await this.apiKeyManager.validateKey(this.folder, apiKey);
    if (!isValidKey) {
      this.recordFailedAttempt(remoteAddress);
      this.logger.warn('Invalid API key for remote connection', { 
        remoteAddress, 
        folder: this.folder,
        keyPreview: apiKey.substring(0, 8) + '...'
      });
      return {
        isAuthenticated: false,
        isLocalConnection: false,
        remoteAddress
      };
    }

    // Authentication successful
    this.logger.info('Authenticated remote connection', { 
      remoteAddress, 
      folder: this.folder 
    });

    return {
      isAuthenticated: true,
      isLocalConnection: false,
      apiKey,
      folder: this.folder,
      remoteAddress
    };
  }

  /**
   * Extract API key from gRPC call metadata
   */
  private extractApiKey(call: any): string | null {
    const metadata = call.metadata as Metadata;
    
    // Check Authorization header (Bearer token)
    const authHeader = metadata.get('authorization');
    if (authHeader && authHeader.length > 0) {
      const authValue = authHeader[0] as string;
      if (authValue.startsWith('Bearer ')) {
        return authValue.substring(7);
      }
    }

    // Check x-api-key header
    const apiKeyHeader = metadata.get('x-api-key');
    if (apiKeyHeader && apiKeyHeader.length > 0) {
      return apiKeyHeader[0] as string;
    }

    return null;
  }

  /**
   * Get remote address from gRPC call
   */
  private getRemoteAddress(call: any): string {
    // Try to get peer address from the call
    const peer = call.getPeer?.();
    if (peer) {
      // Extract IP from peer string (format: "ipv4:127.0.0.1:12345" or "unix:/path/to/socket")
      if (peer.startsWith('unix:')) {
        return 'unix-socket';
      }
      const match = peer.match(/^ipv[46]:([^:]+):/);
      if (match) {
        return match[1];
      }
    }
    
    return 'unknown';
  }

  /**
   * Check if connection is local (Unix socket or localhost)
   */
  private isLocalConnection(call: any, remoteAddress: string): boolean {
    const peer = call.getPeer?.();
    
    // Unix socket connections are always local
    if (peer && peer.startsWith('unix:')) {
      return true;
    }

    // Check if address is in trusted local addresses
    return this.trustedLocalAddresses.has(remoteAddress);
  }

  /**
   * Check if remote address is rate limited
   */
  private isRateLimited(remoteAddress: string): boolean {
    const attempts = this.failedAttempts.get(remoteAddress) || 0;
    return attempts >= this.maxFailedAttempts;
  }

  /**
   * Record failed authentication attempt
   */
  private recordFailedAttempt(remoteAddress: string): void {
    const current = this.failedAttempts.get(remoteAddress) || 0;
    this.failedAttempts.set(remoteAddress, current + 1);
  }

  /**
   * Clean up old failed attempts
   */
  private cleanupFailedAttempts(): void {
    // For simplicity, we clear all failed attempts after the rate limit window
    // In production, you might want to track timestamps for more precise cleanup
    this.failedAttempts.clear();
  }

  /**
   * Add authentication context to call metadata
   */
  private addAuthContextToCall(call: any, authContext: AuthContext): void {
    // Store auth context for potential use by service implementations
    (call as any).authContext = authContext;
  }

  /**
   * Handle authentication failure for unary calls
   */
  private handleAuthenticationFailure<ResponseType>(
    call: any,
    callback: sendUnaryData<ResponseType>
  ): void {
    const authContext = this.getAuthFailureContext(call);
    
    if (authContext.isRateLimited) {
      callback(createGrpcError(status.RESOURCE_EXHAUSTED, 'Too many failed authentication attempts'));
    } else {
      callback(createGrpcError(status.UNAUTHENTICATED, 'Authentication required'));
    }
  }

  /**
   * Handle authentication failure for streaming calls
   */
  private handleStreamingAuthFailure(call: any): void {
    const authContext = this.getAuthFailureContext(call);
    
    if (authContext.isRateLimited) {
      call.destroy(createGrpcError(status.RESOURCE_EXHAUSTED, 'Too many failed authentication attempts'));
    } else {
      call.destroy(createGrpcError(status.UNAUTHENTICATED, 'Authentication required'));
    }
  }

  /**
   * Get authentication failure context
   */
  private getAuthFailureContext(call: any): { isRateLimited: boolean } {
    const remoteAddress = this.getRemoteAddress(call);
    return {
      isRateLimited: this.isRateLimited(remoteAddress)
    };
  }
}

/**
 * Helper to create authentication interceptor
 */
export function createAuthInterceptor(
  apiKeyManager: ApiKeyManager, 
  logger: ILoggingService,
  folder: string,
  options?: AuthInterceptorOptions
): AuthInterceptor {
  return new AuthInterceptor(apiKeyManager, logger, folder, options);
}
