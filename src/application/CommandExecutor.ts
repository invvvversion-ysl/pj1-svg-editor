import { DomainError } from "../domain/DomainError.js";
import { CommandError } from "./CommandError.js";
import type { Command } from "./commands/Command.js";

/** Translate expected failures at the application boundary; CLI need not import domain. */
export class CommandExecutor {
  async execute(command: Command, args: readonly string[]): Promise<readonly string[]> {
    try {
      return await command.execute(args);
    } catch (error: unknown) {
      if (error instanceof DomainError) throw new CommandError(error.message);
      throw error;
    }
  }
}
