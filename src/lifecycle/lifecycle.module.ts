import {
  Injectable,
  Module,
  type OnApplicationShutdown,
  type OnModuleDestroy,
} from "@nestjs/common"

/**
 * Test-only provider whose lifecycle hooks are the assertion surface for
 * the shutdown-hooks spec. The hook bodies are intentionally empty —
 * specs override this provider with a `jest.fn()`-based value via
 * `TestingModuleBuilder.overrideProvider(LifecycleRecorder)` and assert
 * on the mock directly.
 */
@Injectable()
export class LifecycleRecorder
  implements OnModuleDestroy, OnApplicationShutdown
{
  public onModuleDestroy(): void {}
  public onApplicationShutdown(): void {}
}

@Module({
  providers: [LifecycleRecorder],
})
export class LifecycleModule {}
