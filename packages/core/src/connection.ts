/**
 * Snowflake connection management
 */

import snowflake from 'snowflake-sdk';
import type { SnowflakeConfig, QueryResult } from './types.js';

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
            const snowflakeErr = err as {
              code?: string;
              sqlState?: string;
              message: string;
            };

            if (snowflakeErr.code === 'ENOTFOUND') {
              errorMessage = `Invalid Snowflake account '${this.config.account}'. Please verify the account identifier is correct.`;
            } else if (
              snowflakeErr.code === '390100' ||
              snowflakeErr.sqlState === '08001'
            ) {
              errorMessage = `Authentication failed for user '${this.config.username}'. Please verify your credentials.`;
            } else if (snowflakeErr.code === 'ETIMEDOUT') {
              errorMessage = `Connection timeout when connecting to Snowflake account '${this.config.account}'. Please check your network connection.`;
            } else if (snowflakeErr.code === '390201') {
              errorMessage = `Invalid warehouse '${this.config.warehouse}'. Please verify the warehouse exists and you have access.`;
            } else if (snowflakeErr.code === '390189') {
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
    return this.connection !== null && this.connection.isUp();
  }
}

// Global connection instance
let globalConnection: SnowflakeConnection | null = null;

/**
 * Set the global connection to use for queries
 */
export function setConnection(connection: SnowflakeConnection): void {
  globalConnection = connection;
}

/**
 * Get the global connection
 */
export function getConnection(): SnowflakeConnection {
  if (!globalConnection) {
    throw new Error(
      'No Snowflake connection configured. Call setConnection() first.'
    );
  }
  return globalConnection;
}

/**
 * Configure a global connection from config
 */
export async function configureConnection(
  config: SnowflakeConfig
): Promise<SnowflakeConnection> {
  const conn = new SnowflakeConnection(config);
  await conn.connect();
  setConnection(conn);
  return conn;
}
