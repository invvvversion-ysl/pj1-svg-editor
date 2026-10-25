import { beforeEach, describe, expect, it } from "vitest";
import { EditorSession } from "../../src/application/EditorSession.js";
import { HistoryManager } from "../../src/application/HistoryManager.js";
import { CommandError } from "../../src/application/CommandError.js";
import { EditCommand } from "../../src/application/commands/EditCommand.js";
import { InitCommand } from "../../src/application/commands/InitCommand.js";
import { MoveCommand } from "../../src/application/commands/MoveCommand.js";
import { DomainError } from "../../src/domain/DomainError.js";
import { SvgDocument } from "../../src/domain/SvgDocument.js";
import { Rect } from "../../src/domain/shapes/Rect.js";

describe("HistoryManager and session ownership", () => {
  let session: EditorSession;
  let history: HistoryManager;
  beforeEach(() => {
    session = new EditorSession();
    session.openDocument(new SvgDocument(800, 600, [new Rect("r1", 10, 20, 30, 40)]), "original.svg");
    history = new HistoryManager(session);
  });

  it("requires a document before editing or traversing history", () => {
    const empty = new EditorSession();
    const manager = new HistoryManager(empty);
    for (const action of [() => new MoveCommand(manager).execute(["r1", "1", "2"]), () => manager.undo(), () => manager.redo()]) {
      expect(action).toThrow("no document. use 'init' or 'read' first");
    }
    expect(manager.undoCount).toBe(0);
  });

  it("reports empty stacks without changing the session", () => {
    const before = session.requireDocument().toSvgElement();
    expect(() => history.undo()).toThrow("nothing to undo");
    expect(() => history.redo()).toThrow("nothing to redo");
    expect(session.requireDocument().toSvgElement()).toEqual(before);
  });

  it("keeps separate entries for consecutive instances of one command type", () => {
    new MoveCommand(history).execute(["r1", "1", "0"]);
    new MoveCommand(history).execute(["r1", "2", "0"]);
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("13");
    expect(history.undoCount).toBe(2);
    history.undo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("11");
    history.undo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("10");
    history.redo();
    history.redo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("13");
  });

  it("discards even a partially modified candidate after a command throws", () => {
    new MoveCommand(history).execute(["r1", "1", "0"]);
    history.undo();
    const before = session.requireDocument().toSvgElement();
    const failing = new class extends EditCommand {
      protected override edit(document: SvgDocument, _args: readonly string[]): readonly string[] {
        document.move("r1", 100, 200);
        document.resize(100, 100);
        throw new DomainError("failure after mutation");
      }
    }(history);
    expect(() => failing.execute([])).toThrow("failure after mutation");
    expect(session.requireDocument().toSvgElement()).toEqual(before);
    expect(session.filePath).toBe("original.svg");
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(1);
    history.redo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("11");
  });

  it("isolates stored mementos from returned copies and live document references", () => {
    const command = new MoveCommand(history);
    command.execute(["r1", "5", "0"]);
    command.undo().move("r1", 999, 0);
    command.redo().move("r1", 999, 0);
    session.requireDocument().move("r1", 100, 0);
    history.undo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("10");
    history.redo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("15");
    expect(session.filePath).toBe("original.svg");
  });

  it("rejects accidental reuse of a completed command without another history entry", () => {
    const command = new MoveCommand(history);
    command.execute(["r1", "1", "0"]);
    expect(() => command.execute(["r1", "2", "0"])).toThrow("must not be reused");
    expect(history.undoCount).toBe(1);
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("11");
  });

  it("clears redo only after a successful new edit, including a zero-distance move", () => {
    new MoveCommand(history).execute(["r1", "1", "0"]);
    history.undo();
    expect(() => new MoveCommand(history).execute(["missing", "1", "0"])).toThrow();
    expect(history.redoCount).toBe(1);
    new MoveCommand(history).execute(["r1", "0", "0"]);
    expect(history.redoCount).toBe(0);
    expect(() => history.redo()).toThrow("nothing to redo");
  });

  it("keeps the I/O barrier active after a failed edit", () => {
    history.resetAfterIo();
    expect(() => new MoveCommand(history).execute(["missing", "1", "0"])).toThrow();
    expect(history.blockedAfterIo).toBe(true);
    expect(() => history.undo()).toThrow("undo not allowed after io command");
    expect(() => history.redo()).toThrow("undo not allowed after io command");
    new MoveCommand(history).execute(["r1", "1", "0"]);
    expect(history.blockedAfterIo).toBe(false);
    history.undo();
    expect(() => history.undo()).toThrow("nothing to undo");
  });

  it("supplies a barrier hook for future successful read/save operations", () => {
    new MoveCommand(history).execute(["r1", "1", "0"]);
    history.undo();
    // This models the post-success hook, not a real file write.
    session.markSaved("renamed.svg");
    history.resetAfterIo();
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(0);
    expect(session.filePath).toBe("renamed.svg");
    expect(() => history.redo()).toThrow("undo not allowed after io command");
  });

  it("does not alter the saved path on an invalid path update", () => {
    expect(() => session.markSaved("")).toThrow("save path must not be empty");
    expect(session.filePath).toBe("original.svg");
  });

  it("copies documents passed into the session", () => {
    const outside = new SvgDocument(400, 300, [new Rect("r", 1, 2, 3, 4)]);
    session.openDocument(outside, "loaded.svg");
    outside.move("r", 100, 0);
    expect(session.requireDocument().getShape("r").getAttribute("x")).toBe("1");
    session.replaceEditedDocument(outside);
    outside.move("r", 100, 0);
    expect(session.requireDocument().getShape("r").getAttribute("x")).toBe("101");
    expect(session.filePath).toBe("loaded.svg");
  });

  it("init resets the current path only on success", () => {
    new MoveCommand(history).execute(["r1", "1", "0"]);
    const init = new InitCommand(session, history);
    expect(() => init.execute(["0", "100"])).toThrow();
    expect(session.filePath).toBe("original.svg");
    expect(history.undoCount).toBe(1);
    expect(init.execute([])).toEqual(["canvas 800x600 created"]);
    expect(session.filePath).toBeUndefined();
    expect(history.blockedAfterIo).toBe(true);
    expect(session.requireDocument().size).toBe(0);
  });

  it("does not allow replacing or marking a nonexistent document", () => {
    const empty = new EditorSession();
    expect(() => empty.replaceEditedDocument(new SvgDocument())).toThrow(CommandError);
    expect(() => empty.markSaved("x.svg")).toThrow(CommandError);
  });
});
