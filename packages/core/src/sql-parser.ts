/**
 * Basic SQL parser for tagged templates
 */

import type { ParsedQuery } from './types.js';

/**
 * Options for SQL template parsing
 */
export interface ParseOptions {
  /**
   * Whether to normalize whitespace in the SQL query.
   * When enabled, collapses multiple spaces into single spaces and
   * removes spaces around commas and parentheses.
   *
   * Note: This is safe for tagged templates since string literal values
   * are extracted before normalization. Only affects SQL structure.
   *
   * Default: true
   */
  normalizeWhitespace?: boolean;
}

/**
 * Parse a SQL template and extract parameters
 */
export function parseSqlTemplate(
  strings: TemplateStringsArray,
  values: unknown[],
  options: ParseOptions = {}
): ParsedQuery {
  const { normalizeWhitespace = true } = options;

  // Combine the template strings with parameter placeholders
  let sql = '';
  const params: unknown[] = [];

  for (let i = 0; i < strings.length; i++) {
    sql += strings[i];

    if (i < values.length) {
      // Replace parameter with Snowflake parameter placeholder
      sql += '?';
      params.push(values[i]);
    }
  }

  // Clean up the SQL (remove extra whitespace, normalize)
  // Note: This only affects the SQL structure, not string literal values
  // which have already been extracted into params
  if (normalizeWhitespace) {
    sql = sql
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')');
  } else {
    sql = sql.trim();
  }

  return {
    sql,
    params,
    metadata: extractMetadata(sql),
  };
}

/**
 * Extract metadata from SQL query
 */
function extractMetadata(sql: string): {
  table?: string;
  columns?: string[];
  types?: Record<string, string>;
} {
  const metadata: {
    table?: string;
    columns?: string[];
    types?: Record<string, string>;
  } = {};

  // Extract table name from FROM clause
  const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_.]+)/i);
  if (fromMatch) {
    metadata.table = fromMatch[1];
  }

  // Extract column names from SELECT clause
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/is);
  if (selectMatch) {
    const columnsPart = selectMatch[1];
    if (columnsPart.trim() !== '*') {
      metadata.columns = columnsPart
        .split(',')
        .map((col) => {
          // Handle aliases (e.g., "col AS alias" or "col alias")
          const aliasMatch = col.match(
            /\s+(?:AS\s+)?["']?([a-zA-Z0-9_]+)["']?\s*$/i
          );
          if (aliasMatch) {
            return aliasMatch[1];
          }
          // Extract column name
          const colMatch = col.match(/([a-zA-Z0-9_]+)\s*$/);
          return colMatch ? colMatch[1] : col.trim();
        })
        .filter((col) => col);
    }
  }

  return metadata;
}

/**
 * Validate SQL syntax (basic checks)
 *
 * NOTE: This validation is minimal and for basic syntax checking only.
 * SQL injection prevention is primarily handled through parameterized queries.
 * The dangerous pattern detection can produce false positives for legitimate queries
 * (e.g., UNION queries) and should be used with caution in production.
 *
 * For production use, consider:
 * - Relying on parameterized queries (which this library uses by default)
 * - Implementing proper access controls at the database level
 * - Using prepared statements for all user input
 */
export function validateSql(
  sql: string,
  options: { skipDangerousPatternCheck?: boolean } = {}
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for common SQL injection patterns (basic protection)
  // This is a heuristic check that can produce false positives.
  // Set skipDangerousPatternCheck: true to disable for legitimate complex queries.
  if (!options.skipDangerousPatternCheck) {
    const dangerousPatterns = [
      {
        pattern: /;\s*DROP\s+/i,
        description: 'DROP statement after semicolon',
      },
      {
        pattern: /;\s*DELETE\s+FROM\s+/i,
        description: 'DELETE statement after semicolon',
      },
      {
        pattern: /;\s*TRUNCATE\s+/i,
        description: 'TRUNCATE statement after semicolon',
      },
      {
        pattern: /;\s*ALTER\s+/i,
        description: 'ALTER statement after semicolon',
      },
    ];

    for (const { pattern, description } of dangerousPatterns) {
      if (pattern.test(sql)) {
        errors.push(
          `Potentially dangerous SQL pattern detected: ${description}. ` +
            'If this is intentional, use { skipDangerousPatternCheck: true }'
        );
      }
    }
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of sql) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      errors.push('Unbalanced parentheses');
      break;
    }
  }
  if (parenCount > 0) {
    errors.push('Unbalanced parentheses');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
