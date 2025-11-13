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
 * Load configuration from file
 */
export async function loadConfig(
  configPath: string = 'sqlx.config.json'
): Promise<SqlxConfig> {
  try {
    const fullPath = resolve(process.cwd(), configPath);
    const content = await readFile(fullPath, 'utf-8');
    const config = JSON.parse(content) as SqlxConfig;

    // Validate required fields
    if (!config.connection) {
      throw new Error('Missing "connection" in config');
    }
    if (!config.output) {
      throw new Error('Missing "output" in config');
    }
    if (!config.schemas || config.schemas.length === 0) {
      throw new Error('Missing or empty "schemas" in config');
    }

    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Config file not found: ${configPath}\n` +
          'Create a sqlx.config.json file in your project root.'
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
