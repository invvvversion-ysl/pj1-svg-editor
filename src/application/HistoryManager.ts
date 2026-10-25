import { CommandError } from "./CommandError.js";
import { EditorSession } from "./EditorSession.js";
import type { EditCommand } from "./commands/EditCommand.js";

export class HistoryManager {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private ioBarrier = false;

  constructor(private readonly session: EditorSession) {}

  get undoCount(): number { return this.undoStack.length; }
  get redoCount(): number { return this.redoStack.length; }
  get blockedAfterIo(): boolean { return this.ioBarrier; }

  execute(command: EditCommand, args: readonly string[]): readonly string[] {
    command.prepare(this.session.requireDocument(), args);
    // Prepare copies before changing live state or either stack.
    this.session.replaceEditedDocument(command.redo());
    this.undoStack.push(command);
    this.redoStack = [];
    this.ioBarrier = false;
    return command.feedback;
  }

  undo(): readonly string[] {
    this.checkHistoryAllowed();
    const command = this.undoStack.at(-1);
    if (command === undefined) throw new CommandError("nothing to undo");
    this.session.replaceEditedDocument(command.undo());
    this.undoStack.pop();
    this.redoStack.push(command);
    return [`undone: ${command.feedback[0] ?? "edit"}`];
  }

  redo(): readonly string[] {
    this.checkHistoryAllowed();
    const command = this.redoStack.at(-1);
    if (command === undefined) throw new CommandError("nothing to redo");
    this.session.replaceEditedDocument(command.redo());
    this.redoStack.pop();
    this.undoStack.push(command);
    return command.feedback;
  }

  /** Call after successful init/read/save or canvas resize, never after failure. */
  resetAfterIo(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.ioBarrier = true;
  }

  private checkHistoryAllowed(): void {
    this.session.requireDocument();
    if (this.ioBarrier) throw new CommandError("undo not allowed after io command");
  }
}
