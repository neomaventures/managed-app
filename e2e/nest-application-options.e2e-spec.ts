import { managedAppInstance } from "@neomaventures/managed-app"
import { type App } from "supertest/types"

const PARAMETER = "src/parameter/parameter.module.ts#ParameterModule"

describe("nestApplicationOptions", () => {
  describe("Given no nestApplicationOptions", () => {
    it("should default to bufferLogs: true", async () => {
      const app = await managedAppInstance<App>({ module: PARAMETER })

      expect((app as any).appOptions).toEqual({ bufferLogs: true })
    })
  })

  describe("Given nestApplicationOptions with rawBody and bufferLogs override", () => {
    it("should pass options through and allow overriding defaults", async () => {
      const app = await managedAppInstance<App>({
        module: PARAMETER,
        nestApplicationOptions: { rawBody: true, bufferLogs: false },
      })

      expect((app as any).appOptions).toEqual({
        rawBody: true,
        bufferLogs: false,
      })
    })
  })
})
