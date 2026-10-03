import { Module } from "@nestjs/common"

// Intentionally unresolvable `~/` alias — this module is a fixture
// asserting that `managedAppInstance<App>()` reports import failures cleanly
// (see e2e/path-alias/path-alias.e2e-spec.ts). Not meant to compile.
// prettier-ignore
// @ts-expect-error — unresolvable alias by design
import { CONTROLLER_MESSAGE, MessageController } from "~/controllers/message.controller"

@Module({
  controllers: [MessageController],
  providers: [
    {
      provide: CONTROLLER_MESSAGE,
      useValue:
        "Hello from src/path-alias/path-alias.module.ts#PathAliasModule",
    },
  ],
})
export class PathAliasModule {}
