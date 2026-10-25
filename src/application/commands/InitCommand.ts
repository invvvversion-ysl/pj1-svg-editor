import { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditorSession } from "../EditorSession.js";
import { HistoryManager } from "../HistoryManager.js";
import type { Command } from "./Command.js";

export class InitCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly history: HistoryManager) {}

  execute(values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 0, 2, "init [w] [h]");
    const width = values.length > 0 ? args.number(0, "canvas width") : 800;
    const height = values.length > 1 ? args.number(1, "canvas height") : 600;
    this.session.openDocument(new SvgDocument(width, height));
    this.history.resetAfterIo();
    return [`canvas ${width}x${height} created`];
  }
}
