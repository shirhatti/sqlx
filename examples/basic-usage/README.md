# SQLX Basic Usage Example

This example demonstrates the Phase 1 features of SQLX:

- ✅ Basic SQL tagged templates
- ✅ Type-safe queries with compile-time validation
- ✅ Parameter binding and SQL injection protection
- ✅ Connection management
- ✅ Schema introspection and type generation

## Setup

1. **Set up environment variables:**

   ```bash
   cp ../../.env.example .env
   # Edit .env with your Snowflake credentials
   ```

2. **Install dependencies:**

   ```bash
   cd ../..
   pnpm install
   ```

3. **Build packages:**

   ```bash
   pnpm build
   ```

4. **Generate types from your Snowflake schema:**

   ```bash
   cd examples/basic-usage
   pnpm generate
   ```

   This will create `src/generated/db-types.ts` with TypeScript interfaces for all your tables.

## Run the Examples

```bash
pnpm dev
```

## What's Included

### Example 1: Simple Query

Basic SELECT query with type safety:

```typescript
const users = await sql<User>`
  SELECT email, revenue
  FROM analytics.core.users
  WHERE revenue > ${1000}
  ORDER BY revenue DESC
`;
```

### Example 2: Query with Parameters

Multiple parameters with safe binding:

```typescript
const minRevenue = 1000;
const users = await sql<UserSummary>`
  SELECT email, revenue, region
  FROM analytics.core.users
  WHERE revenue > ${minRevenue}
    AND region IN ('US', 'EU')
`;
```

### Example 3: Aggregation Query

GROUP BY and aggregate functions:

```typescript
const stats = await sql<RegionStats>`
  SELECT
    region,
    COUNT(*) as user_count,
    SUM(revenue) as total_revenue,
    AVG(revenue) as avg_revenue
  FROM analytics.core.users
  GROUP BY region
`;
```

### Example 4: Join Query

Multi-table joins:

```typescript
const orders = await sql<UserOrder>`
  SELECT
    u.email,
    o.order_id,
    o.amount
  FROM analytics.core.users u
  JOIN analytics.core.orders o ON u.user_id = o.user_id
`;
```

### Example 5: Using Generated Types

After running `pnpm generate`, use the generated types:

```typescript
import type { Core } from './generated/db-types.js';

const users = await sql<Core.Users>`
  SELECT * FROM analytics.core.users
`;
```

## Configuration

Edit `sqlx.config.json` to customize:

- Snowflake connection settings
- Which schemas to introspect
- Output path for generated types
- Type overrides for Snowflake types
- Table inclusion/exclusion patterns

## Next Steps

Phase 1 provides the foundation. Future phases will add:

- **Phase 2:** WHERE, JOIN, GROUP BY helpers and query composition
- **Phase 3:** TSX syntax with components and lambda expressions
- **Phase 4:** Snowflake-specific features (time travel, VARIANT, FLATTEN)
- **Phase 5:** LSP integration for IDE autocomplete
- **Phase 6:** Production polish and optimization

## Troubleshooting

### Connection Issues

Make sure your `.env` file has the correct Snowflake credentials:

```
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=CORE
```

### Type Generation Fails

Ensure:

- Your Snowflake user has access to `INFORMATION_SCHEMA`
- The database and schemas exist
- The database name in `sqlx.config.json` matches your Snowflake database

### TypeScript Errors

Run the build first:

```bash
cd ../..
pnpm build
```
