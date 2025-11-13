/**
 * Core type definitions for SQLX
 */

/**
 * Column type with separate types for select, insert, and update operations
 */
export type ColumnType<
  SelectType,
  InsertType = SelectType,
  UpdateType = SelectType
> = {
  __select__: SelectType;
  __insert__: InsertType;
  __update__: UpdateType;
};

/**
 * Extract the select type from a table definition
 */
export type Selectable<T> = {
  [K in keyof T]: T[K] extends ColumnType<infer S, any, any> ? S : T[K];
};

/**
 * Extract the insert type from a table definition
 */
export type Insertable<T> = {
  [K in keyof T]: T[K] extends ColumnType<any, infer I, any> ? I : T[K];
};

/**
 * Extract the update type from a table definition
 */
export type Updateable<T> = {
  [K in keyof T]: T[K] extends ColumnType<any, any, infer U> ? U : T[K];
};

/**
 * JSON types for VARIANT columns
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * Snowflake connection configuration
 */
export interface SnowflakeConfig {
  account: string;
  username?: string;
  password?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
  authenticator?: string;
  privateKeyPath?: string;
  privateKeyPass?: string;
}

/**
 * Query execution result
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  statement: string;
}

/**
 * Internal query representation
 */
export interface ParsedQuery {
  sql: string;
  params: any[];
  metadata?: {
    table?: string;
    columns?: string[];
    types?: Record<string, string>;
  };
}

/**
 * Query builder interface
 */
export interface Query<T> {
  execute(): Promise<T[]>;
  toSQL(): ParsedQuery;
}
