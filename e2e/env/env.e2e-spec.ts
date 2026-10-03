import { resolve } from "path"

import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

const LOCATION = "src/env/environment.module.ts"
const MODULE = "EnvironmentModule"
const INCORRECT_EXPORT = "EnvModule"
const ERROR_MODULE = "ErrorModule"
const ERROR_LOCATION = "src/env/error.module.ts"
const MISSING_LOCATION = "src/env/missing.module.ts"

describe(LOCATION, () => {
  describe(`Given there is a module at ${LOCATION} with the export ${MODULE}`, () => {
    describe(`And process.env.NEOMA_MANAGED_APP_MODULE_PATH is set to ${LOCATION}#${MODULE}`, () => {
      beforeEach(async () => {
        process.env.NEOMA_MANAGED_APP_MODULE_PATH = `${LOCATION}#${MODULE}`
      })

      it("should automatically load the module.", async () => {
        const app = await managedAppInstance<App>()
        return request(app.getHttpServer())
          .get("/message")
          .expect(HttpStatus.OK)
          .expect({ message: `Hello from ${LOCATION}#${MODULE}` })
      })

      it("should return the same instance upon successive calls", async () => {
        expect(await managedAppInstance<App>()).toBe(
          await managedAppInstance<App>(),
        )
      })
    })

    describe(`But process.env.NEOMA_MANAGED_APP_MODULE_PATH is set to ${LOCATION}#${INCORRECT_EXPORT}`, () => {
      beforeEach(async () => {
        process.env.NEOMA_MANAGED_APP_MODULE_PATH = `${LOCATION}#${INCORRECT_EXPORT}`
      })

      it("should throw an error", () => {
        return expect(managedAppInstance<App>()).rejects.toThrow(
          `${LOCATION} module found but it is missing an export named ${INCORRECT_EXPORT}. Please ensure a module exists at ${resolve(LOCATION)} with the named import ${INCORRECT_EXPORT}.`,
        )
      })
    })
  })

  describe(`Given there is a module at ${ERROR_LOCATION} with the export ${ERROR_MODULE}`, () => {
    describe(`And process.env.NEOMA_MANAGED_APP_MODULE_PATH is set to ${ERROR_LOCATION}#${ERROR_MODULE}`, () => {
      describe("But the module throws an error when being loaded", () => {
        beforeEach(async () => {
          process.env.NEOMA_MANAGED_APP_MODULE_PATH = `${ERROR_LOCATION}#${ERROR_MODULE}`
        })

        it("should throw an error", () => {
          return expect(managedAppInstance<App>()).rejects.toThrow(
            `${ERROR_LOCATION} module found but an error occured whilst importing. Error: This is a deliberate error in the module`,
          )
        })
      })
    })
  })

  describe(`When there is not a module at ${MISSING_LOCATION}`, () => {
    beforeEach(async () => {
      process.env.NEOMA_MANAGED_APP_MODULE_PATH = `${MISSING_LOCATION}#${MODULE}`
    })

    it("should throw an error.", async () => {
      return expect(managedAppInstance<App>()).rejects.toThrow(
        `${MISSING_LOCATION}#${MODULE} module not found. Please ensure a module exists at ${resolve(MISSING_LOCATION)} with the named import ${MODULE}.`,
      )
    })
  })
})
