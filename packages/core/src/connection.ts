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

      this.connection.connect((err, conn) => {
        if (err) {
          reject(new Error(`Failed to connect to Snowflake: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Execute a query with parameters
   */
  async execute<T>(
    sqlText: string,
    binds: any[] = []
  ): Promise<QueryResult<T>> {
    if (!this.connection) {
      throw new Error('Not connected to Snowflake. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.connection!.execute({
        sqlText,
        binds,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(
              new Error(`Query execution failed: ${err.message}\nSQL: ${sqlText}`)
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
