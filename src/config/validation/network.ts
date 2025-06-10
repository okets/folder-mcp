import * as net from 'net';
import { ValidationError, ValidationErrorCode, ValidationResult } from './errors.js';

export class NetworkValidator {
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(true);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  async validate(config: any): Promise<ValidationResult> {
    const result = new ValidationResult(true);

    // Validate port number
    if (config.port !== undefined) {
      const port = Number(config.port);
      
      if (isNaN(port)) {
        result.addError(new ValidationError(
          ValidationErrorCode.PORT_INVALID,
          'Port must be a valid number',
          'port',
          config.port,
          'Specify a valid port number between 1024 and 65535'
        ));
        return result;
      }

      if (port < 1024 || port > 65535) {
        result.addError(new ValidationError(
          ValidationErrorCode.PORT_INVALID,
          'Port must be between 1024 and 65535',
          'port',
          port,
          'Choose a port between 1024 and 65535'
        ));
        return result;
      }

      // Check if port is available
      const available = await this.isPortAvailable(port);
      if (!available) {
        result.addError(new ValidationError(
          ValidationErrorCode.PORT_IN_USE,
          `Port ${port} is already in use`,
          'port',
          port,
          'Choose a different port or stop the service using this port'
        ));
      }
    }

    // Validate host
    if (config.host) {
      try {
        // Basic hostname validation
        if (!/^[a-zA-Z0-9.-]+$/.test(config.host)) {
          result.addError(new ValidationError(
            ValidationErrorCode.PORT_INVALID,
            'Invalid hostname format',
            'host',
            config.host,
            'Use a valid hostname or IP address'
          ));
        }
      } catch (error) {
        result.addError(new ValidationError(
          ValidationErrorCode.PORT_INVALID,
          'Invalid host configuration',
          'host',
          config.host,
          'Use a valid hostname or IP address'
        ));
      }
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      const timeout = Number(config.timeout);
      if (isNaN(timeout) || timeout < 0) {
        result.addError(new ValidationError(
          ValidationErrorCode.PORT_INVALID,
          'Timeout must be a positive number',
          'timeout',
          config.timeout,
          'Specify a positive timeout value in milliseconds'
        ));
      }
    }

    return result;
  }

  applyDefaults(config: any): any {
    const result = { ...config };

    if (result.port === undefined) {
      result.port = 3000;
    }

    if (result.host === undefined) {
      result.host = 'localhost';
    }

    if (result.timeout === undefined) {
      result.timeout = 30000; // 30 seconds
    }

    return result;
  }
} 