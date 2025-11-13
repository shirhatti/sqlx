/**
 * @shirhatti/sqlx-cli
 *
 * CLI tool for SQLX
 */

export { generate } from './commands/generate.js';
export { loadConfig, loadConfigFromEnv, mergeConfig } from './config.js';
export type { SqlxConfig } from './config.js';
export type { GenerateOptions } from './commands/generate.js';
