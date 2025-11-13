# Contributing to SQLX

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/sqlx.git
cd sqlx

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Watch mode for all packages
pnpm dev

# Run tests
pnpm test

# Build specific package
pnpm --filter @shirhatti/sqlx-core build
```

## Project Structure

- **packages/core**: Core query building and execution (`sql` tagged templates, connections)
- **packages/schema**: Schema introspection and type generation
- **packages/cli**: CLI tool (`npx sqlx generate`)
- **examples/**: Working examples

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm test && pnpm build` to verify
4. Commit with descriptive messages (e.g., `feat: add X`, `fix: correct Y`)
5. Push and open a pull request

## Testing

Tests use Vitest. Place tests in `tests/` directories:

```typescript
import { describe, it, expect } from 'vitest';

describe('feature', () => {
  it('should work', () => {
    expect(result).toBe(expected);
  });
});
```

## Code Style

- TypeScript strict mode
- Use Prettier for formatting: `pnpm format`
- Use ESLint for linting: `pnpm lint`
- Avoid `any` types
- Document complex types with JSDoc

## Useful Commands

| Command      | Description                |
| ------------ | -------------------------- |
| `pnpm build` | Build all packages         |
| `pnpm test`  | Run all tests              |
| `pnpm lint`  | Lint all packages          |
| `pnpm dev`   | Watch mode for development |
| `pnpm clean` | Clean build artifacts      |

## Need Help?

- Check the [README](./README.md) and [Design Doc](./sqlx-design-doc.md)
- Open an issue with questions
