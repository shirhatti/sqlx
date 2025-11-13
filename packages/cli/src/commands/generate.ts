/**
 * Generate command - introspect schema and generate types
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { SnowflakeConnection } from '@shirhatti/sqlx-core';
import { SchemaIntrospector, TypeGenerator } from '@shirhatti/sqlx-schema';
import type { SqlxConfig } from '../config.js';

export interface GenerateOptions {
  config: SqlxConfig;
  verbose?: boolean;
}

export async function generate(options: GenerateOptions): Promise<void> {
  const { config, verbose } = options;

  if (verbose) {
    console.log('Connecting to Snowflake...');
    console.log(`Account: ${config.connection.account}`);
    console.log(`Database: ${config.connection.database}`);
    console.log(`Schemas: ${config.schemas.join(', ')}`);
  }

  // Connect to Snowflake
  const connection = new SnowflakeConnection(config.connection);
  await connection.connect();

  try {
    // Test connection
    const introspector = new SchemaIntrospector(connection);
    const isConnected = await introspector.testConnection();

    if (!isConnected) {
      throw new Error('Failed to connect to Snowflake');
    }

    if (verbose) {
      console.log('✓ Connected successfully');
      console.log('\nIntrospecting schema...');
    }

    // Introspect schema
    const introspectionConfig = {
      database: config.connection.database!,
      schemas: config.schemas,
      excludeTables: config.excludeTables,
      includeTables: config.includeTables,
    };

    const tables = await introspector.getTables(introspectionConfig);

    if (verbose) {
      console.log(`Found ${tables.length} tables`);
    }

    // Get all columns
    const columns = await introspector.getAllColumns(introspectionConfig);

    if (verbose) {
      console.log(`Found ${columns.length} columns`);
      console.log('\nGenerating TypeScript types...');
    }

    // Generate types
    const typeGenerator = new TypeGenerator(config.typeOverrides);
    const interfaces = tables.map((table) => {
      const tableColumns = columns.filter(
        (col) =>
          col.table_schema === table.table_schema &&
          col.table_name === table.table_name
      );
      return typeGenerator.generateInterface(table, tableColumns);
    });

    const generatedCode = typeGenerator.generateFile(interfaces);

    // Write to file
    const outputPath = resolve(process.cwd(), config.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, generatedCode, 'utf-8');

    if (verbose) {
      console.log(`✓ Written to ${config.output}`);
      console.log('\nSummary:');
      console.log(`  Tables: ${tables.length}`);
      console.log(`  Columns: ${columns.length}`);
      console.log(`  Interfaces: ${interfaces.length}`);
    } else {
      console.log(`✓ Generated types: ${config.output}`);
    }
  } finally {
    await connection.close();
  }
}
