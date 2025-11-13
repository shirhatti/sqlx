/**
 * SQLX Basic Usage Example - Phase 1
 *
 * This example demonstrates the Phase 1 features:
 * - Basic SQL tagged templates
 * - Type-safe queries
 * - Parameter binding
 * - Connection management
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { configureConnection, sql } from '@shirhatti/sqlx-core';

// Example 1: Simple Query
async function simpleQuery() {
  console.log('\n=== Example 1: Simple Query ===\n');

  // Define expected result type
  interface User {
    email: string;
    revenue: number;
  }

  // Write a type-safe query
  const users = await sql<User>`
    SELECT email, revenue
    FROM analytics.core.users
    WHERE revenue > ${1000}
    ORDER BY revenue DESC
    LIMIT 10
  `;

  console.log(`Found ${users.length} users with revenue > $1000:`);
  users.forEach((user) => {
    console.log(`  ${user.email}: $${user.revenue}`);
  });
}

// Example 2: Query with Multiple Parameters
async function queryWithParameters() {
  console.log('\n=== Example 2: Query with Multiple Parameters ===\n');

  interface UserSummary {
    email: string;
    revenue: number;
    region: string;
  }

  const minRevenue = 1000;

  // Note: This is a simplified example. In production, you'd handle
  // the IN clause more elegantly
  const users = await sql<UserSummary>`
    SELECT email, revenue, region
    FROM analytics.core.users
    WHERE revenue > ${minRevenue}
      AND region IN ('US', 'EU')
    ORDER BY revenue DESC
  `;

  console.log(`Found ${users.length} high-value users in US/EU:`);
  users.forEach((user) => {
    console.log(`  ${user.email} (${user.region}): $${user.revenue}`);
  });
}

// Example 3: Aggregation Query
async function aggregationQuery() {
  console.log('\n=== Example 3: Aggregation Query ===\n');

  interface RegionStats {
    region: string;
    userCount: number;
    totalRevenue: number;
    avgRevenue: number;
  }

  const stats = await sql<RegionStats>`
    SELECT
      region,
      COUNT(*) as user_count,
      SUM(revenue) as total_revenue,
      AVG(revenue) as avg_revenue
    FROM analytics.core.users
    GROUP BY region
    ORDER BY total_revenue DESC
  `;

  console.log('Revenue by region:');
  stats.forEach((stat) => {
    console.log(`  ${stat.region}:`);
    console.log(`    Users: ${stat.userCount}`);
    console.log(`    Total: $${stat.totalRevenue}`);
    console.log(`    Average: $${stat.avgRevenue.toFixed(2)}`);
  });
}

// Example 4: Join Query
async function joinQuery() {
  console.log('\n=== Example 4: Join Query ===\n');

  interface UserOrder {
    email: string;
    orderId: number;
    amount: number;
    orderDate: Date;
  }

  const minDate = '2024-01-01';

  const orders = await sql<UserOrder>`
    SELECT
      u.email,
      o.order_id,
      o.amount,
      o.order_date
    FROM analytics.core.users u
    JOIN analytics.core.orders o ON u.user_id = o.user_id
    WHERE o.order_date >= ${minDate}
    ORDER BY o.order_date DESC
    LIMIT 20
  `;

  console.log(`Recent orders (since ${minDate}):`);
  orders.forEach((order) => {
    console.log(
      `  ${order.email}: Order #${order.orderId} - $${order.amount} on ${order.orderDate}`
    );
  });
}

// Example 5: Working with Generated Types
function withGeneratedTypes() {
  console.log('\n=== Example 5: Using Generated Types ===\n');

  // If you've run `npx sqlx generate`, you can import the generated types:
  // import type { Core } from './generated/db-types.js';

  // Then use them directly:
  // const users = await sql<Core.Users>`SELECT * FROM analytics.core.users LIMIT 5`;

  console.log('Run `npx sqlx generate` to create type definitions!');
  console.log('Then you can use them for full compile-time type safety.');
}

// Main function
async function main() {
  try {
    console.log('🚀 SQLX Phase 1 Examples\n');
    console.log('Configuring connection to Snowflake...');

    // Configure connection from environment variables
    await configureConnection({
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE || 'ANALYTICS',
      schema: process.env.SNOWFLAKE_SCHEMA || 'CORE',
      role: process.env.SNOWFLAKE_ROLE,
    });

    console.log('✓ Connected!\n');

    // Run examples
    await simpleQuery();
    await queryWithParameters();
    await aggregationQuery();
    await joinQuery();
    withGeneratedTypes();

    console.log('\n✅ All examples completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
