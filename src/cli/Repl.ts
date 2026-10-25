import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { CommandError } from "../application/CommandError.js";
import { CommandRegistry } from "./CommandRegistry.js";

export class Repl {
  constructor(private readonly registry: CommandRegistry) {}

  async run(): Promise<void> {
    const terminal = createInterface({
      input: stdin,
      output: stdout,
      terminal: stdin.isTTY === true,
      crlfDelay: Infinity,
      prompt: "svg> ",
    });

    stdout.write("svg-editor 0.1 — type 'help' for commands\n");
    terminal.prompt();

    try {
      for await (const line of terminal) {
        try {
          const messages = await this.registry.execute(line);
          for (const message of messages) {
            stdout.write(`${message}\n`);
          }
        } catch (error: unknown) {
          if (!(error instanceof CommandError)) {
            throw error;
          }
          stdout.write(`error: ${error.message}\n`);
        }
        terminal.prompt();
      }
    } finally {
      terminal.close();
    }
  }
}
