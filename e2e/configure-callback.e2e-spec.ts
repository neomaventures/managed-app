import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

const PARAMETER = "src/parameter/parameter.module.ts#ParameterModule"

describe("configure callback", () => {
  describe("Given a configure callback that sets a global prefix", () => {
    it("should apply the global prefix to routes", async () => {
      const app = await managedAppInstance<App>({
        module: PARAMETER,
        configure: (app) => {
          app.setGlobalPrefix("api")
        },
      })

      return request(app.getHttpServer())
        .get("/api/message")
        .expect(HttpStatus.OK)
    })
  })

  describe("Given a configure callback that throws an error", () => {
    it("should propagate the error and not cache the failed instance", async () => {
      await expect(
        managedAppInstance<App>({
          module: PARAMETER,
          configure: () => {
            throw new Error("configure failed")
          },
        }),
      ).rejects.toThrow("configure failed")

      const app = await managedAppInstance<App>({
        module: PARAMETER,
      })

      return request(app.getHttpServer()).get("/message").expect(HttpStatus.OK)
    })
  })

  describe("Given an async configure callback", () => {
    it("should await the callback before initializing", async () => {
      const app = await managedAppInstance<App>({
        module: PARAMETER,
        configure: async (app) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          app.setGlobalPrefix("async-api")
        },
      })

      return request(app.getHttpServer())
        .get("/async-api/message")
        .expect(HttpStatus.OK)
    })
  })

  describe("Given managedAppInstance is called twice with a configure callback", () => {
    it("should only invoke configure once", async () => {
      const configure = jest.fn()
      const options = { module: PARAMETER, configure }

      await managedAppInstance<App>(options)
      await managedAppInstance<App>(options)

      expect(configure).toHaveBeenCalledOnce()
    })
  })

  describe("Given an options object with module but no configure", () => {
    it("should load the module normally", async () => {
      const app = await managedAppInstance<App>({ module: PARAMETER })

      return request(app.getHttpServer()).get("/message").expect(HttpStatus.OK)
    })
  })

  describe("Given an options object with neither module nor configure", () => {
    it("should fall through to the default module path", async () => {
      await expect(managedAppInstance<App>({})).rejects.toThrow()
    })
  })
})
