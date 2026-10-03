import { Module } from "@nestjs/common"

@Module({})
export class ErrorModule {}

throw new Error("This is a deliberate error in the module.")
