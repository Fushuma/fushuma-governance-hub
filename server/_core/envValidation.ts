import { log } from './logger';

/**
 * Environment variable validation
 * Ensures all required environment variables are set at startup
 */

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'JWT_SECRET',
    'OAUTH_SERVER_URL',
    'VITE_OAUTH_PORTAL_URL',
    'VITE_APP_ID',
    'VITE_APP_TITLE',
    'OWNER_OPEN_ID',
    'OWNER_NAME',
  ],
  optional: [
    'VITE_APP_LOGO',
    'VITE_FUSHUMA_RPC_URL',
    'VITE_FUSHUMA_CHAIN_ID',
    'VITE_FUSHUMA_EXPLORER',
    'VITE_GOVERNOR_CONTRACT_ADDRESS',
    'VITE_TOKEN_CONTRACT_ADDRESS',
    'VITE_TREASURY_CONTRACT_ADDRESS',
    'VITE_WALLETCONNECT_PROJECT_ID',
    'BUILT_IN_FORGE_API_URL',
    'BUILT_IN_FORGE_API_KEY',
    'VITE_ANALYTICS_ENDPOINT',
    'VITE_ANALYTICS_WEBSITE_ID',
    'OPENAI_API_URL',
    'OPENAI_API_KEY',
    'NODE_ENV',
    'PORT',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
  ],
};

export function validateEnvironment(): boolean {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of envConfig.required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check for default/example values that should be changed
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change-this')) {
    warnings.push('JWT_SECRET is using a default value - please change it for production');
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('username:password')) {
    warnings.push('DATABASE_URL is using example credentials - please update with real database');
  }

  if (process.env.OWNER_OPEN_ID && process.env.OWNER_OPEN_ID === 'your-owner-open-id') {
    warnings.push('OWNER_OPEN_ID is not set - admin features will not work');
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for security');
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('mysql://')) {
    warnings.push('DATABASE_URL should start with mysql:// for MySQL/TiDB');
  }

  // Log results
  if (missing.length > 0) {
    log.error('Missing required environment variables', { missing });
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these variables in your .env file\n');
    return false;
  }

  if (warnings.length > 0) {
    log.warn('Environment configuration warnings', { warnings });
    console.warn('\n⚠️  Environment configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  log.info('Environment validation passed', {
    requiredCount: envConfig.required.length,
    warningCount: warnings.length,
  });
  
  console.log('✅ Environment validation passed\n');
  return true;
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not set and no default provided`);
  }
  return value || defaultValue!;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not set and no default provided`);
    }
    return defaultValue;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
  }
  return num;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

