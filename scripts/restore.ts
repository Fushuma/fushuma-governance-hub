#!/usr/bin/env tsx

/**
 * Database restore script for Fushuma Governance Hub
 * Restores database from a backup file
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const execAsync = promisify(exec);

interface RestoreConfig {
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  backupFile: string;
}

/**
 * Load configuration from environment
 */
function loadConfig(backupFile: string): RestoreConfig {
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
    backupFile,
  };
}

/**
 * Ask for user confirmation
 */
async function confirmRestore(config: RestoreConfig): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will replace all data in the database!');
    console.log(`Database: ${config.dbName}`);
    console.log(`Backup file: ${config.backupFile}\n`);

    rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Decompress backup file if needed
 */
async function decompressBackup(backupFile: string): Promise<string> {
  if (!backupFile.endsWith('.gz')) {
    return backupFile;
  }

  console.log('Decompressing backup file...');

  const decompressedFile = backupFile.replace(/\.gz$/, '');

  try {
    await execAsync(`gunzip -k ${backupFile}`);
    console.log(`Decompressed to: ${decompressedFile}`);
    return decompressedFile;
  } catch (error: any) {
    throw new Error(`Decompression failed: ${error.message}`);
  }
}

/**
 * Create database backup before restore (safety measure)
 */
async function createSafetyBackup(config: RestoreConfig): Promise<void> {
  console.log('Creating safety backup of current database...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyBackupPath = join(process.cwd(), 'backups', `safety_${config.dbName}_${timestamp}.sql`);

  const command = `mysqldump \
    --host=${config.dbHost} \
    --port=${config.dbPort} \
    --user=${config.dbUser} \
    --password=${config.dbPassword} \
    --single-transaction \
    --databases ${config.dbName} \
    --result-file=${safetyBackupPath}`;

  try {
    await execAsync(command);
    console.log(`Safety backup created: ${safetyBackupPath}`);
  } catch (error: any) {
    console.warn(`Warning: Could not create safety backup: ${error.message}`);
  }
}

/**
 * Restore database from backup file
 */
async function restoreDatabase(config: RestoreConfig, sqlFile: string): Promise<void> {
  console.log('Restoring database...');

  const command = `mysql \
    --host=${config.dbHost} \
    --port=${config.dbPort} \
    --user=${config.dbUser} \
    --password=${config.dbPassword} \
    ${config.dbName} < ${sqlFile}`;

  try {
    await execAsync(command);
    console.log('Database restored successfully');
  } catch (error: any) {
    throw new Error(`Restore failed: ${error.message}`);
  }
}

/**
 * Clean up decompressed file
 */
async function cleanup(sqlFile: string, originalFile: string): Promise<void> {
  if (sqlFile !== originalFile && sqlFile.endsWith('.sql')) {
    try {
      await execAsync(`rm ${sqlFile}`);
      console.log('Cleaned up temporary files');
    } catch (error) {
      console.warn('Could not clean up temporary files');
    }
  }
}

/**
 * Main restore execution
 */
async function main(): Promise<void> {
  console.log('=== Fushuma Governance Hub Database Restore ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  // Get backup file from command line argument
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.error('Error: Backup file path is required');
    console.log('\nUsage: tsx scripts/restore.ts <backup-file-path>');
    console.log('Example: tsx scripts/restore.ts backups/fushuma_2025-10-24.sql.gz');
    process.exit(1);
  }

  // Check if backup file exists
  if (!existsSync(backupFile)) {
    console.error(`Error: Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  try {
    // Load configuration
    const config = loadConfig(backupFile);

    // Ask for confirmation
    const confirmed = await confirmRestore(config);
    if (!confirmed) {
      console.log('Restore cancelled by user');
      process.exit(0);
    }

    // Create safety backup
    await createSafetyBackup(config);

    // Decompress if needed
    const sqlFile = await decompressBackup(backupFile);

    // Restore database
    await restoreDatabase(config, sqlFile);

    // Clean up
    await cleanup(sqlFile, backupFile);

    console.log(`\n=== Restore completed successfully ===`);
    console.log(`Finished at: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error: any) {
    console.error(`\n=== Restore failed ===`);
    console.error(error.message);
    process.exit(1);
  }
}

// Run restore
main();

