import { CommandArguments } from "../CommandArguments.js";
import { EditorSession } from "../EditorSession.js";
import { HistoryManager } from "../HistoryManager.js";
import type { Command } from "./Command.js";

export class CanvasCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly history: HistoryManager) {}

  execute(values: readonly string[]): readonly string[] {
    const document = this.session.requireDocument();
    const args = new CommandArguments(values, values.length === 0 ? 0 : 2, 2, "canvas [w h]");
    if (values.length === 0) return [`canvas ${document.width}x${document.height}`];
    const candidate = document.clone();
    candidate.resize(args.number(0, "canvas width"), args.number(1, "canvas height"));
    this.session.replaceEditedDocument(candidate);
    this.history.resetAfterIo();
    return [`canvas resized to ${candidate.width}x${candidate.height}`];
  }
}
