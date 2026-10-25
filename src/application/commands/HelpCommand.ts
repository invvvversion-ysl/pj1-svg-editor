import { CommandError } from "../CommandError.js";
import type { Command } from "./Command.js";

export class HelpCommand implements Command {
  constructor(private readonly lines: readonly string[]) {}

  execute(args: readonly string[]): readonly string[] {
    if (args.length !== 0) {
      throw new CommandError("usage: help");
    }
    return [...this.lines];
  }
}
