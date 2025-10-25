#!/usr/bin/env tsx

/**
 * Automated backup script for Fushuma Governance Hub
 * Creates timestamped backups of the database and verifies them
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

interface BackupConfig {
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  backupDir: string;
  retention: number; // days
}

/**
 * Load configuration from environment
 */
function loadConfig(): BackupConfig {
  // Load .env file
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        process.env[key.trim()] = value.trim();
      }
    });
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const [, dbUser, dbPassword, dbHost, dbPort, dbName] = match;

  return {
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    dbName,
    backupDir: process.env.BACKUP_DIR || join(process.cwd(), 'backups'),
    retention: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  };
}

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir(backupDir: string): void {
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(dbName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${dbName}_${timestamp}.sql`;
}

/**
 * Create database backup using mysqldump
 */
async function createBackup(config: BackupConfig): Promise<string> {
  const filename = generateBackupFilename(config.dbName);
  const backupPath = join(config.backupDir, filename);

  console.log(`Creating backup: ${filename}`);

  const command = `mysqldump \
    --host=${config.dbHost} \
    --port=${config.dbPort} \
    --user=${config.dbUser} \
    --password=${config.dbPassword} \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --databases ${config.dbName} \
    --result-file=${backupPath}`;

  try {
    await execAsync(command);
    console.log(`Backup created successfully: ${backupPath}`);
    return backupPath;
  } catch (error: any) {
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * Compress backup file using gzip
 */
async function compressBackup(backupPath: string): Promise<string> {
  const compressedPath = `${backupPath}.gz`;
  
  console.log(`Compressing backup...`);

  try {
    await execAsync(`gzip ${backupPath}`);
    console.log(`Backup compressed: ${compressedPath}`);
    return compressedPath;
  } catch (error: any) {
    throw new Error(`Compression failed: ${error.message}`);
  }
}

/**
 * Calculate checksum of backup file
 */
function calculateChecksum(filePath: string): string {
  const content = readFileSync(filePath);
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupPath: string): Promise<boolean> {
  console.log(`Verifying backup integrity...`);

  try {
    // Check file exists and has content
    if (!existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    const stats = statSync(backupPath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    // Calculate checksum
    const checksum = calculateChecksum(backupPath);
    console.log(`Backup checksum: ${checksum}`);

    // Try to decompress and verify structure (for .gz files)
    if (backupPath.endsWith('.gz')) {
      const testCommand = `gunzip -t ${backupPath}`;
      await execAsync(testCommand);
      console.log('Backup compression integrity verified');
    }

    console.log(`Backup verified successfully (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  } catch (error: any) {
    console.error(`Backup verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups(config: BackupConfig): Promise<void> {
  console.log(`Cleaning up backups older than ${config.retention} days...`);

  try {
    const { stdout } = await execAsync(`find ${config.backupDir} -name "*.sql.gz" -type f -mtime +${config.retention}`);
    
    const oldFiles = stdout.trim().split('\n').filter(f => f);
    
    if (oldFiles.length === 0) {
      console.log('No old backups to clean up');
      return;
    }

    for (const file of oldFiles) {
      await execAsync(`rm ${file}`);
      console.log(`Deleted old backup: ${file}`);
    }

    console.log(`Cleaned up ${oldFiles.length} old backup(s)`);
  } catch (error: any) {
    console.error(`Cleanup failed: ${error.message}`);
  }
}

/**
 * Send backup notification (placeholder for email/webhook integration)
 */
function sendNotification(success: boolean, backupPath?: string, error?: Error): void {
  const message = success
    ? `Backup completed successfully: ${backupPath}`
    : `Backup failed: ${error?.message}`;

  console.log(`\n[NOTIFICATION] ${message}`);

  // TODO: Integrate with email service or webhook
  // Example: Send email via SendGrid, AWS SES, or webhook to Slack/Discord
}

/**
 * Main backup execution
 */
async function main(): Promise<void> {
  console.log('=== Fushuma Governance Hub Backup ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Load configuration
    const config = loadConfig();
    console.log(`Database: ${config.dbName}`);
    console.log(`Backup directory: ${config.backupDir}`);
    console.log(`Retention: ${config.retention} days\n`);

    // Ensure backup directory exists
    ensureBackupDir(config.backupDir);

    // Create backup
    const backupPath = await createBackup(config);

    // Compress backup
    const compressedPath = await compressBackup(backupPath);

    // Verify backup
    const isValid = await verifyBackup(compressedPath);

    if (!isValid) {
      throw new Error('Backup verification failed');
    }

    // Clean up old backups
    await cleanupOldBackups(config);

    // Send success notification
    sendNotification(true, compressedPath);

    console.log(`\n=== Backup completed successfully ===`);
    console.log(`Finished at: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error: any) {
    console.error(`\n=== Backup failed ===`);
    console.error(error.message);

    // Send failure notification
    sendNotification(false, undefined, error);

    process.exit(1);
  }
}

// Run backup
main();

