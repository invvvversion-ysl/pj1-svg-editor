import type { Command } from "../application/commands/Command.js";
import { CommandError } from "../application/CommandError.js";

/** Named dispatch point 1 of 2; see doc/README.md for the future registry boundary. */
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(name: string, command: Command): void {
    if (this.commands.has(name)) {
      throw new Error(`duplicate command registration: ${name}`);
    }
    this.commands.set(name, command);
  }

  async execute(line: string): Promise<readonly string[]> {
    const source = line.trim();
    if (source.length === 0 || source.startsWith("#")) {
      return [];
    }

    // Stage 1 accepts help only. A quote-aware tokenizer is added before edit commands.
    const [name, ...args] = source.split(/\s+/u);
    const command = name === undefined ? undefined : this.commands.get(name);
    if (command === undefined) {
      throw new CommandError(`unknown command: ${name ?? ""}`);
    }
    return await command.execute(args);
  }
}
