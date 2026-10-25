import type { SvgDocument } from "../../domain/SvgDocument.js";
import { HistoryManager } from "../HistoryManager.js";
import type { Command } from "./Command.js";

/** One instance per invocation, holding its private before/after mementos. */
export abstract class EditCommand implements Command {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  private messages: readonly string[] = [];

  constructor(private readonly history: HistoryManager) {}

  execute(args: readonly string[]): readonly string[] {
    return this.history.execute(this, args);
  }

  get feedback(): readonly string[] { return [...this.messages]; }

  prepare(document: SvgDocument, args: readonly string[]): void {
    if (this.before !== undefined) throw new Error("edit command instances must not be reused");
    const before = document.clone();
    const candidate = document.clone();
    const messages = this.edit(candidate, args);
    this.before = before;
    this.after = candidate;
    this.messages = [...messages];
  }

  undo(): SvgDocument {
    if (this.before === undefined) throw new Error("cannot undo an unexecuted command");
    return this.before.clone();
  }

  redo(): SvgDocument {
    if (this.after === undefined) throw new Error("cannot redo an unexecuted command");
    return this.after.clone();
  }

  protected abstract edit(document: SvgDocument, args: readonly string[]): readonly string[];
}
