/**
 * TypeScript type generation from Snowflake schema
 */

import type {
  ColumnInfo,
  TableInfo,
  TypeMapping,
  GeneratedInterface,
  GeneratedProperty,
} from './types.js';

/**
 * Generate TypeScript types from schema information
 */
export class TypeGenerator {
  private typeMapping: TypeMapping;

  constructor(typeMapping: TypeMapping = {} as TypeMapping) {
    // Import DEFAULT_TYPE_MAPPINGS properly
    const defaultMappings: TypeMapping = {
      NUMBER: 'number',
      DECIMAL: 'number',
      NUMERIC: 'number',
      INT: 'number',
      INTEGER: 'number',
      BIGINT: 'number',
      SMALLINT: 'number',
      TINYINT: 'number',
      BYTEINT: 'number',
      FLOAT: 'number',
      FLOAT4: 'number',
      FLOAT8: 'number',
      DOUBLE: 'number',
      'DOUBLE PRECISION': 'number',
      REAL: 'number',
      VARCHAR: 'string',
      CHAR: 'string',
      CHARACTER: 'string',
      STRING: 'string',
      TEXT: 'string',
      BINARY: 'string',
      VARBINARY: 'string',
      BOOLEAN: 'boolean',
      DATE: 'Date',
      DATETIME: 'Date',
      TIME: 'Date',
      TIMESTAMP: 'Date',
      TIMESTAMP_LTZ: 'Date',
      TIMESTAMP_NTZ: 'Date',
      TIMESTAMP_TZ: 'Date',
      VARIANT: 'JsonValue',
      OBJECT: 'JsonObject',
      ARRAY: 'JsonArray',
      GEOGRAPHY: 'string',
      GEOMETRY: 'string',
    };

    this.typeMapping = { ...defaultMappings, ...typeMapping };
  }

  /**
   * Map Snowflake data type to TypeScript type
   */
  mapType(snowflakeType: string): string {
    const upperType = snowflakeType.toUpperCase();

    // Handle parameterized types (e.g., VARCHAR(255), NUMBER(38,0))
    const baseType = upperType.split('(')[0].trim();

    return this.typeMapping[baseType] || 'unknown';
  }

  /**
   * Generate TypeScript interface for a table
   */
  generateInterface(
    table: TableInfo,
    columns: ColumnInfo[]
  ): GeneratedInterface {
    const properties: GeneratedProperty[] = columns.map((col) => ({
      name: this.toCamelCase(col.column_name),
      type: this.mapType(col.data_type),
      nullable: col.is_nullable === 'YES',
      comment: col.comment || undefined,
    }));

    return {
      name: this.toPascalCase(table.table_name),
      tableName: table.table_name,
      schema: table.table_schema,
      properties,
      comment: table.comment || undefined,
    };
  }

  /**
   * Generate TypeScript code for an interface
   */
  generateInterfaceCode(iface: GeneratedInterface): string {
    let code = '';

    // Add comment if exists
    if (iface.comment) {
      code += `/**\n * ${iface.comment}\n */\n`;
    }

    code += `export interface ${iface.name} {\n`;

    for (const prop of iface.properties) {
      // Add property comment if exists
      if (prop.comment) {
        code += `  /** ${prop.comment} */\n`;
      }

      // For nullable columns, use ` | null` but not `?` (optional)
      // In Snowflake, columns always exist but can have NULL values
      // Using both `?` and `| null` would incorrectly allow undefined
      const nullType = prop.nullable ? ' | null' : '';
      code += `  ${prop.name}: ${prop.type}${nullType};\n`;
    }

    code += '}\n';

    return code;
  }

  /**
   * Generate complete TypeScript file
   */
  generateFile(interfaces: GeneratedInterface[]): string {
    let code = `/**
 * Generated types from Snowflake schema
 * Do not edit manually - regenerate using: npx sqlx generate
 */

`;

    // Add JSON type imports
    code += `// JSON types for VARIANT columns
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

`;

    // Group interfaces by schema
    const bySchema = new Map<string, GeneratedInterface[]>();
    for (const iface of interfaces) {
      const schema = iface.schema;
      if (!bySchema.has(schema)) {
        bySchema.set(schema, []);
      }
      bySchema.get(schema)!.push(iface);
    }

    // Generate namespaces for each schema
    for (const [schema, schemaInterfaces] of bySchema) {
      code += `// Schema: ${schema}\n`;
      code += `export namespace ${this.toPascalCase(schema)} {\n`;

      for (const iface of schemaInterfaces) {
        const interfaceCode = this.generateInterfaceCode(iface);
        // Indent the interface code
        code += interfaceCode
          .split('\n')
          .map((line) => (line ? `  ${line}` : ''))
          .join('\n');
        code += '\n';
      }

      code += '}\n\n';
    }

    // Generate database type
    code += `// Database structure\n`;
    code += `export interface Database {\n`;

    for (const schema of bySchema.keys()) {
      const pascalSchema = this.toPascalCase(schema);
      code += `  ${this.toCamelCase(schema)}: typeof ${pascalSchema};\n`;
    }

    code += '}\n';

    return code;
  }

  /**
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/_([a-z])/g, (_: string, letter: string) =>
        letter.toUpperCase()
      );
  }

  /**
   * Convert snake_case to PascalCase
   */
  private toPascalCase(str: string): string {
    const camel = this.toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }
}
