/**
 * Query execution and tagged template support
 */

import { getConnection } from './connection.js';
import { parseSqlTemplate, validateSql } from './sql-parser.js';
import type { Query, ParsedQuery } from './types.js';

/**
 * Query class that wraps a parsed SQL query
 */
class SqlQuery<T> implements Query<T> {
  private parsed: ParsedQuery;

  constructor(parsed: ParsedQuery) {
    this.parsed = parsed;
  }

  /**
   * Execute the query and return typed results
   */
  async execute(): Promise<T[]> {
    const conn = getConnection();
    const result = await conn.execute<T>(this.parsed.sql, this.parsed.params);
    return result.rows;
  }

  /**
   * Get the SQL and parameters without executing
   */
  toSQL(): ParsedQuery {
    return this.parsed;
  }

  /**
   * Get just the SQL string
   */
  toString(): string {
    return this.parsed.sql;
  }
}

/**
 * Tagged template function for SQL queries
 *
 * @example
 * ```typescript
 * const users = await sql<User>`
 *   SELECT email, revenue
 *   FROM analytics.core.users
 *   WHERE revenue > ${1000}
 * `
 * ```
 */
export function sql<T = unknown>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): SqlQuery<T> {
  const parsed = parseSqlTemplate(strings, values);

  // Validate SQL
  const validation = validateSql(parsed.sql);
  if (!validation.valid) {
    throw new Error(
      `Invalid SQL query:\n${validation.errors.join('\n')}\nSQL: ${parsed.sql}`
    );
  }

  return new SqlQuery<T>(parsed);
}

/**
 * Helper to execute a raw SQL query
 */
export async function executeQuery<T>(
  sqlText: string,
  binds: unknown[] = []
): Promise<T[]> {
  const conn = getConnection();
  const result = await conn.execute<T>(sqlText, binds);
  return result.rows;
}
