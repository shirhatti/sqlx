/**
 * Tests for TypeGenerator
 */

import { describe, it, expect } from 'vitest';
import { TypeGenerator } from './type-generator.js';
import type { ColumnInfo, TableInfo } from './types.js';

describe('TypeGenerator', () => {
  const generator = new TypeGenerator();

  describe('mapType', () => {
    it('should map numeric types to number', () => {
      expect(generator.mapType('NUMBER')).toBe('number');
      expect(generator.mapType('INTEGER')).toBe('number');
      expect(generator.mapType('BIGINT')).toBe('number');
      expect(generator.mapType('FLOAT')).toBe('number');
      expect(generator.mapType('DECIMAL')).toBe('number');
    });

    it('should map string types to string', () => {
      expect(generator.mapType('VARCHAR')).toBe('string');
      expect(generator.mapType('CHAR')).toBe('string');
      expect(generator.mapType('TEXT')).toBe('string');
      expect(generator.mapType('STRING')).toBe('string');
    });

    it('should map boolean to boolean', () => {
      expect(generator.mapType('BOOLEAN')).toBe('boolean');
    });

    it('should map date/time types to Date', () => {
      expect(generator.mapType('DATE')).toBe('Date');
      expect(generator.mapType('TIMESTAMP')).toBe('Date');
      expect(generator.mapType('TIMESTAMP_NTZ')).toBe('Date');
    });

    it('should map semi-structured types to JSON types', () => {
      expect(generator.mapType('VARIANT')).toBe('JsonValue');
      expect(generator.mapType('OBJECT')).toBe('JsonObject');
      expect(generator.mapType('ARRAY')).toBe('JsonArray');
    });

    it('should handle parameterized types', () => {
      expect(generator.mapType('VARCHAR(255)')).toBe('string');
      expect(generator.mapType('NUMBER(38,0)')).toBe('number');
    });

    it('should return unknown for unmapped types', () => {
      expect(generator.mapType('SOME_UNKNOWN_TYPE')).toBe('unknown');
    });
  });

  describe('generateInterface', () => {
    it('should generate interface with correct properties', () => {
      const table: TableInfo = {
        table_catalog: 'ANALYTICS',
        table_schema: 'CORE',
        table_name: 'USERS',
        table_type: 'BASE TABLE',
        comment: 'User information',
      };

      const columns: ColumnInfo[] = [
        {
          table_catalog: 'ANALYTICS',
          table_schema: 'CORE',
          table_name: 'USERS',
          column_name: 'USER_ID',
          ordinal_position: 1,
          column_default: null,
          is_nullable: 'NO',
          data_type: 'NUMBER',
          character_maximum_length: null,
          numeric_precision: 38,
          numeric_scale: 0,
          comment: 'Primary key',
        },
        {
          table_catalog: 'ANALYTICS',
          table_schema: 'CORE',
          table_name: 'USERS',
          column_name: 'EMAIL',
          ordinal_position: 2,
          column_default: null,
          is_nullable: 'NO',
          data_type: 'VARCHAR',
          character_maximum_length: 255,
          numeric_precision: null,
          numeric_scale: null,
          comment: null,
        },
        {
          table_catalog: 'ANALYTICS',
          table_schema: 'CORE',
          table_name: 'USERS',
          column_name: 'REVENUE',
          ordinal_position: 3,
          column_default: null,
          is_nullable: 'YES',
          data_type: 'NUMBER',
          character_maximum_length: null,
          numeric_precision: 38,
          numeric_scale: 2,
          comment: null,
        },
      ];

      const result = generator.generateInterface(table, columns);

      expect(result.name).toBe('Users');
      expect(result.tableName).toBe('USERS');
      expect(result.schema).toBe('CORE');
      expect(result.comment).toBe('User information');
      expect(result.properties).toHaveLength(3);

      expect(result.properties[0].name).toBe('userId');
      expect(result.properties[0].type).toBe('number');
      expect(result.properties[0].nullable).toBe(false);

      expect(result.properties[1].name).toBe('email');
      expect(result.properties[1].type).toBe('string');
      expect(result.properties[1].nullable).toBe(false);

      expect(result.properties[2].name).toBe('revenue');
      expect(result.properties[2].type).toBe('number');
      expect(result.properties[2].nullable).toBe(true);
    });
  });

  describe('generateInterfaceCode', () => {
    it('should generate valid TypeScript interface', () => {
      const iface = {
        name: 'Users',
        tableName: 'USERS',
        schema: 'CORE',
        properties: [
          { name: 'userId', type: 'number', nullable: false },
          { name: 'email', type: 'string', nullable: false },
          { name: 'revenue', type: 'number', nullable: true },
        ],
      };

      const code = generator.generateInterfaceCode(iface);

      expect(code).toContain('export interface Users');
      expect(code).toContain('userId: number;');
      expect(code).toContain('email: string;');
      expect(code).toContain('revenue?: number | null;');
    });

    it('should include comments', () => {
      const iface = {
        name: 'Users',
        tableName: 'USERS',
        schema: 'CORE',
        comment: 'User table',
        properties: [
          {
            name: 'userId',
            type: 'number',
            nullable: false,
            comment: 'Primary key',
          },
        ],
      };

      const code = generator.generateInterfaceCode(iface);

      expect(code).toContain('/**');
      expect(code).toContain('User table');
      expect(code).toContain('/** Primary key */');
    });
  });

  describe('generateFile', () => {
    it('should generate complete TypeScript file', () => {
      const interfaces = [
        {
          name: 'Users',
          tableName: 'USERS',
          schema: 'CORE',
          properties: [
            { name: 'userId', type: 'number', nullable: false },
            { name: 'email', type: 'string', nullable: false },
          ],
        },
        {
          name: 'Orders',
          tableName: 'ORDERS',
          schema: 'CORE',
          properties: [
            { name: 'orderId', type: 'number', nullable: false },
            { name: 'userId', type: 'number', nullable: false },
          ],
        },
      ];

      const code = generator.generateFile(interfaces);

      // Check header
      expect(code).toContain('Generated types from Snowflake schema');
      expect(code).toContain('Do not edit manually');

      // Check JSON types
      expect(code).toContain('export type JsonPrimitive');
      expect(code).toContain('export type JsonArray');
      expect(code).toContain('export type JsonObject');
      expect(code).toContain('export type JsonValue');

      // Check namespace
      expect(code).toContain('export namespace Core');

      // Check interfaces
      expect(code).toContain('export interface Users');
      expect(code).toContain('export interface Orders');

      // Check Database type
      expect(code).toContain('export interface Database');
      expect(code).toContain('core: typeof Core');
    });
  });
});
