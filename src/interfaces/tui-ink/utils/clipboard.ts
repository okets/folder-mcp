/**
 * Cross-Platform Clipboard Utility
 *
 * Provides a simple way to copy text to the system clipboard
 * across macOS, Windows, and Linux.
 */

import { spawn } from 'child_process';

export interface ClipboardResult {
    success: boolean;
    error?: string;
}

/**
 * Copy text to the system clipboard
 *
 * Uses platform-specific tools:
 * - macOS: pbcopy
 * - Windows: clip.exe
 * - Linux: xclip or xsel
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
    const platform = process.platform;

    try {
        const command = getClipboardCommand(platform);
        if (!command) {
            return {
                success: false,
                error: `Unsupported platform: ${platform}`,
            };
        }

        await executeClipboard(command.cmd, command.args, text);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

interface ClipboardCommand {
    cmd: string;
    args: string[];
}

function getClipboardCommand(platform: string): ClipboardCommand | null {
    switch (platform) {
        case 'darwin':
            return { cmd: 'pbcopy', args: [] };
        case 'win32':
            return { cmd: 'clip', args: [] };
        case 'linux':
            // Try xclip first, fall back to xsel
            return { cmd: 'xclip', args: ['-selection', 'clipboard'] };
        default:
            return null;
    }
}

function executeClipboard(cmd: string, args: string[], text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {
            stdio: ['pipe', 'ignore', 'pipe'],
        });

        let stderr = '';

        proc.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        proc.on('error', (err) => {
            // If xclip fails on Linux, try xsel
            if (cmd === 'xclip' && process.platform === 'linux') {
                executeClipboard('xsel', ['--clipboard', '--input'], text)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            reject(new Error(`Failed to spawn ${cmd}: ${err.message}`));
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${cmd} exited with code ${code}: ${stderr}`));
            }
        });

        // Write text to stdin and close
        proc.stdin?.write(text);
        proc.stdin?.end();
    });
}
