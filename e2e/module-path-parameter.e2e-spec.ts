import { resolve } from "path"

import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

const LOCATION = "src/parameter/parameter.module.ts"
const MODULE = "ParameterModule"
const INCORRECT_EXPORT = "ParamModule"
const PARAMETER = `${LOCATION}#${MODULE}`
const ERROR_MODULE = "ErrorModule"
const ERROR_LOCATION = "src/parameter/error.module.ts"
const MISSING_LOCATION = "src/parameter/missing.module.ts"
const ENV_LOCATION = "src/env/environment.module.ts"
const ENV_MODULE = "EnvironmentModule"

describe(LOCATION, () => {
  describe(`Given there is a module at ${LOCATION} with the export ${MODULE}`, () => {
    describe(`When it's called with ${PARAMETER}`, () => {
      it("should automatically load the module.", async () => {
        const app = await managedAppInstance<App>(PARAMETER)
        return request(app.getHttpServer())
          .get("/message")
          .expect(HttpStatus.OK)
          .expect({ message: `Hello from ${PARAMETER}` })
      })
    })

    describe(`But it's called with ${LOCATION}#${INCORRECT_EXPORT}`, () => {
      it("should throw an error", () => {
        return expect(
          managedAppInstance<App>(`${LOCATION}#${INCORRECT_EXPORT}`),
        ).rejects.toThrow(
          `${LOCATION} module found but it is missing an export named ${INCORRECT_EXPORT}. Please ensure a module exists at ${resolve(LOCATION)} with the named import ${INCORRECT_EXPORT}.`,
        )
      })
    })

    describe(`And process.env.NEOMA_MANAGED_APP_MODULE_PATH is set to ${ENV_LOCATION}#${ENV_MODULE}`, () => {
      beforeEach(async () => {
        process.env.NEOMA_MANAGED_APP_MODULE_PATH = `${ENV_LOCATION}#${ENV_MODULE}`
      })

      describe(`When it's called with ${PARAMETER}`, () => {
        it("should prioritise the parameter value over the environment variable", async () => {
          const app = await managedAppInstance<App>(PARAMETER)
          return request(app.getHttpServer())
            .get("/message")
            .expect(HttpStatus.OK)
            .expect({ message: `Hello from ${PARAMETER}` })
        })
      })
    })
  })

  describe(`Given there is a module at ${ERROR_LOCATION} with the export ${ERROR_MODULE}`, () => {
    describe(`When it's called with ${ERROR_LOCATION}#${ERROR_MODULE}`, () => {
      describe("But the module throws an error when being loaded", () => {
        it("should throw an error", () => {
          return expect(
            managedAppInstance<App>(`${ERROR_LOCATION}#${ERROR_MODULE}`),
          ).rejects.toThrow(
            `${ERROR_LOCATION} module found but an error occured whilst importing. Error: This is a deliberate error in the module`,
          )
        })
      })
    })
  })

  describe(`When there is not a module at ${MISSING_LOCATION}`, () => {
    describe(`When it's called with ${MISSING_LOCATION}#${MODULE}`, () => {
      it("should throw an error.", async () => {
        return expect(
          managedAppInstance<App>(`${MISSING_LOCATION}#${MODULE}`),
        ).rejects.toThrow(
          `${MISSING_LOCATION}#${MODULE} module not found. Please ensure a module exists at ${resolve(MISSING_LOCATION)} with the named import ${MODULE}.`,
        )
      })
    })
  })
})
