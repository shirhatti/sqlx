/**
 * Types for schema introspection
 */

/**
 * Column information from Snowflake INFORMATION_SCHEMA
 */
export interface ColumnInfo {
  table_catalog: string;
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  column_default: string | null;
  is_nullable: 'YES' | 'NO';
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  comment: string | null;
}

/**
 * Table information
 */
export interface TableInfo {
  table_catalog: string;
  table_schema: string;
  table_name: string;
  table_type: string;
  comment: string | null;
}

/**
 * Schema introspection configuration
 */
export interface IntrospectionConfig {
  database: string;
  schemas: string[];
  excludeTables?: string[];
  includeTables?: string[];
}

/**
 * Type mapping configuration
 */
export interface TypeMapping {
  [snowflakeType: string]: string;
}

/**
 * Default Snowflake to TypeScript type mappings
 */
export const DEFAULT_TYPE_MAPPINGS: TypeMapping = {
  // Numeric types
  NUMBER: 'number',
  DECIMAL: 'number',
  NUMERIC: 'number',
  INT: 'number',
  INTEGER: 'number',
  BIGINT: 'number',
  SMALLINT: 'number',
  TINYINT: 'number',
  BYTEINT: 'number',
  FLOAT: 'number',
  FLOAT4: 'number',
  FLOAT8: 'number',
  DOUBLE: 'number',
  'DOUBLE PRECISION': 'number',
  REAL: 'number',

  // String types
  VARCHAR: 'string',
  CHAR: 'string',
  CHARACTER: 'string',
  STRING: 'string',
  TEXT: 'string',
  BINARY: 'string',
  VARBINARY: 'string',

  // Boolean
  BOOLEAN: 'boolean',

  // Date/Time types
  DATE: 'Date',
  DATETIME: 'Date',
  TIME: 'Date',
  TIMESTAMP: 'Date',
  TIMESTAMP_LTZ: 'Date',
  TIMESTAMP_NTZ: 'Date',
  TIMESTAMP_TZ: 'Date',

  // Semi-structured types
  VARIANT: 'JsonValue',
  OBJECT: 'JsonObject',
  ARRAY: 'JsonArray',

  // Geography
  GEOGRAPHY: 'string',
  GEOMETRY: 'string',
};

/**
 * Generated TypeScript interface for a table
 */
export interface GeneratedInterface {
  name: string;
  tableName: string;
  schema: string;
  properties: GeneratedProperty[];
  comment?: string;
}

/**
 * Generated TypeScript property
 */
export interface GeneratedProperty {
  name: string;
  type: string;
  nullable: boolean;
  comment?: string;
}
