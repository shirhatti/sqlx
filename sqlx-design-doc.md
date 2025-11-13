# SQLX: Type-Safe Snowflake Query Builder with TSX

**Version:** 1.0  
**Authors:** Engineering Systems Team  
**Date:** November 2025  
**Status:** Design Phase

---

## Executive Summary

SQLX is a TypeScript-first query builder for Snowflake that combines the ergonomics of SQL with the safety of TypeScript's type system. It uses JSX/TSX syntax for complex queries and tagged templates for simple queries, providing compile-time validation against Snowflake schemas.

**Key Features:**
- Type-safe queries validated against actual Snowflake schema at compile time
- Natural SQL-like syntax using tagged templates
- TSX/JSX support for complex, composable queries
- First-class Snowflake feature support (time travel, VARIANT, FLATTEN)
- Full IDE/LSP support (autocomplete, go-to-definition, refactoring)
- Compiles to optimized Snowflake SQL

**Timeline:** 4-6 weeks for MVP

---

## Table of Contents

1. [Motivation](#motivation)
2. [Design Goals](#design-goals)
3. [Architecture Overview](#architecture-overview)
4. [API Design](#api-design)
5. [Type System](#type-system)
6. [Schema Introspection](#schema-introspection)
7. [Compilation Strategy](#compilation-strategy)
8. [LSP Integration](#lsp-integration)
9. [Snowflake-Specific Features](#snowflake-specific-features)
10. [Implementation Phases](#implementation-phases)
11. [Examples](#examples)
12. [Testing Strategy](#testing-strategy)
13. [Open Questions](#open-questions)

---

## Motivation

### Problems with Existing Solutions

**Raw SQL:**
- No type safety
- Runtime errors for typos
- No refactoring support
- Hard to compose

**Kysely:**
- Excellent types but awkward syntax
- String-based column references
- No true lambda expressions

**Snowpark DataFrame API:**
- Python-first
- Not composable with dbt/TypeScript ecosystem
- Verbose for simple queries

**Python Column Descriptors:**
- Poor type inference through query chains
- Runtime errors instead of compile-time
- LSP support limited

### What Developers Want

1. **SQL-like syntax** - familiar and readable
2. **Type safety** - catch errors before runtime
3. **IDE support** - autocomplete, go-to-definition, refactoring
4. **Composability** - build queries from parts
5. **Snowflake-native** - first-class support for Snowflake features

---

## Design Goals

### Primary Goals

1. **Developer Delight**: Queries should feel natural to write
2. **Type Safety**: All column references validated at compile time
3. **LSP Excellence**: Best-in-class IDE experience
4. **Snowflake-First**: Native support for Snowflake features, no vendor abstraction

### Non-Goals

1. **Not** a database abstraction layer (Snowflake only)
2. **Not** an ORM (no object mapping, just query building)
3. **Not** a migration tool (use dbt/SQL for DDL)
4. **Not** runtime query validation (compile-time only)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Experience                     │
├─────────────────────────────────────────────────────────────┤
│  Tagged Templates          │         TSX/JSX Components      │
│  sql`SELECT ...`           │    <select><from table="..." /> │
└─────────────────┬──────────┴─────────────┬──────────────────┘
                  │                        │
                  ▼                        ▼
         ┌────────────────────────────────────────┐
         │      TypeScript Transformer            │
         │  - Parse SQL/JSX                       │
         │  - Validate against schema             │
         │  - Generate type information           │
         └────────────────┬───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │         Schema Cache                    │
         │  - Introspected from Snowflake         │
         │  - Stored as TypeScript types          │
         │  - Updated on schema changes           │
         └────────────────┬───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │         SQL Generator                   │
         │  - Compile to Snowflake SQL            │
         │  - Optimize queries                    │
         │  - Handle parameters safely            │
         └────────────────┬───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │      Snowflake Driver                   │
         │  - Execute queries                      │
         │  - Return typed results                 │
         └─────────────────────────────────────────┘
```

---

## API Design

### Tagged Template Syntax (Simple Queries)

```typescript
import { sql } from '@yourcompany/sqlx'

// Basic query
const users = await sql<User>`
  SELECT user_id, email, revenue
  FROM analytics.core.users
  WHERE revenue > ${1000}
  ORDER BY revenue DESC
`

// Type: User[] where User = { user_id: number, email: string, revenue: number }
// Compile-time validation:
// - Table 'analytics.core.users' exists
// - Columns user_id, email, revenue exist and have correct types
// - Parameter ${1000} is safely escaped
```

**Benefits:**
- Familiar SQL syntax
- Minimal learning curve
- Works with any SQL IDE plugins
- Clean for read-heavy queries

### TSX Syntax (Complex/Composable Queries)

```tsx
import { Select, From, Where, Join, GroupBy } from '@yourcompany/sqlx'

// Composable query components
const RevenueFilter = ({ threshold }: { threshold: number }) => (
  <Where>
    {(cols) => cols.revenue > threshold}
  </Where>
)

const RegionFilter = ({ regions }: { regions: string[] }) => (
  <Where>
    {(cols) => cols.region.in(regions)}
  </Where>
)

// Main query
const query = (
  <Select<User>>
    <From table="analytics.core.users" />
    <RevenueFilter threshold={1000} />
    <RegionFilter regions={["US", "EU"]} />
    <columns>
      {(cols) => [cols.email, cols.revenue]}
    </columns>
  </Select>
)

const result = await query.execute()
// Type: { email: string, revenue: number }[]
```

**Benefits:**
- Component reusability
- Type-safe composition
- Lambda expressions for conditions
- Hierarchical structure for complex queries

### Hybrid Approach

```tsx
// Start with SQL, add TSX for dynamic parts
const baseQuery = sql<User>`
  SELECT email, revenue, region
  FROM analytics.core.users
`

const filteredQuery = (
  <Query query={baseQuery}>
    <Where>
      {(cols) => cols.revenue > 1000 && cols.region.in(["US", "EU"])}
    </Where>
  </Query>
)
```

---

## Type System

### Schema Definition

Generate TypeScript types from Snowflake schema:

```typescript
// Generated from Snowflake INFORMATION_SCHEMA
// File: generated/analytics/core/users.ts

export interface UsersTable {
  user_id: number
  email: string
  revenue: number
  region: string
  created_at: Date
  metadata: JsonValue  // VARIANT type
}

export interface Database {
  analytics: {
    core: {
      users: UsersTable
      orders: OrdersTable
      // ...
    }
  }
}
```

### Query Type Inference

```typescript
// Type flows through the query chain
const query = sql<UsersTable>`
  SELECT email, revenue FROM analytics.core.users
`
// Type: { email: string, revenue: number }[]

// TypeScript knows only email and revenue are selected
const result = await query
result[0].email     // ✅ OK
result[0].revenue   // ✅ OK
result[0].user_id   // ❌ Error: Property 'user_id' does not exist
```

### Column Type Helper

```typescript
import { ColumnType, Selectable, Insertable } from '@yourcompany/sqlx'

// For columns with different insert/select types
export interface UsersTable {
  user_id: ColumnType<number, never, number>  // select, insert, update
  email: ColumnType<string>
  created_at: ColumnType<Date, string | undefined, never>
}

// Helper types
type UserRow = Selectable<UsersTable>
type NewUser = Insertable<UsersTable>
```

### Lambda Type Safety

```tsx
<Where>
  {(cols: UsersTable) => cols.revenue > 1000}
  {/* TypeScript knows:
      - cols.revenue is number
      - cols.email is string
      - cols.user_id exists
      - cols.nonexistent errors
  */}
</Where>
```

---

## Schema Introspection

### Configuration

```typescript
// sqlx.config.ts
import { defineConfig } from '@yourcompany/sqlx'

export default defineConfig({
  connection: {
    account: process.env.SNOWFLAKE_ACCOUNT,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: 'analytics',
    schema: 'core',
    role: 'developer',
  },
  
  // Where to generate types
  output: './src/generated/db-types.ts',
  
  // Which schemas to introspect
  schemas: ['core', 'staging', 'raw'],
  
  // Type mappings
  typeOverrides: {
    'VARIANT': 'JsonValue',
    'ARRAY': 'JsonArray',
    'OBJECT': 'JsonObject',
  },
  
  // Caching
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
  }
})
```

### Introspection Query

```sql
-- Get all tables and columns
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  comment
FROM information_schema.columns
WHERE table_schema IN ('CORE', 'STAGING', 'RAW')
  AND table_catalog = 'ANALYTICS'
ORDER BY table_schema, table_name, ordinal_position
```

### Type Generation

```bash
# CLI command to regenerate types
$ npx sqlx generate

Connecting to Snowflake...
Introspecting schema ANALYTICS.CORE...
Found 15 tables, 203 columns
Generating TypeScript types...
✓ Written to src/generated/db-types.ts

# Auto-generation on schema change
$ npx sqlx watch
```

### Generated Output Structure

```typescript
// src/generated/db-types.ts
export namespace Analytics {
  export namespace Core {
    export interface Users {
      user_id: number
      email: string
      revenue: number
      region: string
      created_at: Date
    }
    
    export interface Orders {
      order_id: number
      user_id: number
      amount: number
      order_date: Date
    }
  }
}

// Type helper
export type Database = {
  analytics: {
    core: Analytics.Core
  }
}
```

---

## Compilation Strategy

### Tagged Template Compilation

```typescript
// Input (developer writes):
const result = await sql<User>`
  SELECT email, revenue
  FROM analytics.core.users
  WHERE revenue > ${threshold}
`

// TypeScript Transformer converts to:
const result = await executeQuery<Pick<User, 'email' | 'revenue'>>(
  'SELECT email, revenue FROM analytics.core.users WHERE revenue > ?',
  [threshold],
  {
    table: 'analytics.core.users',
    columns: ['email', 'revenue'],
    types: { email: 'string', revenue: 'number' }
  }
)
```

### TSX Compilation

```tsx
// Input (developer writes):
const query = (
  <Select<User>>
    <From table="analytics.core.users" />
    <Where>{(cols) => cols.revenue > 1000}</Where>
  </Select>
)

// TypeScript Transformer converts to:
const query = createQuery<User>({
  from: 'analytics.core.users',
  where: [
    { column: 'revenue', operator: '>', value: 1000 }
  ],
  select: '*'
})
```

### SQL Generation

```typescript
// Internal SQL generator
class SnowflakeQueryBuilder {
  private parts: QueryPart[] = []
  
  from(table: string): this {
    this.parts.push({ type: 'FROM', table })
    return this
  }
  
  where(column: string, op: string, value: any): this {
    this.parts.push({ type: 'WHERE', column, op, value })
    return this
  }
  
  toSQL(): { sql: string, params: any[] } {
    // Generate parameterized SQL
    const sql = this.parts.map(part => {
      switch (part.type) {
        case 'FROM': return `FROM ${part.table}`
        case 'WHERE': return `WHERE ${part.column} ${part.op} ?`
      }
    }).join('\n')
    
    const params = this.parts
      .filter(p => p.type === 'WHERE')
      .map(p => p.value)
    
    return { sql, params }
  }
}
```

---

## LSP Integration

### TypeScript Language Service Plugin

```typescript
// sqlx-lsp-plugin/src/index.ts
import * as ts from 'typescript/lib/tsserverlibrary'

function init(modules: { typescript: typeof ts }) {
  const ts = modules.typescript
  
  function create(info: ts.server.PluginCreateInfo) {
    // Wrap the language service
    const proxy: ts.LanguageService = Object.create(null)
    
    for (let k of Object.keys(info.languageService)) {
      const x = info.languageService[k]
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args)
    }
    
    // Override completions for SQL strings
    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      const prior = info.languageService.getCompletionsAtPosition(
        fileName, position, options
      )
      
      // Check if we're inside a sql`` template
      const sourceFile = info.languageService.getProgram()
        .getSourceFile(fileName)
      
      if (isInsideSqlTemplate(sourceFile, position)) {
        // Add SQL completions (tables, columns, keywords)
        return enhanceWithSqlCompletions(prior, sourceFile, position)
      }
      
      return prior
    }
    
    return proxy
  }
  
  return { create }
}

export = init
```

### Features to Implement

1. **Autocomplete**
   - Table names after `FROM`
   - Column names in `SELECT`, `WHERE`
   - Snowflake functions
   - Keywords (SELECT, WHERE, JOIN, etc.)

2. **Hover Information**
   - Show column types
   - Show table comments
   - Show Snowflake documentation for functions

3. **Go to Definition**
   - Jump from column reference to schema definition
   - Jump from table name to generated type

4. **Diagnostics**
   - Red squiggles for invalid tables
   - Red squiggles for invalid columns
   - Type mismatch warnings

5. **Refactoring**
   - Rename column across all queries
   - Rename table across all queries

---

## Snowflake-Specific Features

### Time Travel

```typescript
// Tagged template
const historicalData = await sql<User>`
  SELECT email, revenue
  FROM analytics.core.users
  AT(TIMESTAMP => '2024-01-01 00:00:00')
  WHERE revenue > 1000
`

// TSX
const query = (
  <Select<User>>
    <From table="analytics.core.users">
      <TimeTravel at="2024-01-01 00:00:00" />
    </From>
    <Where>{(cols) => cols.revenue > 1000}</Where>
  </Select>
)

// Method chaining
const query = sql<User>`SELECT * FROM users`
  .at('2024-01-01 00:00:00')
  .where('revenue > 1000')
```

### VARIANT Type Support

```typescript
// Schema generation recognizes VARIANT
export interface EventsTable {
  event_id: string
  payload: JsonValue  // VARIANT column
  created_at: Date
}

// Query with VARIANT navigation
const events = await sql<{ eventId: string, userId: string }>`
  SELECT 
    event_id as "eventId",
    payload:user_id::VARCHAR as "userId"
  FROM analytics.core.events
  WHERE payload:event_type = 'signup'
`

// TSX with type-safe VARIANT access
<Select<Event>>
  <From table="analytics.core.events" />
  <columns>
    {(cols) => [
      cols.event_id,
      cols.payload.path('user_id').cast('VARCHAR').as('userId')
    ]}
  </columns>
</Select>
```

### FLATTEN Support

```typescript
// Tagged template
const flattened = await sql<{ eventId: string, tag: string }>`
  SELECT 
    e.event_id as "eventId",
    f.value::VARCHAR as tag
  FROM analytics.core.events e,
  LATERAL FLATTEN(input => e.tags) f
`

// TSX component
<Select<{ eventId: string, tag: string }>>
  <From table="analytics.core.events" alias="e" />
  <Flatten path="e.tags" alias="f" outer={false} />
  <columns>
    {(e, f) => [
      e.event_id.as('eventId'),
      f.value.cast('VARCHAR').as('tag')
    ]}
  </columns>
</Select>
```

### Dynamic Tables

```typescript
// Generate dynamic table DDL
const dynamicTable = (
  <DynamicTable
    name="high_value_users"
    targetLag="1 hour"
    warehouse="COMPUTE_WH"
  >
    <Select<User>>
      <From table="analytics.core.users" />
      <Where>{(cols) => cols.revenue > 1000}</Where>
    </Select>
  </DynamicTable>
)

// Generates:
// CREATE OR REPLACE DYNAMIC TABLE high_value_users
// TARGET_LAG = '1 hour'
// WAREHOUSE = COMPUTE_WH
// AS
// SELECT * FROM analytics.core.users WHERE revenue > 1000
```

### Clustering and Optimization

```tsx
<Select<User>>
  <From table="analytics.core.users" />
  <Where>{(cols) => cols.region.in(['US', 'EU'])}</Where>
  <ClusterBy columns={['region', 'created_at']} />
</Select>
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals:**
- Basic tagged template syntax working
- Schema introspection from Snowflake
- Type generation
- Simple SELECT queries

**Deliverables:**
```typescript
// This works:
const users = await sql<User>`
  SELECT email, revenue FROM analytics.core.users
`
```

**Tasks:**
1. Set up TypeScript project structure
2. Implement Snowflake connection wrapper
3. Build schema introspection
4. Create type generator
5. Implement basic SQL parser for tagged templates
6. Add parameter escaping

**Testing:**
- Unit tests for type generator
- Integration tests with Snowflake dev instance
- Validate generated types match schema

### Phase 2: Query Building (Week 3)

**Goals:**
- WHERE, JOIN, GROUP BY, ORDER BY support
- Parameter binding
- Query composition

**Deliverables:**
```typescript
// Complex queries work:
const result = await sql<User>`
  SELECT u.email, COUNT(o.order_id) as order_count
  FROM analytics.core.users u
  JOIN analytics.core.orders o ON u.user_id = o.user_id
  WHERE u.revenue > ${threshold}
  GROUP BY u.email
  ORDER BY order_count DESC
`
```

**Tasks:**
1. Extend SQL parser for JOINs
2. Add aggregation support
3. Implement subquery handling
4. Add query composition helpers
5. Enhance type inference for JOINs

### Phase 3: TSX Support (Week 4)

**Goals:**
- JSX/TSX components for queries
- Lambda expressions in WHERE clauses
- Component composition

**Deliverables:**
```tsx
// TSX queries work:
const query = (
  <Select<User>>
    <From table="analytics.core.users" />
    <Where>{(cols) => cols.revenue > 1000}</Where>
  </Select>
)
```

**Tasks:**
1. Create TSX query components
2. Implement TypeScript transformer for TSX
3. Add lambda-to-SQL compiler
4. Build component composition system
5. Type safety for lambda expressions

### Phase 4: Snowflake Features (Week 5)

**Goals:**
- Time travel
- VARIANT type support
- FLATTEN operations
- Snowflake-specific functions

**Deliverables:**
```typescript
// Snowflake features work:
const historical = await sql<User>`...`.at('2024-01-01')
const flattened = await sql`...`.flatten('payload')
```

**Tasks:**
1. Implement time travel helpers
2. Add VARIANT type mapping
3. Create FLATTEN component
4. Add Snowflake function library
5. Document Snowflake-specific patterns

### Phase 5: LSP & DX (Week 6)

**Goals:**
- IDE autocomplete
- Hover information
- Error diagnostics
- Documentation

**Deliverables:**
- VS Code extension
- Complete API documentation
- Usage examples
- Migration guide

**Tasks:**
1. Build TypeScript language service plugin
2. Create VS Code extension
3. Implement autocomplete providers
4. Add diagnostic messages
5. Write comprehensive docs

### Phase 6: Polish & Production (Week 7+)

**Goals:**
- Performance optimization
- Error handling
- Logging/debugging
- Production readiness

**Tasks:**
1. Query optimization
2. Connection pooling
3. Error messages
4. Logging integration
5. Performance benchmarks
6. Security review

---

## Examples

### Example 1: Simple Query

```typescript
import { sql } from '@yourcompany/sqlx'

// Define expected result shape
interface UserSummary {
  email: string
  revenue: number
}

// Write query
const users = await sql<UserSummary>`
  SELECT email, revenue
  FROM analytics.core.users
  WHERE revenue > ${1000}
  ORDER BY revenue DESC
  LIMIT 10
`

// users is typed as UserSummary[]
users.forEach(user => {
  console.log(`${user.email}: $${user.revenue}`)
})
```

### Example 2: Complex Join with TSX

```tsx
import { Select, From, Join, Where, GroupBy } from '@yourcompany/sqlx'

interface UserOrderStats {
  email: string
  orderCount: number
  totalSpent: number
}

const query = (
  <Select<UserOrderStats>>
    <From table="analytics.core.users" alias="u" />
    <Join 
      table="analytics.core.orders" 
      alias="o"
      on={(u, o) => u.user_id.eq(o.user_id)}
    />
    <Where>
      {(u, o) => u.revenue.gt(1000).and(o.order_date.gte('2024-01-01'))}
    </Where>
    <GroupBy>
      {(u) => [u.email]}
    </GroupBy>
    <columns>
      {(u, o) => [
        u.email,
        o.order_id.count().as('orderCount'),
        o.amount.sum().as('totalSpent')
      ]}
    </columns>
  </Select>
)

const result = await query.execute()
```

### Example 3: Composable Filters

```tsx
import { Where } from '@yourcompany/sqlx'

// Reusable filter components
const HighValueFilter = () => (
  <Where>{(cols) => cols.revenue > 1000}</Where>
)

const RegionFilter = ({ regions }: { regions: string[] }) => (
  <Where>{(cols) => cols.region.in(regions)}</Where>
)

const DateRangeFilter = ({ start, end }: { start: string, end: string }) => (
  <Where>
    {(cols) => cols.created_at.between(start, end)}
  </Where>
)

// Compose into query
const query = (
  <Select<User>>
    <From table="analytics.core.users" />
    <HighValueFilter />
    <RegionFilter regions={['US', 'EU']} />
    <DateRangeFilter start="2024-01-01" end="2024-12-31" />
  </Select>
)
```

### Example 4: Time Travel

```typescript
// Compare today vs. yesterday
const today = await sql<User>`
  SELECT * FROM analytics.core.users
  WHERE region = 'US'
`

const yesterday = await sql<User>`
  SELECT * FROM analytics.core.users
  AT(TIMESTAMP => DATEADD(day, -1, CURRENT_TIMESTAMP()))
  WHERE region = 'US'
`

const newUsers = today.filter(u => 
  !yesterday.some(y => y.user_id === u.user_id)
)
```

### Example 5: VARIANT Data

```typescript
interface Event {
  eventId: string
  eventType: string
  userId: string
  metadata: JsonValue
}

const signupEvents = await sql<Event>`
  SELECT 
    event_id as "eventId",
    payload:event_type::VARCHAR as "eventType",
    payload:user_id::VARCHAR as "userId",
    payload:metadata as metadata
  FROM analytics.core.events
  WHERE payload:event_type = 'signup'
    AND payload:metadata:source = 'mobile_app'
`
```

### Example 6: Integration with dbt

```typescript
// Generate dbt model from SQLX query
import { sql, toDbtModel } from '@yourcompany/sqlx'

const query = sql<User>`
  SELECT 
    user_id,
    email,
    revenue,
    CASE 
      WHEN revenue > 10000 THEN 'whale'
      WHEN revenue > 1000 THEN 'high_value'
      ELSE 'standard'
    END as segment
  FROM {{ ref('users') }}
  WHERE created_at >= DATEADD(day, -30, CURRENT_DATE)
`

// Export as dbt model
const dbtModel = toDbtModel(query, {
  name: 'user_segments',
  materialization: 'view',
  tags: ['users', 'segments']
})

// Write to file: models/core/user_segments.sql
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test type generation
describe('TypeGenerator', () => {
  it('should generate correct types from schema', () => {
    const schema = {
      table_name: 'users',
      columns: [
        { column_name: 'user_id', data_type: 'NUMBER', is_nullable: 'NO' },
        { column_name: 'email', data_type: 'VARCHAR', is_nullable: 'NO' },
      ]
    }
    
    const types = generateTypes(schema)
    expect(types).toContain('user_id: number')
    expect(types).toContain('email: string')
  })
})

// Test SQL generation
describe('SQLGenerator', () => {
  it('should generate correct SQL for simple query', () => {
    const query = createQuery({
      from: 'users',
      where: [{ column: 'revenue', operator: '>', value: 1000 }]
    })
    
    const { sql, params } = query.toSQL()
    expect(sql).toBe('SELECT * FROM users WHERE revenue > ?')
    expect(params).toEqual([1000])
  })
})
```

### Integration Tests

```typescript
// Test against actual Snowflake
describe('SnowflakeIntegration', () => {
  let db: SnowflakeConnection
  
  beforeAll(async () => {
    db = await connectToSnowflake({
      account: process.env.TEST_ACCOUNT,
      database: 'TEST_DB'
    })
    
    // Set up test data
    await db.execute(`
      CREATE OR REPLACE TABLE test_users (
        user_id NUMBER,
        email VARCHAR,
        revenue NUMBER
      )
    `)
    await db.execute(`
      INSERT INTO test_users VALUES
      (1, 'alice@example.com', 1500),
      (2, 'bob@example.com', 500)
    `)
  })
  
  it('should execute simple query', async () => {
    const users = await sql<User>`
      SELECT * FROM test_users WHERE revenue > ${1000}
    `
    
    expect(users).toHaveLength(1)
    expect(users[0].email).toBe('alice@example.com')
  })
  
  afterAll(async () => {
    await db.close()
  })
})
```

### Type Tests

```typescript
// Test compile-time type safety
import { expectType } from 'tsd'

// Should infer correct return type
const users = await sql<User>`SELECT email, revenue FROM users`
expectType<Array<{ email: string, revenue: number }>>(users)

// Should error on invalid column
const invalid = await sql<User>`SELECT invalid_column FROM users`
// @ts-expect-error - Column 'invalid_column' does not exist

// Should error on accessing unselected column
users[0].user_id
// @ts-expect-error - Property 'user_id' does not exist
```

### End-to-End Tests

```typescript
// Test full workflow
describe('E2E', () => {
  it('should complete full development workflow', async () => {
    // 1. Generate types from schema
    await exec('npx sqlx generate')
    
    // 2. Write query
    const query = sql<User>`SELECT * FROM users`
    
    // 3. TypeScript compilation should succeed
    await exec('tsc --noEmit')
    
    // 4. Execute query
    const result = await query
    
    // 5. Verify result
    expect(result).toBeDefined()
  })
})
```

---

## Open Questions

### Technical Decisions

1. **SQL Dialect Parsing**
   - Q: Use existing SQL parser (pg-query-parser, sql-parser) or build custom?
   - Consideration: Snowflake has unique syntax (VARIANT, FLATTEN)
   - Recommendation: Start with simple regex/AST for MVP, evaluate pg-query-parser

2. **Lambda Expression Compilation**
   - Q: How to convert `(cols) => cols.revenue > 1000` to SQL?
   - Options:
     a. Proxy objects that track operations
     b. AST parsing of function body
     c. String template with macros
   - Recommendation: Proxy objects (most reliable)

3. **Caching Strategy**
   - Q: How to cache schema information?
   - Options:
     a. File-based cache (.sqlx-cache/)
     b. In-memory cache
     c. Redis/external cache
   - Recommendation: File-based for MVP

4. **Error Handling**
   - Q: How to provide helpful error messages?
   - Consideration: Both compile-time (TypeScript) and runtime (Snowflake)
   - Recommendation: Wrap Snowflake errors with context

### Product Decisions

1. **dbt Integration**
   - Q: Should SQLX replace dbt or complement it?
   - Recommendation: Complement - use SQLX for application queries, dbt for transformations

2. **Migration Path**
   - Q: How do users migrate from existing solutions (Kysely, raw SQL)?
   - Recommendation: Provide codemods and migration guides

3. **Versioning**
   - Q: How to handle breaking changes in API?
   - Recommendation: Semantic versioning, deprecation warnings

4. **Licensing**
   - Q: Open source or proprietary?
   - Recommendation: Open source (MIT) to build community

### Research Needed

1. **Performance**
   - Benchmark against raw SQL, Kysely, Snowpark
   - Measure compile-time overhead
   - Profile query generation

2. **Security**
   - SQL injection prevention
   - Parameter binding safety
   - Connection credential handling

3. **Scalability**
   - Large schema handling (1000+ tables)
   - Type generation performance
   - LSP responsiveness

---

## Success Metrics

### Developer Experience
- Time to write first query: < 5 minutes
- Lines of code vs. raw SQL: < 1.5x
- Type safety coverage: > 95%
- IDE autocomplete latency: < 100ms

### Adoption
- Internal adoption: 5 teams using in production within 3 months
- External adoption: 100 GitHub stars within 6 months
- Documentation coverage: 100% of public API

### Quality
- Test coverage: > 90%
- Bug reports: < 5 critical bugs in first 3 months
- TypeScript compilation success rate: > 99%

---

## References

### Similar Projects
- **Kysely**: Type-safe SQL query builder for TypeScript
- **Prisma**: TypeScript ORM with code generation
- **sqlx (Rust)**: Compile-time checked SQL queries
- **Zapatos**: TypeScript database client

### Technologies
- **TypeScript**: Language and type system
- **ts-morph**: TypeScript AST manipulation
- **snowflake-sdk**: Snowflake Node.js driver
- **vscode-languageserver**: LSP implementation

### Documentation
- Snowflake SQL Reference
- TypeScript Handbook
- LSP Specification
- JSX/TSX Specification

---

## Appendices

### Appendix A: Type System Details

```typescript
// Column types with read/write separation
type ColumnType<
  SelectType,
  InsertType = SelectType,
  UpdateType = SelectType
> = {
  __select__: SelectType
  __insert__: InsertType
  __update__: UpdateType
}

// Helper to extract select type
type Selectable<T> = {
  [K in keyof T]: T[K] extends ColumnType<infer S, any, any> ? S : T[K]
}

// Helper to extract insert type
type Insertable<T> = {
  [K in keyof T]: T[K] extends ColumnType<any, infer I, any> ? I : T[K]
}
```

### Appendix B: Lambda Compilation Strategy

```typescript
// Proxy-based approach
function createColumnProxy<T>(tableName: string) {
  const operations: SqlOperation[] = []
  
  return new Proxy({} as T, {
    get(target, prop: string) {
      return {
        // Comparison operators
        gt: (value: any) => {
          operations.push({ type: 'gt', column: prop, value })
          return { operations }
        },
        eq: (value: any) => {
          operations.push({ type: 'eq', column: prop, value })
          return { operations }
        },
        // ... more operators
      }
    }
  })
}

// Usage in lambda
<Where>
  {(cols) => cols.revenue.gt(1000)}
  // Compiles to: WHERE revenue > 1000
</Where>
```

### Appendix C: SQL Parser Pseudo-code

```typescript
function parseSQL(sql: string): ParsedQuery {
  const tokens = tokenize(sql)
  const ast = parse(tokens)
  
  return {
    type: ast.type,
    from: extractFrom(ast),
    where: extractWhere(ast),
    select: extractSelect(ast),
    // ...
  }
}

function extractColumns(ast: AST): Column[] {
  // Walk AST to find column references
  // Validate against schema
  // Return typed column list
}
```

---

## Getting Started (For Implementers)

### Prerequisites
- Node.js 18+
- TypeScript 5.0+
- Snowflake account with developer access
- Familiarity with AST manipulation

### Setup Development Environment

```bash
# Clone repo (when created)
git clone https://github.com/yourcompany/sqlx
cd sqlx

# Install dependencies
pnpm install

# Set up Snowflake connection
cp .env.example .env
# Edit .env with your Snowflake credentials

# Run tests
pnpm test

# Start development
pnpm dev
```

### Project Structure

```
sqlx/
├── packages/
│   ├── core/              # Core query building logic
│   │   ├── src/
│   │   │   ├── query-builder.ts
│   │   │   ├── sql-generator.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── schema/            # Schema introspection
│   │   ├── src/
│   │   │   ├── introspector.ts
│   │   │   ├── type-generator.ts
│   │   │   └── cache.ts
│   │   └── package.json
│   │
│   ├── transformer/       # TypeScript transformer
│   │   ├── src/
│   │   │   ├── sql-template-transformer.ts
│   │   │   ├── jsx-transformer.ts
│   │   │   └── lambda-compiler.ts
│   │   └── package.json
│   │
│   ├── lsp/               # Language Server Protocol
│   │   ├── src/
│   │   │   ├── completions.ts
│   │   │   ├── diagnostics.ts
│   │   │   └── hover.ts
│   │   └── package.json
│   │
│   └── cli/               # CLI tool
│       ├── src/
│       │   ├── generate.ts
│       │   ├── watch.ts
│       │   └── index.ts
│       └── package.json
│
├── examples/              # Example projects
├── docs/                  # Documentation
└── package.json           # Root package.json
```

### First Steps

1. **Week 1**: Implement schema introspection
2. **Week 2**: Build basic SQL tagged template support
3. **Week 3**: Add TSX query components
4. **Week 4**: Implement TypeScript transformer
5. **Week 5**: Create LSP plugin
6. **Week 6**: Polish and document

---

**End of Design Document**
