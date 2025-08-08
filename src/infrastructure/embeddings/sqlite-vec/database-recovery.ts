/**
 * Database Corruption Detection and Recovery
 * 
 * Provides automatic corruption detection and recovery mechanisms for SQLite databases.
 * Handles backup, restore, and rebuild operations.
 */

import { existsSync, copyFileSync, unlinkSync, renameSync, statSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import Database from 'better-sqlite3';
import { ILoggingService } from '../../../di/interfaces.js';

export interface RecoveryOptions {
    maxBackups?: number;
    autoBackup?: boolean;
    autoRecover?: boolean;
    backupInterval?: number; // hours
}

export interface RecoveryResult {
    success: boolean;
    action: 'none' | 'restored' | 'rebuilt' | 'failed';
    message: string;
    dataLoss?: boolean;
}

export interface CorruptionCheckResult {
    isCorrupted: boolean;
    severity: 'none' | 'minor' | 'severe' | 'critical';
    errors: string[];
    recoverable: boolean;
}

export class DatabaseRecovery {
    private logger: ILoggingService | undefined;
    private options: Required<RecoveryOptions>;
    private databasePath: string;
    private backupDir: string;

    constructor(
        databasePath: string,
        logger?: ILoggingService,
        options: RecoveryOptions = {}
    ) {
        this.databasePath = databasePath;
        this.logger = logger;
        this.backupDir = join(dirname(databasePath), 'backups');
        
        this.options = {
            maxBackups: options.maxBackups ?? 3,
            autoBackup: options.autoBackup ?? true,
            autoRecover: options.autoRecover ?? true,
            backupInterval: options.backupInterval ?? 24
        };
    }

    /**
     * Check if database is corrupted
     */
    async checkCorruption(): Promise<CorruptionCheckResult> {
        const errors: string[] = [];
        let severity: 'none' | 'minor' | 'severe' | 'critical' = 'none';
        let recoverable = true;

        // Check if database file exists
        if (!existsSync(this.databasePath)) {
            return {
                isCorrupted: false,
                severity: 'none',
                errors: [],
                recoverable: true
            };
        }

        let db: Database.Database | null = null;

        try {
            // Try to open the database
            db = new Database(this.databasePath, { readonly: true });

            // Quick integrity check
            const quickCheck = db.prepare('PRAGMA quick_check').get() as any;
            if (quickCheck?.quick_check !== 'ok') {
                errors.push(`Quick check failed: ${quickCheck?.quick_check || 'unknown error'}`);
                severity = 'minor';
            }

            // Full integrity check (more thorough)
            const integrityCheck = db.prepare('PRAGMA integrity_check').all() as any[];
            if (integrityCheck.length > 0 && integrityCheck[0]?.integrity_check !== 'ok') {
                for (const result of integrityCheck) {
                    if (result.integrity_check !== 'ok') {
                        errors.push(`Integrity: ${result.integrity_check}`);
                    }
                }
                severity = 'severe';
            }

            // Check if we can read basic schema
            try {
                const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
                if (!tables || tables.length === 0) {
                    errors.push('No tables found in database');
                    severity = 'severe';
                }
            } catch (schemaError) {
                errors.push(`Cannot read schema: ${schemaError instanceof Error ? schemaError.message : 'unknown'}`);
                severity = 'critical';
                recoverable = false;
            }

            // Check foreign key violations
            try {
                const fkCheck = db.prepare('PRAGMA foreign_key_check').all() as any[];
                if (fkCheck.length > 0) {
                    errors.push(`Foreign key violations: ${fkCheck.length} found`);
                    if (severity === 'none') severity = 'minor';
                }
            } catch (fkError) {
                // Foreign key check failed, but not critical
                errors.push('Cannot check foreign keys');
            }

        } catch (error) {
            // Database cannot be opened at all
            errors.push(`Cannot open database: ${error instanceof Error ? error.message : 'unknown'}`);
            severity = 'critical';
            recoverable = false;
        } finally {
            if (db) {
                try {
                    db.close();
                } catch {
                    // Ignore close errors
                }
            }
        }

        return {
            isCorrupted: errors.length > 0,
            severity,
            errors,
            recoverable
        };
    }

    /**
     * Create a backup of the database
     */
    async createBackup(suffix?: string): Promise<string> {
        if (!existsSync(this.databasePath)) {
            throw new Error('Database file does not exist');
        }

        // Ensure backup directory exists
        if (!existsSync(this.backupDir)) {
            mkdirSync(this.backupDir, { recursive: true });
        }

        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = suffix 
            ? `backup-${timestamp}-${suffix}.db`
            : `backup-${timestamp}.db`;
        const backupPath = join(this.backupDir, backupName);

        try {
            // Validate that source database exists before trying to open it
            if (!existsSync(this.databasePath)) {
                // If source doesn't exist, no backup is possible
                this.logger?.warn(`Cannot create backup - source database does not exist: ${this.databasePath}`);
                throw new Error(`Source database does not exist: ${this.databasePath}`);
            }
            
            // Use SQLite's backup API for consistent backup
            const sourceDb = new Database(this.databasePath, { readonly: true });
            const backupDb = new Database(backupPath);
            
            // Perform online backup
            await sourceDb.backup(backupPath)
                .then(() => {
                    this.logger?.info(`Database backup created: ${backupName}`);
                })
                .catch((backupError) => {
                    // Only try file copy fallback if source database actually exists
                    if (existsSync(this.databasePath)) {
                        // Ensure backup directory exists for fallback
                        if (!existsSync(this.backupDir)) {
                            mkdirSync(this.backupDir, { recursive: true });
                        }
                        // Fallback to file copy if backup API fails
                        copyFileSync(this.databasePath, backupPath);
                        this.logger?.warn(`Database backup created via file copy: ${backupName}`);
                    } else {
                        // Source database doesn't exist, can't create backup
                        this.logger?.warn(`Cannot create backup - source database does not exist: ${this.databasePath}`);
                        throw new Error(`Source database does not exist: ${this.databasePath}`);
                    }
                });

            sourceDb.close();
            backupDb.close();

            // Clean up old backups if needed
            await this.cleanupOldBackups();

            return backupPath;
        } catch (error) {
            // Last resort: simple file copy
            try {
                // Ensure backup directory exists for last resort copy
                if (!existsSync(this.backupDir)) {
                    mkdirSync(this.backupDir, { recursive: true });
                }
                copyFileSync(this.databasePath, backupPath);
                this.logger?.warn(`Database backup created via direct copy: ${backupName}`);
                return backupPath;
            } catch (copyError) {
                throw new Error(`Failed to create backup: ${copyError instanceof Error ? copyError.message : 'unknown'}`);
            }
        }
    }

    /**
     * Restore database from backup
     */
    async restoreFromBackup(backupPath?: string): Promise<boolean> {
        try {
            // If no backup path provided, use the most recent backup
            if (!backupPath) {
                const mostRecent = await this.getMostRecentBackup();
                if (!mostRecent) {
                    this.logger?.error('No backup found to restore from');
                    return false;
                }
                backupPath = mostRecent;
            }

            // Verify backup exists and is valid
            if (!existsSync(backupPath)) {
                this.logger?.error(`Backup file not found: ${backupPath}`);
                return false;
            }

            // Test if backup is valid
            let testDb: Database.Database | null = null;
            try {
                testDb = new Database(backupPath, { readonly: true });
                const check = testDb.prepare('PRAGMA quick_check').get() as any;
                if (check?.quick_check !== 'ok') {
                    this.logger?.error('Backup file is corrupted');
                    return false;
                }
            } catch (error) {
                this.logger?.error(`Backup validation failed: ${error instanceof Error ? error.message : 'unknown'}`);
                return false;
            } finally {
                if (testDb) testDb.close();
            }

            // Move corrupted database to .corrupted
            if (existsSync(this.databasePath)) {
                const corruptedPath = `${this.databasePath}.corrupted.${Date.now()}`;
                renameSync(this.databasePath, corruptedPath);
                this.logger?.info(`Moved corrupted database to: ${corruptedPath}`);
            }

            // Copy backup to database location
            copyFileSync(backupPath, this.databasePath);
            this.logger?.info(`Database restored from backup: ${backupPath}`);

            return true;
        } catch (error) {
            this.logger?.error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'unknown'}`);
            return false;
        }
    }

    /**
     * Attempt to recover a corrupted database
     */
    async recover(): Promise<RecoveryResult> {
        this.logger?.info('Starting database recovery process');

        // First, check corruption level
        const corruption = await this.checkCorruption();
        
        if (!corruption.isCorrupted) {
            return {
                success: true,
                action: 'none',
                message: 'Database is not corrupted'
            };
        }

        this.logger?.warn(`Database corruption detected: ${corruption.severity} severity`);
        corruption.errors.forEach(err => this.logger?.warn(`  - ${err}`));

        // If not recoverable, try restore from backup
        if (!corruption.recoverable || corruption.severity === 'critical') {
            this.logger?.info('Attempting to restore from backup');
            const restored = await this.restoreFromBackup();
            
            if (restored) {
                return {
                    success: true,
                    action: 'restored',
                    message: 'Database restored from backup',
                    dataLoss: true
                };
            } else {
                // If no backup, we need to rebuild
                return await this.rebuildDatabase();
            }
        }

        // Try to repair minor/severe corruption
        if (corruption.severity === 'minor' || corruption.severity === 'severe') {
            const repaired = await this.attemptRepair();
            if (repaired) {
                return {
                    success: true,
                    action: 'restored',
                    message: 'Database repaired successfully',
                    dataLoss: false
                };
            }
        }

        // If repair failed, try backup restore
        const restored = await this.restoreFromBackup();
        if (restored) {
            return {
                success: true,
                action: 'restored',
                message: 'Database restored from backup after repair failure',
                dataLoss: true
            };
        }

        // Last resort: rebuild
        return await this.rebuildDatabase();
    }

    /**
     * Attempt to repair database using SQLite's recovery mechanisms
     */
    private async attemptRepair(): Promise<boolean> {
        try {
            this.logger?.info('Attempting database repair');

            // Create a backup first
            await this.createBackup('pre-repair');

            let db: Database.Database | null = null;
            try {
                db = new Database(this.databasePath);

                // Try VACUUM to rebuild the database file
                db.exec('VACUUM');
                
                // Rebuild indexes
                db.exec('REINDEX');

                // Analyze for query optimizer
                db.exec('ANALYZE');

                this.logger?.info('Database repair completed successfully');
                return true;
            } catch (error) {
                this.logger?.error(`Repair failed: ${error instanceof Error ? error.message : 'unknown'}`);
                return false;
            } finally {
                if (db) db.close();
            }
        } catch (error) {
            this.logger?.error(`Repair process failed: ${error instanceof Error ? error.message : 'unknown'}`);
            return false;
        }
    }

    /**
     * Rebuild database from scratch (destructive)
     */
    private async rebuildDatabase(): Promise<RecoveryResult> {
        try {
            this.logger?.warn('Rebuilding database from scratch - all data will be lost');

            // Backup corrupted database
            if (existsSync(this.databasePath)) {
                const corruptedPath = `${this.databasePath}.corrupted.${Date.now()}`;
                renameSync(this.databasePath, corruptedPath);
                this.logger?.info(`Saved corrupted database to: ${corruptedPath}`);
            }

            // Remove related files (WAL, SHM)
            const walPath = `${this.databasePath}-wal`;
            const shmPath = `${this.databasePath}-shm`;
            if (existsSync(walPath)) unlinkSync(walPath);
            if (existsSync(shmPath)) unlinkSync(shmPath);

            // Database will be recreated on next initialization
            return {
                success: true,
                action: 'rebuilt',
                message: 'Database rebuilt from scratch',
                dataLoss: true
            };
        } catch (error) {
            return {
                success: false,
                action: 'failed',
                message: `Failed to rebuild database: ${error instanceof Error ? error.message : 'unknown'}`,
                dataLoss: true
            };
        }
    }

    /**
     * Get the most recent backup file
     */
    private async getMostRecentBackup(): Promise<string | null> {
        if (!existsSync(this.backupDir)) {
            return null;
        }

        const backups = readdirSync(this.backupDir)
            .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
            .map(f => ({
                path: join(this.backupDir, f),
                mtime: statSync(join(this.backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.mtime - a.mtime);

        return backups.length > 0 && backups[0] ? backups[0].path : null;
    }

    /**
     * Clean up old backups keeping only the most recent ones
     */
    private async cleanupOldBackups(): Promise<void> {
        if (!existsSync(this.backupDir)) {
            return;
        }

        const backups = readdirSync(this.backupDir)
            .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
            .map(f => ({
                path: join(this.backupDir, f),
                mtime: statSync(join(this.backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.mtime - a.mtime);

        // Keep only the configured number of backups
        if (backups.length > this.options.maxBackups) {
            const toDelete = backups.slice(this.options.maxBackups);
            for (const backup of toDelete) {
                try {
                    unlinkSync(backup.path);
                    this.logger?.info(`Deleted old backup: ${backup.path}`);
                } catch (error) {
                    if (this.logger) {
                        this.logger.warn(`Failed to delete old backup: ${backup.path}`);
                    }
                }
            }
        }
    }
}