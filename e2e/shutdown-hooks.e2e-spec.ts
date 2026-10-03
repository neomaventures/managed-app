import { managedAppInstance } from "@neomaventures/managed-app"
import { type App } from "supertest/types"

import { LifecycleRecorder } from "../src/lifecycle/lifecycle.module"

const LIFECYCLE = "src/lifecycle/lifecycle.module.ts#LifecycleModule"
const FAILING_BOOT = "src/lifecycle/failing-boot.module.ts#FailingBootModule"

describe("shutdown hooks", () => {
  let recorder: {
    onApplicationShutdown: jest.Mock
    onModuleDestroy: jest.Mock
  }

  beforeEach(() => {
    recorder = {
      onApplicationShutdown: jest.fn(),
      onModuleDestroy: jest.fn(),
    }
  })

  describe("Given a successfully booted app is closed", () => {
    beforeEach(async () => {
      const app = await managedAppInstance<App>({
        module: LIFECYCLE,
        build: (builder) =>
          builder.overrideProvider(LifecycleRecorder).useValue(recorder),
      })
      await app.close()
    })

    it("should fire OnApplicationShutdown on registered providers", () => {
      expect(recorder.onApplicationShutdown).toHaveBeenCalledOnce()
    })
  })

  describe("Given a provider throws in OnModuleInit", () => {
    describe("And init has already been attempted", () => {
      beforeEach(async () => {
        // Pre-condition: prove the boot actually threw. If this ever passes,
        // the destroy assertion below would be meaningless.
        await expect(
          managedAppInstance<App>({
            module: FAILING_BOOT,
            build: (builder) =>
              builder.overrideProvider(LifecycleRecorder).useValue(recorder),
          }),
        ).rejects.toThrow("intentional boot failure")
      })

      it("should fire OnModuleDestroy on providers constructed before the failure", () => {
        expect(recorder.onModuleDestroy).toHaveBeenCalledOnce()
      })
    })
  })
})
