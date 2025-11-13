/**
 * Tests for configuration management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { loadConfig, mergeConfig, loadConfigFromEnv } from './config.js';
import type { SqlxConfig } from './config.js';

describe('loadConfig', () => {
  const testDir = join(process.cwd(), '.test-tmp');
  const testConfigPath = join(testDir, 'test-config.json');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load valid configuration', async () => {
    const validConfig: SqlxConfig = {
      connection: {
        account: 'test-account',
        username: 'test-user',
        password: 'test-pass',
      },
      output: 'types.ts',
      schemas: ['PUBLIC', 'CORE'],
    };

    await writeFile(testConfigPath, JSON.stringify(validConfig));

    const config = await loadConfig(testConfigPath);

    expect(config.connection.account).toBe('test-account');
    expect(config.output).toBe('types.ts');
    expect(config.schemas).toEqual(['PUBLIC', 'CORE']);
  });

  it('should throw error for missing config file', async () => {
    await expect(loadConfig('nonexistent.json')).rejects.toThrow(
      'Config file not found'
    );
  });

  it('should throw error for invalid JSON', async () => {
    await writeFile(testConfigPath, '{ invalid json }');

    await expect(loadConfig(testConfigPath)).rejects.toThrow('Invalid JSON');
  });

  it('should throw error for missing connection', async () => {
    const invalidConfig = {
      output: 'types.ts',
      schemas: ['PUBLIC'],
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "Missing 'connection' in config"
    );
  });

  it('should throw error for missing connection.account', async () => {
    const invalidConfig = {
      connection: {
        username: 'test-user',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "Missing 'connection.account' in config"
    );
  });

  it('should throw error for missing output', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      schemas: ['PUBLIC'],
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "Missing 'output' in config"
    );
  });

  it('should throw error for empty output string', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: '   ',
      schemas: ['PUBLIC'],
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "'output' must be a non-empty string"
    );
  });

  it('should warn for non-.ts output extension', async () => {
    const config = {
      connection: {
        account: 'test-account',
      },
      output: 'types.js',
      schemas: ['PUBLIC'],
    };

    await writeFile(testConfigPath, JSON.stringify(config));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await loadConfig(testConfigPath);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('.ts extension')
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('should throw error for missing schemas', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "Missing or empty 'schemas' in config"
    );
  });

  it('should throw error for empty schemas array', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: [],
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "Missing or empty 'schemas' in config"
    );
  });

  it('should throw error for non-array schemas', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: 'PUBLIC',
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "'schemas' must be an array"
    );
  });

  it('should throw error for empty schema name', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: ['PUBLIC', ''],
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      'Each schema name must be a non-empty string'
    );
  });

  it('should throw error for non-array excludeTables', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
      excludeTables: 'table1',
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "'excludeTables' must be an array if provided"
    );
  });

  it('should throw error for non-array includeTables', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
      includeTables: 'table1',
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "'includeTables' must be an array if provided"
    );
  });

  it('should throw error for non-boolean cache.enabled', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
      cache: {
        enabled: 'true',
      },
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "'cache.enabled' must be a boolean"
    );
  });

  it('should throw error for negative cache.ttl', async () => {
    const invalidConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
      cache: {
        enabled: true,
        ttl: -100,
      },
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "'cache.ttl' must be a positive number"
    );
  });

  it('should accept valid optional fields', async () => {
    const validConfig = {
      connection: {
        account: 'test-account',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
      excludeTables: ['table1', 'table2'],
      includeTables: ['*user*'],
      cache: {
        enabled: true,
        ttl: 3600,
      },
    };

    await writeFile(testConfigPath, JSON.stringify(validConfig));

    const config = await loadConfig(testConfigPath);

    expect(config.excludeTables).toEqual(['table1', 'table2']);
    expect(config.includeTables).toEqual(['*user*']);
    expect(config.cache?.enabled).toBe(true);
    expect(config.cache?.ttl).toBe(3600);
  });

  it('should validate config during loadConfig', async () => {
    // This test verifies that validation is performed during loadConfig
    // by ensuring that an invalid config (missing required field) throws an error
    const invalidConfig = {
      // Missing 'connection' field - should be caught by validateConfig
      output: 'types.ts',
      schemas: ['PUBLIC'],
    };

    await writeFile(testConfigPath, JSON.stringify(invalidConfig));

    // If validateConfig is not called, this would not throw
    await expect(loadConfig(testConfigPath)).rejects.toThrow(
      "Missing 'connection' in config"
    );
  });
});

describe('loadConfigFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load configuration from environment variables', () => {
    process.env.SNOWFLAKE_ACCOUNT = 'test-account';
    process.env.SNOWFLAKE_USERNAME = 'test-user';
    process.env.SNOWFLAKE_PASSWORD = 'test-pass';
    process.env.SNOWFLAKE_WAREHOUSE = 'COMPUTE_WH';
    process.env.SNOWFLAKE_DATABASE = 'TEST_DB';
    process.env.SNOWFLAKE_SCHEMA = 'PUBLIC';
    process.env.SNOWFLAKE_ROLE = 'TEST_ROLE';

    const config = loadConfigFromEnv();

    expect(config.account).toBe('test-account');
    expect(config.username).toBe('test-user');
    expect(config.password).toBe('test-pass');
    expect(config.warehouse).toBe('COMPUTE_WH');
    expect(config.database).toBe('TEST_DB');
    expect(config.schema).toBe('PUBLIC');
    expect(config.role).toBe('TEST_ROLE');
  });

  it('should handle missing environment variables', () => {
    const config = loadConfigFromEnv();

    expect(config.account).toBeUndefined();
    expect(config.username).toBeUndefined();
  });
});

describe('mergeConfig', () => {
  it('should merge environment config with file config', () => {
    const fileConfig: SqlxConfig = {
      connection: {
        account: 'file-account',
        username: 'file-user',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
    };

    const envConfig = {
      account: 'env-account',
      password: 'env-pass',
    };

    const merged = mergeConfig(fileConfig, envConfig);

    expect(merged.connection.account).toBe('env-account'); // env overrides file
    expect(merged.connection.username).toBe('file-user'); // file value kept
    expect(merged.connection.password).toBe('env-pass'); // env value added
  });

  it('should filter out undefined values', () => {
    const fileConfig: SqlxConfig = {
      connection: {
        account: 'file-account',
      },
      output: 'types.ts',
      schemas: ['PUBLIC'],
    };

    const envConfig = {
      account: undefined,
      password: 'env-pass',
    };

    const merged = mergeConfig(fileConfig, envConfig);

    expect(merged.connection.account).toBe('file-account'); // undefined filtered out
    expect(merged.connection.password).toBe('env-pass');
  });
});
