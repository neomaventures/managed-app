import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

import {
  createSandbox,
  placeDefaultModule,
  type Sandbox,
} from "./support/sandbox"

const DEFAULT_LOCATION = "src/application/application.module.ts"
const DEFAULT_MODULE = "ApplicationModule"
const ENV_LOCATION = "src/env/env.module.ts"
const ENV_MODULE = "EnvModule"
const ENVIRONMENT_LOCATION = "src/env/environment.module.ts"
const ENVIRONMENT_MODULE = "EnvironmentModule"
const PARAMETER = `${ENV_LOCATION}#${ENV_MODULE}`

let sandbox: Sandbox

afterEach(() => {
  sandbox.cleanup()
})

describe("Multi-app support", () => {
  beforeEach(() => {
    sandbox = createSandbox()
    placeDefaultModule(sandbox, "bak.application.module.ts")
  })

  it("should load multiple apps depending on configuration", async () => {
    await request((await managedAppInstance<App>()).getHttpServer())
      .get("/message")
      .expect(HttpStatus.OK)
      .expect({ message: `Hello from ${DEFAULT_LOCATION}#${DEFAULT_MODULE}` })

    process.env.NEOMA_MANAGED_APP_MODULE_PATH = `${ENV_LOCATION}#${ENV_MODULE}`
    await request((await managedAppInstance<App>()).getHttpServer())
      .get("/message")
      .expect(HttpStatus.OK)
      .expect({ message: `Hello from ${ENV_LOCATION}#${ENV_MODULE}` })

    process.env.NEOMA_MANAGED_APP_MODULE_PATH = `${ENVIRONMENT_LOCATION}#${ENVIRONMENT_MODULE}`
    await request((await managedAppInstance<App>()).getHttpServer())
      .get("/message")
      .expect(HttpStatus.OK)
      .expect({
        message: `Hello from ${ENVIRONMENT_LOCATION}#${ENVIRONMENT_MODULE}`,
      })

    await request((await managedAppInstance<App>(PARAMETER)).getHttpServer())
      .get("/message")
      .expect(HttpStatus.OK)
      .expect({ message: `Hello from ${PARAMETER}` })
  })
})
