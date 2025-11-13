# SQLX: Type-Safe Snowflake Query Builder with TSX

SQLX is a TypeScript-first query builder for Snowflake that combines the ergonomics of SQL with the safety of TypeScript's type system. It uses JSX/TSX syntax for complex queries and tagged templates for simple queries, providing compile-time validation against Snowflake schemas.

**Status:** Phase 1 Implementation Complete ✅

## Features (Phase 1)

- ✅ **Type-safe queries** - SQL validated against TypeScript types at compile time
- ✅ **Tagged template syntax** - Natural SQL-like syntax with `sql` tagged templates
- ✅ **Schema introspection** - Automatic TypeScript type generation from Snowflake
- ✅ **Parameter binding** - Safe parameter escaping to prevent SQL injection
- ✅ **Connection management** - Simple Snowflake connection wrapper
- ✅ **CLI tool** - Generate types with `npx sqlx generate`

## Quick Start

### Installation (When Published)

```bash
npm install @shirhatti/sqlx-core @shirhatti/sqlx-cli
# or
pnpm add @shirhatti/sqlx-core @shirhatti/sqlx-cli
```

### Local Development Setup

Since this package is not yet published to npm, you'll need to set it up locally:

#### Option 1: Using pnpm Workspaces (Recommended)

If your project is in the same monorepo or you're working on SQLX itself:

```bash
# 1. Clone and set up the repository
git clone <repository-url>
cd sqlx

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. The example already uses workspace:* protocol
cd examples/basic-usage
pnpm install
pnpm dev
```

#### Option 2: Using pnpm link

If your project is in a separate directory:

```bash
# 1. In the sqlx repository, build and link packages
cd /path/to/sqlx
pnpm install
pnpm build

# Link each package globally
cd packages/core
pnpm link --global

cd ../schema
pnpm link --global

cd ../cli
pnpm link --global

# 2. In your project directory
cd /path/to/your-project

# Link the packages
pnpm link --global @shirhatti/sqlx-core
pnpm link --global @shirhatti/sqlx-cli

# 3. If you make changes to SQLX, rebuild
cd /path/to/sqlx
pnpm build  # or pnpm dev for watch mode
```

#### Option 3: Using npm link

```bash
# 1. In the sqlx repository
cd /path/to/sqlx
npm install
npm run build

# Link each package
cd packages/core
npm link

cd ../schema
npm link

cd ../cli
npm link

# 2. In your project
cd /path/to/your-project

npm link @shirhatti/sqlx-core
npm link @shirhatti/sqlx-cli
```

#### Option 4: Using file: Protocol

In your project's `package.json`:

```json
{
  "dependencies": {
    "@shirhatti/sqlx-core": "file:../path/to/sqlx/packages/core",
    "@shirhatti/sqlx-cli": "file:../path/to/sqlx/packages/cli"
  }
}
```

Then run `pnpm install` or `npm install`.

### Basic Usage

#### 1. Configure Connection

Create a `.env` file:

```bash
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=CORE
SNOWFLAKE_ROLE=DEVELOPER
```

#### 2. Generate Types

Create `sqlx.config.json`:

```json
{
  "connection": {
    "account": "${SNOWFLAKE_ACCOUNT}",
    "warehouse": "${SNOWFLAKE_WAREHOUSE}",
    "database": "ANALYTICS",
    "schema": "CORE"
  },
  "output": "./src/generated/db-types.ts",
  "schemas": ["CORE", "STAGING"]
}
```

Generate types from your schema:

```bash
npx sqlx generate
```

This creates TypeScript interfaces for all your tables in `src/generated/db-types.ts`.

#### 3. Write Type-Safe Queries

```typescript
import { configureConnection, sql } from '@shirhatti/sqlx-core';

// Configure connection
await configureConnection({
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: 'ANALYTICS',
  schema: 'CORE',
});

// Write type-safe queries
interface User {
  email: string;
  revenue: number;
}

const users = await sql<User>`
  SELECT email, revenue
  FROM analytics.core.users
  WHERE revenue > ${1000}
  ORDER BY revenue DESC
`;

// TypeScript knows the shape!
users.forEach(user => {
  console.log(`${user.email}: $${user.revenue}`);
});
```

## Project Structure

```
sqlx/
├── packages/
│   ├── core/              # Core query building and execution
│   ├── schema/            # Schema introspection and type generation
│   └── cli/               # CLI tool (npx sqlx)
├── examples/
│   └── basic-usage/       # Phase 1 example
├── package.json           # Root workspace config
└── pnpm-workspace.yaml    # pnpm workspace config
```

## Development

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/core
pnpm build

# Watch mode for development
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/schema
pnpm test
```

### Running Examples

```bash
cd examples/basic-usage

# Generate types from your Snowflake schema
pnpm generate

# Run the example
pnpm dev
```

## CLI Commands

### `sqlx init`

Create a `sqlx.config.json` configuration file:

```bash
npx sqlx init
```

### `sqlx generate`

Generate TypeScript types from your Snowflake schema:

```bash
npx sqlx generate [options]

Options:
  -c, --config <path>  Path to config file (default: "sqlx.config.json")
  -v, --verbose        Verbose output
```

## Configuration

### `sqlx.config.json`

```json
{
  "connection": {
    "account": "your_account",
    "warehouse": "COMPUTE_WH",
    "database": "ANALYTICS",
    "schema": "CORE",
    "role": "DEVELOPER"
  },
  "output": "./src/generated/db-types.ts",
  "schemas": ["CORE", "STAGING"],
  "typeOverrides": {
    "VARIANT": "JsonValue",
    "ARRAY": "JsonArray",
    "OBJECT": "JsonObject"
  },
  "excludeTables": ["*_TEMP", "*_BACKUP"],
  "includeTables": ["USERS", "ORDERS", "EVENTS*"],
  "cache": {
    "enabled": true,
    "ttl": 3600
  }
}
```

### Environment Variables

Override connection settings with environment variables:

- `SNOWFLAKE_ACCOUNT`
- `SNOWFLAKE_USERNAME`
- `SNOWFLAKE_PASSWORD`
- `SNOWFLAKE_WAREHOUSE`
- `SNOWFLAKE_DATABASE`
- `SNOWFLAKE_SCHEMA`
- `SNOWFLAKE_ROLE`

## Examples

See the [examples/basic-usage](./examples/basic-usage) directory for complete working examples.

### Simple Query

```typescript
const users = await sql<User>`
  SELECT email, revenue
  FROM analytics.core.users
  WHERE revenue > ${1000}
`;
```

### With Generated Types

```typescript
import type { Core } from './generated/db-types.js';

const users = await sql<Core.Users>`
  SELECT * FROM analytics.core.users
  WHERE revenue > ${1000}
`;

// TypeScript knows all columns!
users.forEach(user => {
  console.log(user.userId, user.email, user.revenue, user.region);
});
```

### Join Query

```typescript
const orders = await sql<UserOrder>`
  SELECT
    u.email,
    o.order_id,
    o.amount
  FROM analytics.core.users u
  JOIN analytics.core.orders o ON u.user_id = o.user_id
  WHERE o.order_date >= ${startDate}
`;
```

## Roadmap

### ✅ Phase 1: Foundation (Complete)
- Basic tagged template syntax
- Schema introspection
- Type generation
- Simple SELECT queries

### 🚧 Phase 2: Query Building (Planned)
- WHERE, JOIN, GROUP BY helpers
- Query composition
- Better parameter handling

### 🚧 Phase 3: TSX Support (Planned)
- JSX/TSX components for queries
- Lambda expressions
- Component composition

### 🚧 Phase 4: Snowflake Features (Planned)
- Time travel
- VARIANT type support
- FLATTEN operations

### 🚧 Phase 5: LSP & DX (Planned)
- IDE autocomplete
- Hover information
- Error diagnostics

### 🚧 Phase 6: Production (Planned)
- Performance optimization
- Connection pooling
- Comprehensive error handling

## Contributing

This project is in early development. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test`
5. Build: `pnpm build`
6. Submit a pull request

## Documentation

- [Design Document](./sqlx-design-doc.md) - Complete design and architecture
- [Basic Usage Example](./examples/basic-usage/README.md) - Phase 1 examples
- [API Reference](./docs/api.md) - Coming soon

## License

See [LICENSE](./LICENSE) file for details.

## Acknowledgments

Inspired by:
- [Kysely](https://kysely.dev/) - Type-safe SQL query builder
- [sqlx (Rust)](https://github.com/launchbadge/sqlx) - Compile-time checked SQL
- [Prisma](https://www.prisma.io/) - TypeScript ORM
