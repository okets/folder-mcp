/**
 * File utilities for Sprint 7 - Token-based file downloads
 *
 * This module provides token generation and validation for secure file downloads.
 * Tokens are HMAC-SHA256 signed and include expiration times.
 */

import * as crypto from 'crypto';

// Secret key for HMAC signing (in production, this should be from environment)
const TOKEN_SECRET = process.env.DOWNLOAD_TOKEN_SECRET || 'folder-mcp-download-secret-key-change-in-production';

// Default token expiry time (5 minutes)
export const DEFAULT_TOKEN_EXPIRY = 300; // seconds

/**
 * Token payload structure
 */
interface TokenPayload {
  folder: string;
  file: string;
  expires: number; // Unix timestamp in seconds
}

/**
 * Generate a signed download token for a file
 *
 * @param folderPath - Base folder path
 * @param filePath - File path relative to folder
 * @param expirySeconds - Token validity in seconds (default 5 minutes)
 * @returns Token and expiration timestamp
 */
export function generateDownloadToken(
  folderPath: string,
  filePath: string,
  expirySeconds: number = DEFAULT_TOKEN_EXPIRY
): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;

  const payload: TokenPayload = {
    folder: folderPath,
    file: filePath,
    expires: expiresAt
  };

  // Create the token: base64url(payload).signature
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString('base64url');

  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(payloadBase64);
  const signature = hmac.digest('base64url');

  // Combine payload and signature
  const token = `${payloadBase64}.${signature}`;

  return {
    token,
    expiresAt
  };
}

/**
 * Validate a download token
 *
 * @param token - The token to validate
 * @returns Validation result with payload if valid
 */
export function validateDownloadToken(token: string): {
  valid: boolean;
  error?: string;
  folder?: string;
  file?: string;
  expires?: number;
} {
  try {
    // Split token into payload and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [payloadBase64, providedSignature] = parts;

    // Verify signature
    const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
    hmac.update(payloadBase64!);
    const expectedSignature = hmac.digest('base64url');

    if (providedSignature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Decode payload
    const payloadStr = Buffer.from(payloadBase64!, 'base64url').toString();
    const payload: TokenPayload = JSON.parse(payloadStr);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.expires < now) {
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      folder: payload.folder,
      file: payload.file,
      expires: payload.expires
    };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}

/**
 * Generate a download URL with token
 *
 * @param baseUrl - Base URL of the server (e.g., http://localhost:3001)
 * @param folderPath - Base folder path
 * @param filePath - File path relative to folder
 * @param expirySeconds - Token validity in seconds
 * @returns Full download URL
 */
export function generateDownloadUrl(
  baseUrl: string,
  folderPath: string,
  filePath: string,
  expirySeconds: number = DEFAULT_TOKEN_EXPIRY
): { url: string; expiresAt: number } {
  const { token, expiresAt } = generateDownloadToken(folderPath, filePath, expirySeconds);

  // Build the URL with token as query parameter
  const url = `${baseUrl}/api/v1/download?token=${encodeURIComponent(token)}`;

  return {
    url,
    expiresAt
  };
}