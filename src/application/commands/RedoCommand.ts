import { CommandArguments } from "../CommandArguments.js";
import { HistoryManager } from "../HistoryManager.js";
import type { Command } from "./Command.js";

export class RedoCommand implements Command {
  constructor(private readonly history: HistoryManager) {}

  execute(args: readonly string[]): readonly string[] {
    new CommandArguments(args, 0, 0, "redo");
    return this.history.redo();
  }
}
