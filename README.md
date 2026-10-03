# @neomaventures/managed-app

Managed NestJS application fixture for e2e tests — boots from a module path, caches one instance per path, closes automatically.

[![npm version](https://img.shields.io/npm/v/%40neomaventures%2Fmanaged-app)](https://www.npmjs.com/package/@neomaventures/managed-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description

`@neomaventures/managed-app` simplifies NestJS E2E testing by providing a convenient utility to create, manage, and reuse application instances across your test suites. It eliminates boilerplate code, ensures proper cleanup, and supports dynamic module loading from configurable paths.

## Features

- **Singleton Pattern**: Automatically manages a single application instance across tests
- **Automatic Lifecycle Management**: Built-in Jest hooks handle app initialization and cleanup
- **Dynamic Module Loading**: Load NestJS modules from configurable file paths via environment variables
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Build Callback**: Customise the `TestingModuleBuilder` before compilation (override providers, guards, interceptors, etc.)
- **Configure Callback**: Hook into the app instance before initialization (global prefix, view engines, etc.)
- **NestJS Application Options**: Pass `NestApplicationOptions` (e.g. `rawBody`, `cors`) to the underlying `createNestApplication()` call
- **Zero Configuration**: Works out of the box with sensible defaults

## Installation

```bash
npm install --save-dev @neomaventures/managed-app
```

### Peer Dependencies

This package wraps `Test.createTestingModule()`, so all three NestJS packages
are required at runtime:

```bash
npm install --save-dev @nestjs/common @nestjs/core @nestjs/testing
```

It also assumes a test runner providing a global `afterEach` — it registers one
on import to close app instances between tests. Jest is what it's developed
against.

## Quick Start

```typescript
import { type INestApplication } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

import { managedAppInstance } from "@neomaventures/managed-app"

describe("My API", () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    app = await managedAppInstance<App>()
  })

  it("should return 200 OK", () => {
    return request(app.getHttpServer()).get("/health").expect(200)
  })
})
```

`App` is supertest's server type. The package deliberately doesn't import it —
see [Server typing](#server-typing) below.

## API Reference

### `managedAppInstance<TServer>(options?)`

Creates and returns a managed NestJS application instance. Supports multiple isolated instances based on different module paths, with automatic caching and cleanup.

```typescript
async function managedAppInstance<TServer = any>(
  options?: string | ManagedAppOptions<TServer>,
): Promise<INestApplication<TServer>>
```

`TServer` is the type `app.getHttpServer()` returns, **not** the application
type. Pass supertest's `App` to get a typed server; omit it and you get `any`.

**Parameters**:

- `options` (optional): Either a module path string or a `ManagedAppOptions` object:
  - As a **string**: Module path in format `path/to/module.ts#ExportedModuleName`
  - As an **object**:
    - `module` (optional): Module path in the same format as above
    - `build` (optional): Callback invoked after `Test.createTestingModule()` but before `compile()`. Receives and must return the `TestingModuleBuilder` for overriding providers, guards, interceptors, etc.
    - `nestApplicationOptions` (optional): `NestApplicationOptions` passed to `createNestApplication()`. Merged on top of `{ bufferLogs: true }`, so consumer values take precedence over defaults.
    - `configure` (optional): Callback invoked after app creation but before `init()`. Can be sync or async.

**Returns**: A Promise that resolves to a NestJS application instance

**Module Path Resolution** (in order of precedence):

1. **Function parameter**: Direct module path passed to the function
2. **Environment variable**: `NEOMA_MANAGED_APP_MODULE_PATH`
3. **Default**: `src/application/application.module.ts#ApplicationModule`

**Multi-App Support**:

- Each unique module path gets its own cached instance
- Different module paths = different isolated app instances
- Same module path = same cached instance (singleton per path)

**Examples**:

```typescript
// Basic usage (default module)
describe("Default API Tests", () => {
  let app: INestApplication

  beforeEach(async () => {
    app = await managedAppInstance<App>()
  })

  it("should handle requests", () => {
    return request(app.getHttpServer()).get("/api/users").expect(200)
  })
})

// Using environment variable
describe("Custom Module Tests", () => {
  beforeEach(() => {
    process.env.NEOMA_MANAGED_APP_MODULE_PATH =
      "src/test/test.module.ts#TestModule"
  })

  it("should load custom module", async () => {
    const app = await managedAppInstance<App>()
    // Uses test module configuration
  })
})

// Using direct parameter (highest precedence)
describe("Parameter Module Tests", () => {
  it("should load specific module", async () => {
    const app = await managedAppInstance<App>(
      "src/integration/integration.module.ts#IntegrationModule",
    )
    // Uses integration module regardless of env var
  })
})

// Using a configure callback
describe("MPA Tests", () => {
  it("should apply global prefix", async () => {
    const app = await managedAppInstance<App>({
      module: "src/mpa/mpa.module.ts#MpaModule",
      configure: (app) => {
        app.setGlobalPrefix("api")
      },
    })

    return request(app.getHttpServer()).get("/api/users").expect(200)
  })
})

// Using an async configure callback
describe("Async Configuration", () => {
  it("should support async setup", async () => {
    const app = await managedAppInstance<App>({
      configure: async (app) => {
        app.setGlobalPrefix("v1")
        app.enableCors()
      },
    })
    // App is fully configured and initialized
  })
})

// Using a build callback to override providers
describe("Provider Override Tests", () => {
  it("should use the mock service", async () => {
    const app = await managedAppInstance<App>({
      module: "src/app/app.module.ts#AppModule",
      build: (builder) =>
        builder.overrideProvider(MyService).useValue({
          findAll: jest.fn().mockResolvedValue([]),
        }),
    })

    return request(app.getHttpServer()).get("/items").expect(200).expect([])
  })
})

// Passing NestJS application options (e.g. rawBody for Stripe webhooks)
describe("Raw Body Tests", () => {
  it("should enable raw body parsing", async () => {
    const app = await managedAppInstance<App>({
      module: "src/app/app.module.ts#AppModule",
      nestApplicationOptions: { rawBody: true },
    })

    return request(app.getHttpServer())
      .post("/webhooks/stripe")
      .send('{"type":"checkout.session.completed"}')
      .expect(200)
  })
})

// Multi-app scenario
describe("Multi-App Tests", () => {
  it("should handle multiple app configurations", async () => {
    const defaultApp = await managedAppInstance<App>()
    const testApp = await managedAppInstance<App>(
      "src/test/test.module.ts#TestModule",
    )

    // Different instances, different configurations
    expect(defaultApp).not.toBe(testApp)
  })
})
```

### `ManagedAppOptions`

```typescript
interface ManagedAppOptions<TServer = any> {
  module?: string
  nestApplicationOptions?: NestApplicationOptions
  build?: (builder: TestingModuleBuilder) => TestingModuleBuilder
  configure?: (app: INestApplication<TServer>) => void | Promise<void>
}
```

| Property                 | Type                     | Description                                                                                                                   |
| ------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `module`                 | `string`                 | Module path in format `path/to/module.ts#ExportedModuleName`                                                                  |
| `nestApplicationOptions` | `NestApplicationOptions` | Options passed to `createNestApplication()`. Merged on top of `{ bufferLogs: true }` — consumer values take precedence.       |
| `build`                  | `function`               | Callback invoked before `compile()`. Receives the `TestingModuleBuilder` for overriding providers, guards, interceptors, etc. |
| `configure`              | `function`               | Callback invoked after app creation, before `init()`. Can be sync or async.                                                   |

> **Note:** `build`, `nestApplicationOptions`, and `configure` are only applied on the first call for a given module path. Subsequent calls return the cached instance.

### `nestJsApp(module, build?, nestApplicationOptions?)`

A basic utility function that creates a NestJS test application instance from a provided module.

**Note**: This function does NOT provide managed features (no singleton pattern, no automatic cleanup). If you need managed lifecycle, use `managedAppInstance<App>()` instead.

```typescript
async function nestJsApp(
  m: Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference,
  build?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
  nestApplicationOptions?: NestApplicationOptions,
): Promise<INestApplication<App>>
```

**Parameters**:

- `m`: The NestJS module to create the app from
- `build` (optional): Callback to customise the `TestingModuleBuilder` before compilation
- `nestApplicationOptions` (optional): `NestApplicationOptions` passed to `createNestApplication()`. Merged on top of `{ bufferLogs: true }`.

**Returns**: A Promise that resolves to a NestJS application instance

**Example**:

```typescript
const app = await nestJsApp(AppModule)
// Remember to manually close the app when done
await app.close()
```

## Server typing

`managedAppInstance` is generic over the HTTP server type, and this package
imports nothing from supertest — not even its types.

That's deliberate. A type-only import still appears in the published
`.d.ts`, which would make `@types/supertest` a hidden requirement for every
consumer, including those using a different HTTP assertion library.

So the type comes from your side:

```typescript
import request from "supertest"
import { type App } from "supertest/types"

const app = await managedAppInstance<App>()

return request(app.getHttpServer()).get("/health").expect(200)
```

Omit the parameter and `TServer` defaults to `any`, which is what
`createNestApplication()` gives you without a generic. That works, but
`app.getHttpServer()` is then untyped — and strict setups running
`@typescript-eslint/no-unsafe-argument` will flag passing it to `request()`.

`TServer` is the **server** type, not the application type. Passing
`INestApplication<App>` yields `INestApplication<INestApplication<App>>` and
`getHttpServer()` returns an application rather than a server.

## Configuration

### Environment Variables

#### `NEOMA_MANAGED_APP_MODULE_PATH`

Specifies the path and export name of the module to load for `managedAppInstance<App>()`.

**Format**: `path/to/module.ts#ExportedModuleName`

**Examples**:

```bash
# Use a custom test module
export NEOMA_MANAGED_APP_MODULE_PATH=src/test/e2e.module.ts#E2ETestModule

# Use environment-specific module
export NEOMA_MANAGED_APP_MODULE_PATH=src/env/test.module.ts#TestModule
```

**Default**: `src/application/application.module.ts#ApplicationModule`

### Module Path Syntax

The module path uses a hash (`#`) to separate the file path from the export name:

```
src/my/module/path.ts#MyModuleName
└─────┬──────────────┘ └─────┬──────┘
   File Path           Export Name
```

- **File Path**: Relative path from project root to the TypeScript module file
- **Export Name**: The named export from that file

## Usage Patterns

### Basic E2E Testing

```typescript
import { INestApplication } from "@nestjs/common"
import * as request from "supertest"
import { managedAppInstance } from "@neomaventures/managed-app"

describe("Users API", () => {
  let app: INestApplication

  beforeEach(async () => {
    app = await managedAppInstance<App>()
  })

  it("should create a user", () => {
    return request(app.getHttpServer())
      .post("/users")
      .send({ name: "John Doe" })
      .expect(201)
  })

  it("should get all users", () => {
    return request(app.getHttpServer()).get("/users").expect(200)
  })
})
```

### Overriding Providers in Tests

Use the `build` callback to override providers, guards, or interceptors before the module compiles — ideal for mocking services in e2e tests:

```typescript
import { INestApplication } from "@nestjs/common"
import * as request from "supertest"
import { managedAppInstance } from "@neomaventures/managed-app"
import { MailService } from "../src/mail/mail.service"

describe("Mail API", () => {
  let app: INestApplication

  beforeEach(async () => {
    app = await managedAppInstance<App>({
      module: "src/app/app.module.ts#AppModule",
      build: (builder) =>
        builder.overrideProvider(MailService).useValue({
          send: jest.fn().mockResolvedValue({ success: true }),
        }),
    })
  })

  it("should send mail using the mock", () => {
    return request(app.getHttpServer())
      .post("/mail/send")
      .send({ to: "test@example.com" })
      .expect(200)
  })
})
```

### Caveat: `jest.resetModules()` and Symbol-based Tokens

If your test setup calls `jest.resetModules()` globally (e.g. in a shared `afterEach`), **Symbol-based injection tokens will break** when used with the `build` callback.

#### Why this happens

This library loads modules dynamically via `await import()`. When `jest.resetModules()` clears Jest's module cache, the next dynamic import re-evaluates the module file — creating **new** Symbol instances for any Symbol-based tokens. A static `import { MY_TOKEN } from "..."` at the top of your test file still holds the **original** Symbol from the first evaluation. Since `Symbol("X") !== Symbol("X")`, `overrideProvider(originalSymbol)` silently fails to match the provider registered with the new Symbol.

#### How to avoid it

**Option 1 (recommended):** Scope `jest.resetModules()` to only the tests that need it, rather than applying it globally:

```typescript
// Only in specs that genuinely need module re-evaluation
afterEach(() => {
  jest.resetModules()
})
```

**Option 2:** If you must use a global `jest.resetModules()`, dynamically import the token in each test so it matches the re-evaluated module:

```typescript
import { resolve } from "path"

async function loadMyToken() {
  const mod = await import(resolve("src/my/service"))
  return mod.MY_TOKEN
}

it("should override the provider", async () => {
  const TOKEN = await loadMyToken()
  const app = await managedAppInstance<App>({
    build: (builder) => builder.overrideProvider(TOKEN).useValue(mockValue),
  })
})
```

**Option 3:** Use class-based or string-based tokens instead of Symbols — these survive module re-evaluation since their identity is based on value, not reference:

```typescript
// String token — works across module reloads
const MY_TOKEN = "MY_TOKEN"

// Class token — identity is stable if statically imported
@Injectable()
class MyService { ... }
```

> **Note:** This issue is not specific to this library — it affects any NestJS testing setup that combines dynamic imports, `jest.resetModules()`, and Symbol-based injection tokens.

### Configuring the App Instance

Use the `configure` callback to set up the app before it initializes — useful for MPA setups, global prefixes, view engines, static assets, or CORS:

```typescript
import { managedAppInstance } from "@neomaventures/managed-app"
import { NestExpressApplication } from "@nestjs/platform-express"
import { join } from "path"

describe("MPA E2E Tests", () => {
  let app: INestApplication

  beforeEach(async () => {
    app = await managedAppInstance<App>({
      configure: (app) => {
        app.setGlobalPrefix("api")
        const expressApp = app as unknown as NestExpressApplication
        expressApp.useStaticAssets(join(__dirname, "..", "public"))
        expressApp.setBaseViewsDir(join(__dirname, "..", "views"))
        expressApp.setViewEngine("hbs")
      },
    })
  })

  it("should serve the API under /api", () => {
    return request(app.getHttpServer()).get("/api/health").expect(200)
  })
})
```

### Testing Different Environments

```typescript
describe("Staging environment tests", () => {
  beforeAll(() => {
    process.env.NEOMA_MANAGED_APP_MODULE_PATH =
      "src/env/staging.module.ts#StagingModule"
  })

  afterAll(() => {
    delete process.env.NEOMA_MANAGED_APP_MODULE_PATH
  })

  it("should use staging configuration", async () => {
    const app = await managedAppInstance<App>()
    // Test with staging environment config
  })
})
```

### Integration with Database Testing

```typescript
import { managedAppInstance } from "@neomaventures/managed-app"
import { DataSource } from "typeorm"

describe("Database Integration", () => {
  let app: INestApplication
  let dataSource: DataSource

  beforeEach(async () => {
    app = await managedAppInstance<App>()
    dataSource = app.get(DataSource)
  })

  afterEach(async () => {
    // Clean up database after each test
    await dataSource.synchronize(true)
  })

  it("should save entity to database", async () => {
    // Your database test here
  })
})
```

### Accessing Services in Tests

```typescript
import { managedAppInstance } from "@neomaventures/managed-app"
import { UserService } from "../src/users/user.service"

describe("User Service", () => {
  let app: INestApplication
  let userService: UserService

  beforeEach(async () => {
    app = await managedAppInstance<App>()
    userService = app.get(UserService)
  })

  it("should find user by id", async () => {
    const user = await userService.findById(1)
    expect(user).toBeDefined()
  })
})
```

## How It Works

### Automatic Lifecycle Management

The module automatically registers a Jest `afterEach` hook at import time:

```typescript
let appInstance: INestApplication | null = null

afterEach(async () => {
  if (appInstance) {
    await appInstance.close()
    appInstance = null
  }
})
```

This ensures:

- No resource leaks between tests
- Clean slate for each test
- Proper shutdown of HTTP servers, database connections, etc.

### Shutdown Hooks

`managedAppInstance<App>()` calls `app.enableShutdownHooks()` before `app.init()`,
matching the shape of a production `main.ts`. This makes `app.close()` (called
by the `afterEach` hook) fire `OnApplicationShutdown` on every provider — not
just `OnModuleDestroy`.

The distinction matters for providers that register shutdown work via
`OnApplicationShutdown` — notably `@nestjs/bullmq`, which closes all queues,
workers, and `QueueEvents` there. Without shutdown hooks enabled in the
test harness, those connections outlive the suite and emit reconnect errors
on the next tick.

### Half-Booted App Cleanup

If `app.init()` throws (e.g. a validator in `OnModuleInit` rejects the boot),
`managedAppInstance<App>()` closes the half-booted app before rethrowing. Providers
constructed by the DI graph before the failure still get their shutdown hooks
run — no orphaned Redis connections, DB pools, or HTTP clients from a failed
boot.

This matters for tests that intentionally assert boot failure:

```typescript
it("should throw when a required credential is missing", async () => {
  process.env.REQUIRED_CREDENTIAL = ""
  await expect(managedAppInstance<App>()).rejects.toThrow(
    MissingCredentialException,
  )
  // Any providers constructed before OnModuleInit threw are cleanly closed.
})
```

### Singleton Pattern

`managedAppInstance<App>()` implements a singleton pattern that:

1. Creates the app on first call and caches it
2. Returns the cached instance on subsequent calls
3. Resets after each test via the `afterEach` hook

This reduces test overhead while maintaining isolation between test cases.

## Error Handling

The module provides clear error messages for common issues:

### Module Not Found

```
Error: Module not found: /path/to/src/missing/module.ts
```

**Solution**: Verify the file path in `NEOMA_MANAGED_APP_MODULE_PATH` exists

### Export Not Found

```
Error: Module found but no export named WrongName: /path/to/src/app/app.module.ts
```

**Solution**: Ensure the export name after `#` matches the actual export in the file

## Testing

Run the test suite:

```bash
npm run test:e2e
```

Run with watch mode:

```bash
npm run test:e2e -- --watch
```

## Requirements

- Node.js >= 22.0.0
- NestJS >= 11.0.0
- TypeScript >= 5.0.0
- Jest (for test lifecycle hooks)

## Roadmap

Potential future enhancements:

- Support passing a module directly to `managedAppInstance<App>(module)` for inline customization
- Optional test isolation modes

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on [GitHub](https://github.com/neomaventures/pack/issues).

## Related Packages

- [@neomaventures/route-model-binding](https://www.npmjs.com/package/@neomaventures/route-model-binding) - NestJS route model binding utilities
