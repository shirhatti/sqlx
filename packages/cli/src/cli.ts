#!/usr/bin/env node

/**
 * SQLX CLI
 */

import { Command } from 'commander';
import dotenv from 'dotenv';
import { generate } from './commands/generate.js';
import { loadConfig, loadConfigFromEnv, mergeConfig } from './config.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('sqlx')
  .description('Type-safe Snowflake query builder')
  .version('0.1.0');

// Generate command
program
  .command('generate')
  .description('Generate TypeScript types from Snowflake schema')
  .option('-c, --config <path>', 'Path to config file', 'sqlx.config.json')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      console.log('🔍 SQLX Type Generator\n');

      // Load configuration
      const config = await loadConfig(options.config);
      const envConfig = loadConfigFromEnv();
      const finalConfig = mergeConfig(config, envConfig);

      // Run generation
      await generate({
        config: finalConfig,
        verbose: options.verbose,
      });

      console.log('\n✅ Done!');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error:', (error as Error).message);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Init command (create config file)
program
  .command('init')
  .description('Create a sqlx.config.json file')
  .action(async () => {
    const { writeFile } = await import('fs/promises');

    const defaultConfig = {
      connection: {
        account: process.env.SNOWFLAKE_ACCOUNT || 'your_account',
        warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
        database: process.env.SNOWFLAKE_DATABASE || 'ANALYTICS',
        schema: process.env.SNOWFLAKE_SCHEMA || 'CORE',
        role: process.env.SNOWFLAKE_ROLE || 'DEVELOPER',
      },
      output: './src/generated/db-types.ts',
      schemas: ['CORE'],
      typeOverrides: {
        VARIANT: 'JsonValue',
        ARRAY: 'JsonArray',
        OBJECT: 'JsonObject',
      },
      cache: {
        enabled: true,
        ttl: 3600,
      },
    };

    try {
      await writeFile(
        'sqlx.config.json',
        JSON.stringify(defaultConfig, null, 2),
        'utf-8'
      );
      console.log('✅ Created sqlx.config.json');
      console.log('\nNext steps:');
      console.log('1. Edit sqlx.config.json with your Snowflake credentials');
      console.log('2. Or set environment variables (SNOWFLAKE_*)');
      console.log('3. Run: npx sqlx generate');
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
