/**
 * Basic SQL parser for tagged templates
 */

import type { ParsedQuery } from './types.js';

/**
 * Parse a SQL template and extract parameters
 */
export function parseSqlTemplate(
  strings: TemplateStringsArray,
  values: unknown[]
): ParsedQuery {
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
  sql = sql
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')');

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
 */
export function validateSql(sql: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for common SQL injection patterns (basic protection)
  const dangerousPatterns = [
    /;\s*DROP\s+/i,
    /;\s*DELETE\s+FROM\s+/i,
    /;\s*TRUNCATE\s+/i,
    /UNION\s+SELECT/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      errors.push('Potentially dangerous SQL pattern detected');
      break;
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
