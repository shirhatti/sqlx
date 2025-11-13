/**
 * Snowflake connection management
 */

import snowflake from 'snowflake-sdk';
import type { SnowflakeConfig, QueryResult, SnowflakeError } from './types.js';

/**
 * Snowflake error codes
 * @see https://docs.snowflake.com/en/user-guide/jdbc-error-codes.html
 */
const SNOWFLAKE_ERROR_CODES = {
  /** Authentication failed - invalid credentials */
  AUTH_FAILED: '390100',
  /** Invalid warehouse specified */
  INVALID_WAREHOUSE: '390201',
  /** Invalid database or schema specified */
  INVALID_DATABASE: '390189',
} as const;

/**
 * SQL state codes
 * @see https://docs.snowflake.com/en/user-guide/odbc-error-codes.html
 */
const SQL_STATE_CODES = {
  /** Connection exception - unable to connect */
  CONNECTION_EXCEPTION: '08001',
} as const;

/**
 * Node.js error codes
 */
const NODE_ERROR_CODES = {
  /** DNS lookup failed - hostname not found */
  NOT_FOUND: 'ENOTFOUND',
  /** Connection timeout */
  TIMEOUT: 'ETIMEDOUT',
} as const;

export class SnowflakeConnection {
  private connection: snowflake.Connection | null = null;
  private config: SnowflakeConfig;

  constructor(config: SnowflakeConfig) {
    this.config = config;
  }

  /**
   * Connect to Snowflake
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connection = snowflake.createConnection({
          account: this.config.account,
          username: this.config.username,
          password: this.config.password,
          warehouse: this.config.warehouse,
          database: this.config.database,
          schema: this.config.schema,
          role: this.config.role,
          authenticator: this.config.authenticator,
          privateKeyPath: this.config.privateKeyPath,
          privateKeyPass: this.config.privateKeyPass,
        });

        this.connection.connect((err) => {
          if (err) {
            // Provide more specific error messages based on error codes
            let errorMessage = `Failed to connect to Snowflake: ${err.message}`;

            // Type assertion for Snowflake error
            const snowflakeErr = err as SnowflakeError;

            if (snowflakeErr.code === NODE_ERROR_CODES.NOT_FOUND) {
              errorMessage = `Invalid Snowflake account '${this.config.account}'. Please verify the account identifier is correct.`;
            } else if (
              snowflakeErr.code === SNOWFLAKE_ERROR_CODES.AUTH_FAILED ||
              snowflakeErr.sqlState === SQL_STATE_CODES.CONNECTION_EXCEPTION
            ) {
              errorMessage = `Authentication failed for user '${this.config.username}'. Please verify your credentials.`;
            } else if (snowflakeErr.code === NODE_ERROR_CODES.TIMEOUT) {
              errorMessage = `Connection timeout when connecting to Snowflake account '${this.config.account}'. Please check your network connection.`;
            } else if (
              snowflakeErr.code === SNOWFLAKE_ERROR_CODES.INVALID_WAREHOUSE
            ) {
              errorMessage = `Invalid warehouse '${this.config.warehouse}'. Please verify the warehouse exists and you have access.`;
            } else if (
              snowflakeErr.code === SNOWFLAKE_ERROR_CODES.INVALID_DATABASE
            ) {
              errorMessage = `Invalid database or schema. Please verify '${this.config.database}${this.config.schema ? `.${this.config.schema}` : ''}' exists and you have access.`;
            }

            reject(new Error(errorMessage));
          } else {
            resolve();
          }
        });
      } catch (err) {
        // Handle synchronous errors during connection creation
        reject(
          new Error(
            `Failed to create Snowflake connection: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    });
  }

  /**
   * Execute a query with parameters
   */
  async execute<T>(
    sqlText: string,
    binds: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.connection) {
      throw new Error('Not connected to Snowflake. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.connection!.execute({
        sqlText,
        binds: binds as snowflake.Binds,
        complete: (err, _stmt, rows) => {
          if (err) {
            reject(
              new Error(
                `Query execution failed: ${err.message}\nSQL: ${sqlText}`
              )
            );
          } else {
            resolve({
              rows: (rows || []) as T[],
              rowCount: rows?.length || 0,
              statement: sqlText,
            });
          }
        },
      });
    });
  }

  /**
   * Execute a raw SQL statement (for DDL, etc.)
   */
  async executeRaw(sqlText: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to Snowflake. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.connection!.execute({
        sqlText,
        complete: (err) => {
          if (err) {
            reject(new Error(`Statement execution failed: ${err.message}`));
          } else {
            resolve();
          }
        },
      });
    });
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (!this.connection) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.connection!.destroy((err) => {
        if (err) {
          reject(new Error(`Failed to close connection: ${err.message}`));
        } else {
          this.connection = null;
          resolve();
        }
      });
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return (
      this.connection !== null &&
      typeof this.connection.isUp === 'function' &&
      this.connection.isUp()
    );
  }
}

/**
 * Global connection instance
 *
 * LIMITATION: This Phase 1 implementation uses a single global connection.
 * This design has the following limitations:
 *
 * 1. **Single Account/Database**: Cannot connect to multiple Snowflake
 *    accounts or databases simultaneously in the same process.
 *
 * 2. **Parallel Tests**: Running tests in parallel that require different
 *    database connections will interfere with each other.
 *
 * 3. **No Connection Pooling**: All queries share the same connection,
 *    which can become a bottleneck under high load.
 *
 * Future phases will address these limitations by:
 * - Adding connection pooling support
 * - Allowing sql() to accept an optional connection parameter
 * - Supporting multiple connection instances via dependency injection
 *
 * For now, you can work around these limitations by:
 * - Using separate processes for different connections
 * - Running tests sequentially (test:ci already does this)
 * - Manually managing connection state between tests
 */
let globalConnection: SnowflakeConnection | null = null;

/**
 * Set the global connection to use for queries
 *
 * WARNING: Setting a new connection will affect all subsequent queries
 * in the entire application. Use with caution in multi-tenant scenarios.
 */
export function setConnection(connection: SnowflakeConnection): void {
  globalConnection = connection;
}

/**
 * Get the global connection
 *
 * @throws Error if no connection has been configured
 */
export function getConnection(): SnowflakeConnection {
  if (!globalConnection) {
    throw new Error(
      'No Snowflake connection configured. Call setConnection() or configureConnection() first.'
    );
  }
  return globalConnection;
}

/**
 * Configure a global connection from config
 *
 * This is the recommended way to set up a connection for most applications.
 * The connection will be used by all sql`` queries.
 *
 * @example
 * ```typescript
 * await configureConnection({
 *   account: 'myaccount',
 *   username: 'myuser',
 *   password: 'mypassword',
 *   warehouse: 'COMPUTE_WH',
 *   database: 'MYDB',
 *   schema: 'PUBLIC',
 * });
 *
 * // Now you can run queries
 * const users = await sql<User>`SELECT * FROM users`;
 * ```
 */
export async function configureConnection(
  config: SnowflakeConfig
): Promise<SnowflakeConnection> {
  const conn = new SnowflakeConnection(config);
  await conn.connect();
  setConnection(conn);
  return conn;
}
