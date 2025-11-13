/**
 * Configuration management
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { SnowflakeConfig } from '@shirhatti/sqlx-core';
import type { TypeMapping } from '@shirhatti/sqlx-schema';

/**
 * SQLX configuration
 */
export interface SqlxConfig {
  connection: SnowflakeConfig;
  output: string;
  schemas: string[];
  typeOverrides?: TypeMapping;
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
  excludeTables?: string[];
  includeTables?: string[];
}

/**
 * Validate configuration
 */
export function validateConfig(config: SqlxConfig): void {
  // Validate connection
  if (!config.connection) {
    throw new Error("Missing 'connection' in config");
  }

  if (!config.connection.account) {
    throw new Error("Missing 'connection.account' in config");
  }

  // Validate output
  if (!config.output) {
    throw new Error("Missing 'output' in config");
  }

  if (typeof config.output !== 'string' || config.output.trim() === '') {
    throw new Error("'output' must be a non-empty string");
  }

  if (!config.output.endsWith('.ts')) {
    console.warn(
      `Warning: Output file '${config.output}' does not have a .ts extension. ` +
        'Generated types are typically saved as TypeScript files.'
    );
  }

  // Validate schemas
  if (!config.schemas || config.schemas.length === 0) {
    throw new Error("Missing or empty 'schemas' in config");
  }

  if (!Array.isArray(config.schemas)) {
    throw new Error("'schemas' must be an array");
  }

  for (const schema of config.schemas) {
    if (typeof schema !== 'string' || schema.trim() === '') {
      throw new Error('Each schema name must be a non-empty string');
    }
  }

  // Validate optional fields
  if (config.excludeTables && !Array.isArray(config.excludeTables)) {
    throw new Error("'excludeTables' must be an array if provided");
  }

  if (config.includeTables && !Array.isArray(config.includeTables)) {
    throw new Error("'includeTables' must be an array if provided");
  }

  if (config.cache) {
    if (typeof config.cache.enabled !== 'boolean') {
      throw new Error("'cache.enabled' must be a boolean");
    }

    if (config.cache.ttl !== undefined) {
      if (typeof config.cache.ttl !== 'number' || config.cache.ttl <= 0) {
        throw new Error("'cache.ttl' must be a positive number if provided");
      }
    }
  }
}

/**
 * Load configuration from file
 */
export async function loadConfig(
  configPath: string = 'sqlx.config.json'
): Promise<SqlxConfig> {
  try {
    const fullPath = resolve(process.cwd(), configPath);
    const content = await readFile(fullPath, 'utf-8');
    const config = JSON.parse(content) as SqlxConfig;

    // Validate configuration
    validateConfig(config);

    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Config file not found: ${configPath}\n` +
          'Create a sqlx.config.json file in your project root.'
      );
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in config file: ${configPath}\n${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<SnowflakeConfig> {
  return {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    role: process.env.SNOWFLAKE_ROLE,
  };
}

/**
 * Merge config with environment variables
 */
export function mergeConfig(
  config: SqlxConfig,
  envConfig: Partial<SnowflakeConfig>
): SqlxConfig {
  return {
    ...config,
    connection: {
      ...config.connection,
      ...Object.fromEntries(
        Object.entries(envConfig).filter(([, v]) => v !== undefined)
      ),
    },
  };
}
