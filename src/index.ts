import { resolve } from "path"

import {
  type DynamicModule,
  type ForwardReference,
  type INestApplication,
  type NestApplicationOptions,
  type Type,
} from "@nestjs/common"
import { Test, type TestingModuleBuilder } from "@nestjs/testing"

/**
 * Options for configuring a managed NestJS application instance.
 *
 * @property module - Module path in format `path/to/module.ts#ExportedModuleName`.
 *                   Takes precedence over the `NEOMA_MANAGED_APP_MODULE_PATH` environment
 *                   variable and the default path.
 * @property build - Optional callback invoked after `Test.createTestingModule()` but before
 *                  `compile()`. Receives the {@link TestingModuleBuilder}, enabling NestJS
 *                  testing overrides such as `overrideProvider()`, `overrideGuard()`,
 *                  `overrideInterceptor()`, etc. Must return the builder (enables chaining
 *                  with NestJS's fluent API). Note: caching is based on module path, so
 *                  `build` is only invoked on the first call for a given path — the same
 *                  behaviour as `configure`.
 * @property nestApplicationOptions - Optional NestJS application options passed to
 *                                    `createNestApplication()`. Merged on top of
 *                                    `{ bufferLogs: true }`, so consumer values take
 *                                    precedence over defaults.
 * @property configure - Optional callback invoked after app creation but before `init()`.
 *                      Use this to configure the app instance (e.g., set global prefix,
 *                      enable CORS, register view engines). Can be sync or async.
 */
export interface ManagedAppOptions<TServer = any> {
  module?: string
  nestApplicationOptions?: NestApplicationOptions
  build?: (builder: TestingModuleBuilder) => TestingModuleBuilder
  configure?: (app: INestApplication<TServer>) => void | Promise<void>
}

/**
 * Loads the default application module based on environment variable
 * or default paths.
 *
 * The module path is determined by the environment variable
 * NEOMA_MANAGED_APP_MODULE_PATH which should be in the format
 * path/to/module-file.ts#ExportedModuleName
 *
 * If the environment variable is not set, the following default path is used:
 * src/application/application.module.ts#ApplicationModule
 *
 * @returns A Promise that resolves to the module class.
 */
const loadAppModule = async (
  modulePath = "src/application/application.module.ts#ApplicationModule",
): Promise<{
  module: Type<any>
  path: string
}> => {
  const [path, exportName] = modulePath.split("#")
  const fullPath = resolve(path)

  let moduleImport: any
  try {
    moduleImport = await import(fullPath)
  } catch (e) {
    const error = e as NodeJS.ErrnoException & { moduleName?: string }
    if (
      (error.code === "MODULE_NOT_FOUND" && error.moduleName === fullPath) ||
      error.code === "ENOENT"
    ) {
      throw new Error(
        `${modulePath} module not found. Please ensure a module exists at ${fullPath} with the named import ${exportName}.`,
        { cause: e },
      )
    }
    throw new Error(
      `${path} module found but an error occured whilst importing. Error: ${error.message}`,
      { cause: e },
    )
  }

  const ModuleClass = moduleImport[exportName]

  if (ModuleClass) {
    return { module: ModuleClass, path: fullPath }
  }

  throw new Error(
    `${path} module found but it is missing an export named ${exportName}. Please ensure a module exists at ${fullPath} with the named import ${exportName}.`,
  )
}

/**
 * Creates a NestJS test application instance from the given module.
 *
 * This is a low-level utility that does NOT provide managed features
 * (no singleton pattern, no automatic cleanup, no configure callback).
 * Prefer {@link managedAppInstance} for most E2E testing scenarios.
 *
 * @param m - The module to load into the test application.
 * @param build - Optional callback to customise the {@link TestingModuleBuilder}
 *               before compilation (e.g. `overrideProvider()`).
 * @param nestApplicationOptions - Optional {@link NestApplicationOptions} passed to
 *                                `createNestApplication()`. Merged on top of
 *                                `{ bufferLogs: true }`, so consumer values take
 *                                precedence over defaults.
 *
 * @returns A {@link INestApplication} instance for e2e testing.
 */
export const nestJsApp = async <TServer = any>(
  m: Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference,
  build?: ManagedAppOptions["build"],
  nestApplicationOptions?: NestApplicationOptions,
): Promise<INestApplication<TServer>> => {
  let builder = Test.createTestingModule({
    imports: [m],
  })

  if (build) {
    builder = build(builder)
  }

  const moduleFixture = await builder.compile()

  return moduleFixture.createNestApplication({
    bufferLogs: true,
    ...nestApplicationOptions,
  })
}

const appInstances: Record<string, INestApplication> = {}
afterEach(async () => {
  for (const appInstanceKey in appInstances) {
    const instance = appInstances[appInstanceKey]
    await instance.close()
    delete appInstances[appInstanceKey]
  }
})

/**
 * Provides a managed and initialised NestJS application instance for testing.
 *
 * This function supports multiple isolated application instances based on different
 * module paths. Each unique module path gets its own cached instance that is reused
 * across multiple calls with the same path.
 *
 * Module path can be specified in three ways (in order of precedence):
 * 1. Direct parameter: `managedAppInstance<App>("path/to/module.ts#ExportName")`
 * 2. Environment variable: `NEOMA_MANAGED_APP_MODULE_PATH=path/to/module.ts#ExportName`
 * 3. Default path: `src/application/application.module.ts#ApplicationModule`
 *
 * @param options - Either a module path string or a {@link ManagedAppOptions} object.
 *                 When a string, it is used as the module path.
 *                 When an object, `module` specifies the path, `build` provides an optional
 *                 callback to customise the {@link TestingModuleBuilder} before compilation,
 *                 and `configure` provides an optional callback to configure the app before
 *                 initialization.
 *
 * @example
 * ```typescript
 * // Using default module
 * const app = await managedAppInstance<App>()
 *
 * // Using a module path string
 * const app = await managedAppInstance<App>("src/other/module.ts#OtherModule")
 *
 * // Using a build callback to override providers
 * const app = await managedAppInstance<App>({
 *   module: "src/other/module.ts#OtherModule",
 *   build: (builder) =>
 *     builder.overrideProvider(MyService).useValue({ find: jest.fn() }),
 * })
 *
 * // Using options with a configure callback
 * const app = await managedAppInstance<App>({
 *   module: "src/other/module.ts#OtherModule",
 *   configure: (app) => {
 *     app.setGlobalPrefix("api")
 *   },
 * })
 * ```
 *
 * @returns A Promise that resolves to the managed {@link INestApplication} instance.
 */
export const managedAppInstance = async <TServer = any>(
  options?: string | ManagedAppOptions<TServer>,
): Promise<INestApplication<TServer>> => {
  const moduleDescriptor =
    typeof options === "string" ? options : options?.module
  const build = typeof options === "object" ? options?.build : undefined
  const nestApplicationOptions =
    typeof options === "object" ? options?.nestApplicationOptions : undefined
  const configure = typeof options === "object" ? options?.configure : undefined

  const path =
    moduleDescriptor ??
    process.env.NEOMA_MANAGED_APP_MODULE_PATH ??
    "src/application/application.module.ts#ApplicationModule"

  let appInstance = appInstances[path]
  if (!appInstance) {
    const appDetails = await loadAppModule(path)
    // Held in a locally-typed binding rather than assigned straight into
    // `appInstance`. The cache is keyed by module path and shared across calls
    // with different `TServer`, so it can only be typed as `any` — assigning
    // through it before `configure` runs would widen the callback's argument
    // and lose the caller's server type.
    const created = await nestJsApp<TServer>(
      appDetails.module,
      build,
      nestApplicationOptions,
    )
    appInstance = created
    if (configure) {
      await configure(created)
    }

    // Enable shutdown hooks so `app.close()` fires `OnApplicationShutdown`
    // in afterEach. Without this, providers that register shutdown work
    // via `OnApplicationShutdown` (notably `@nestjs/bullmq`, which closes
    // all queues, workers, and QueueEvents there) never get the signal —
    // ioredis connections outlive the suite and emit reconnect errors on
    // the next tick. Production `main.ts` calls this identically.
    appInstance.enableShutdownHooks()

    try {
      await appInstance.init()
    } catch (error) {
      // Providers were already constructed before init() threw. Close the
      // half-booted app so their shutdown hooks run (notably @nestjs/bullmq's,
      // which closes ioredis connections). Without this, the connections
      // outlive the failing suite and emit reconnect errors during teardown.
      await appInstance.close().catch(() => undefined)
      throw error
    }
    appInstances[path] = appInstance

    return appInstance
  }
  return appInstance
}
