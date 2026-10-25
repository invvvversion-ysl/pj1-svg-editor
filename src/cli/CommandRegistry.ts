import type { Command } from "../application/commands/Command.js";
import { CommandError } from "../application/CommandError.js";
import { CommandExecutor } from "../application/CommandExecutor.js";
import { Tokenizer } from "./Tokenizer.js";

/** Named dispatch point 1 of 2; see doc/README.md for the future registry boundary. */
export class CommandRegistry {
  private readonly commands = new Map<string, () => Command>();
  private readonly tokenizer = new Tokenizer();
  private readonly executor = new CommandExecutor();

  register(name: string, createCommand: () => Command): void {
    if (this.commands.has(name)) {
      throw new Error(`duplicate command registration: ${name}`);
    }
    this.commands.set(name, createCommand);
  }

  async execute(line: string): Promise<readonly string[]> {
    const [name, ...args] = this.tokenizer.tokenize(line);
    if (name === undefined) return [];
    const createCommand = this.commands.get(name);
    if (createCommand === undefined) throw new CommandError(`unknown command: ${name}`);
    return await this.executor.execute(createCommand(), args);
  }
}
