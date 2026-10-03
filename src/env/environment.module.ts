import { Module } from "@nestjs/common"

import {
  CONTROLLER_MESSAGE,
  MessageController,
} from "../controllers/message.controller"

@Module({
  controllers: [MessageController],
  providers: [
    {
      provide: CONTROLLER_MESSAGE,
      useValue: "Hello from src/env/environment.module.ts#EnvironmentModule",
    },
  ],
})
export class EnvironmentModule {}
