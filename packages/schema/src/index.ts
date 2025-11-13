/**
 * @shirhatti/sqlx-schema
 *
 * Schema introspection and type generation for SQLX
 */

export { SchemaIntrospector } from './introspector.js';
export { TypeGenerator } from './type-generator.js';

export type {
  ColumnInfo,
  TableInfo,
  IntrospectionConfig,
  TypeMapping,
  GeneratedInterface,
  GeneratedProperty,
} from './types.js';

export { DEFAULT_TYPE_MAPPINGS } from './types.js';
