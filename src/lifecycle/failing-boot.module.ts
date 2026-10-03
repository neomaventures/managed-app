import { Injectable, Module, type OnModuleInit } from "@nestjs/common"

import { LifecycleRecorder } from "./lifecycle.module"

/**
 * Provider that unconditionally throws in `OnModuleInit`. Registered after
 * {@link LifecycleRecorder} so the recorder is already constructed by the
 * DI graph when the throw happens — proving the spec's point that
 * `managedAppInstance<App>()` closes the half-booted app and runs shutdown
 * hooks on already-constructed providers.
 */
@Injectable()
export class ThrowingInit implements OnModuleInit {
  public onModuleInit(): void {
    throw new Error("intentional boot failure")
  }
}

@Module({
  providers: [LifecycleRecorder, ThrowingInit],
})
export class FailingBootModule {}
