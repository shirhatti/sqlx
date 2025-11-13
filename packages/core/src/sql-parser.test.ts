/**
 * Tests for SQL parser
 */

import { describe, it, expect } from 'vitest';
import { parseSqlTemplate, validateSql } from './sql-parser.js';

describe('parseSqlTemplate', () => {
  it('should parse simple query with no parameters', () => {
    const strings = ['SELECT * FROM users'] as any as TemplateStringsArray;
    const values: any[] = [];

    const result = parseSqlTemplate(strings, values);

    expect(result.sql).toBe('SELECT * FROM users');
    expect(result.params).toEqual([]);
  });

  it('should parse query with parameters', () => {
    const strings = [
      'SELECT * FROM users WHERE revenue > ',
      ' AND region = ',
      '',
    ] as any as TemplateStringsArray;
    const values = [1000, 'US'];

    const result = parseSqlTemplate(strings, values);

    expect(result.sql).toBe('SELECT * FROM users WHERE revenue > ? AND region = ?');
    expect(result.params).toEqual([1000, 'US']);
  });

  it('should extract table name from FROM clause', () => {
    const strings = ['SELECT email FROM analytics.core.users'] as any as TemplateStringsArray;
    const values: any[] = [];

    const result = parseSqlTemplate(strings, values);

    expect(result.metadata?.table).toBe('analytics.core.users');
  });

  it('should extract column names from SELECT', () => {
    const strings = ['SELECT email, revenue FROM users'] as any as TemplateStringsArray;
    const values: any[] = [];

    const result = parseSqlTemplate(strings, values);

    expect(result.metadata?.columns).toEqual(['email', 'revenue']);
  });

  it('should normalize whitespace', () => {
    const strings = [
      'SELECT  email,  revenue  FROM   users   WHERE   revenue >  ',
      '',
    ] as any as TemplateStringsArray;
    const values = [1000];

    const result = parseSqlTemplate(strings, values);

    expect(result.sql).toContain('SELECT email, revenue FROM users WHERE revenue > ?');
  });
});

describe('validateSql', () => {
  it('should validate correct SQL', () => {
    const sql = 'SELECT * FROM users WHERE revenue > 1000';
    const result = validateSql(sql);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect unbalanced parentheses', () => {
    const sql1 = 'SELECT * FROM users WHERE id IN (1, 2, 3';
    const result1 = validateSql(sql1);

    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('Unbalanced parentheses');

    const sql2 = 'SELECT * FROM users WHERE id IN 1, 2, 3)';
    const result2 = validateSql(sql2);

    expect(result2.valid).toBe(false);
    expect(result2.errors).toContain('Unbalanced parentheses');
  });

  it('should detect potentially dangerous patterns', () => {
    const sql = "SELECT * FROM users; DROP TABLE users;";
    const result = validateSql(sql);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
