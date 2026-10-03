import { Controller, Get, HttpCode, HttpStatus, Inject } from "@nestjs/common"

export const CONTROLLER_MESSAGE = Symbol("CONTROLLER_MESSAGE")

/**
 * A simple controller that returns a message.
 */
@Controller()
export class MessageController {
  /**
   * Creates an instance of MessageController.
   *
   * @param message - The message to be returned by the controller.
   */
  public constructor(
    @Inject(CONTROLLER_MESSAGE) private readonly message: string,
  ) {}

  /**
   * GET /message endpoint that returns the message
   * passed to the contructor..
   *
   * @returns An object containing the message.
   */
  @Get("message")
  @HttpCode(HttpStatus.OK)
  public status(): { message: string } {
    return { message: this.message }
  }
}
