/**
 * Snowflake schema introspection
 */

import { SnowflakeConnection } from '@shirhatti/sqlx-core';
import type { ColumnInfo, TableInfo, IntrospectionConfig } from './types.js';

/**
 * Introspect Snowflake schema
 */
export class SchemaIntrospector {
  constructor(private connection: SnowflakeConnection) {}

  /**
   * Get all tables in specified schemas
   */
  async getTables(config: IntrospectionConfig): Promise<TableInfo[]> {
    // Preserve original casing for schemas
    // Note: Snowflake stores unquoted identifiers in UPPERCASE by default.
    // If users have quoted identifiers (e.g., "mySchema"), they need to pass
    // them with exact casing. For standard unquoted identifiers, we convert
    // to uppercase to match Snowflake's storage format.
    const schemasIn = config.schemas
      .map((s) => {
        // Check if schema contains lowercase letters - if so, preserve it
        // as it's likely a quoted identifier
        if (s !== s.toUpperCase()) {
          return `'${s}'`;
        }
        return `'${s.toUpperCase()}'`;
      })
      .join(', ');

    const query = `
      SELECT
        table_catalog,
        table_schema,
        table_name,
        table_type,
        comment
      FROM ${config.database}.INFORMATION_SCHEMA.TABLES
      WHERE table_schema IN (${schemasIn})
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_schema, table_name
    `;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.connection.execute<TableInfo>(query);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    let tables = result.rows;

    // Filter by include/exclude patterns
    if (config.includeTables && config.includeTables.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      tables = tables.filter((table) =>
        config.includeTables!.some((pattern) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          this.matchPattern(table.table_name, pattern)
        )
      );
    }

    if (config.excludeTables && config.excludeTables.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      tables = tables.filter(
        (table) =>
          !config.excludeTables!.some((pattern) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            this.matchPattern(table.table_name, pattern)
          )
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return tables;
  }

  /**
   * Get all columns for specified tables
   */
  async getColumns(
    database: string,
    schema: string,
    tables: string[]
  ): Promise<ColumnInfo[]> {
    // Preserve casing for tables similar to schemas
    const tablesIn = tables
      .map((t) => {
        if (t !== t.toUpperCase()) {
          return `'${t}'`;
        }
        return `'${t.toUpperCase()}'`;
      })
      .join(', ');

    // Preserve schema casing
    const schemaQuoted = schema !== schema.toUpperCase() ? schema : schema.toUpperCase();

    const query = `
      SELECT
        table_catalog,
        table_schema,
        table_name,
        column_name,
        ordinal_position,
        column_default,
        is_nullable,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        comment
      FROM ${database}.INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = '${schemaQuoted}'
        AND table_name IN (${tablesIn})
      ORDER BY table_name, ordinal_position
    `;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.connection.execute<ColumnInfo>(query);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return result.rows;
  }

  /**
   * Get all columns for all schemas
   */
  async getAllColumns(config: IntrospectionConfig): Promise<ColumnInfo[]> {
    const tables = await this.getTables(config);
    const allColumns: ColumnInfo[] = [];

    // Group tables by schema
    const tablesBySchema = new Map<string, string[]>();
    for (const table of tables) {
      const schema = table.table_schema;
      if (!tablesBySchema.has(schema)) {
        tablesBySchema.set(schema, []);
      }
      tablesBySchema.get(schema)!.push(table.table_name);
    }

    // Fetch columns for each schema
    for (const [schema, schemaTables] of tablesBySchema) {
      const columns = await this.getColumns(
        config.database,
        schema,
        schemaTables
      );
      allColumns.push(...columns);
    }

    return allColumns;
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(value: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(value);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.connection.execute('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
