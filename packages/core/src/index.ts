/**
 * @shirhatti/sqlx-core
 *
 * Core query building logic for SQLX
 */

// Main SQL tagged template function
export { sql, executeQuery } from './query.js';

// Connection management
export {
  SnowflakeConnection,
  setConnection,
  getConnection,
  configureConnection,
} from './connection.js';

// Types
export type {
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
  JsonValue,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  SnowflakeConfig,
  QueryResult,
  ParsedQuery,
  Query,
} from './types.js';

// Utilities
export { parseSqlTemplate, validateSql } from './sql-parser.js';
