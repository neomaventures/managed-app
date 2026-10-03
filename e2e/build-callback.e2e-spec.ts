import {
  managedAppInstance,
  type ManagedAppOptions,
} from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

import { CONTROLLER_MESSAGE } from "../src/controllers/message.controller"

const PARAMETER = "src/parameter/parameter.module.ts#ParameterModule"
const ENV = "src/env/env.module.ts#EnvModule"
const ENVIRONMENT = "src/env/environment.module.ts#EnvironmentModule"

describe("build callback", () => {
  describe("Given a build callback that overrides a provider", () => {
    it("should use the overridden provider value", async () => {
      const app = await managedAppInstance<App>({
        module: PARAMETER,
        build: (builder) =>
          builder
            .overrideProvider(CONTROLLER_MESSAGE)
            .useValue("overridden message"),
      })

      return request(app.getHttpServer())
        .get("/message")
        .expect(HttpStatus.OK)
        .expect({ message: "overridden message" })
    })
  })

  describe("Given a build callback on a different module", () => {
    it("should apply the override to that module", async () => {
      const app = await managedAppInstance<App>({
        module: ENV,
        build: (builder) =>
          builder.overrideProvider(CONTROLLER_MESSAGE).useValue("env override"),
      })

      return request(app.getHttpServer())
        .get("/message")
        .expect(HttpStatus.OK)
        .expect({ message: "env override" })
    })
  })

  describe("Given both build and configure callbacks", () => {
    it("should apply both the provider override and the app configuration", async () => {
      const app = await managedAppInstance<App>({
        module: ENVIRONMENT,
        build: (builder) =>
          builder
            .overrideProvider(CONTROLLER_MESSAGE)
            .useValue("built and configured"),
        configure: (app) => {
          app.setGlobalPrefix("api")
        },
      })

      return request(app.getHttpServer())
        .get("/api/message")
        .expect(HttpStatus.OK)
        .expect({ message: "built and configured" })
    })
  })

  describe("Given managedAppInstance is called twice with a build callback", () => {
    it("should return the cached instance with the original override", async () => {
      const options: ManagedAppOptions = {
        module: PARAMETER,
        build: (builder) =>
          builder
            .overrideProvider(CONTROLLER_MESSAGE)
            .useValue("cached override"),
      }

      await managedAppInstance<App>(options)
      const app = await managedAppInstance<App>(options)

      return request(app.getHttpServer())
        .get("/message")
        .expect(HttpStatus.OK)
        .expect({ message: "cached override" })
    })
  })

  describe("Given an options object with module but no build", () => {
    it("should load the module normally", async () => {
      const app = await managedAppInstance<App>({ module: PARAMETER })

      return request(app.getHttpServer())
        .get("/message")
        .expect(HttpStatus.OK)
        .expect({ message: `Hello from ${PARAMETER}` })
    })
  })
})
