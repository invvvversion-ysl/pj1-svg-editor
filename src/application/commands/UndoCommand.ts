import { CommandArguments } from "../CommandArguments.js";
import { HistoryManager } from "../HistoryManager.js";
import type { Command } from "./Command.js";

export class UndoCommand implements Command {
  constructor(private readonly history: HistoryManager) {}

  execute(args: readonly string[]): readonly string[] {
    new CommandArguments(args, 0, 0, "undo");
    return this.history.undo();
  }
}
