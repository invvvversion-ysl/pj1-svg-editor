import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorSession } from "../../src/application/EditorSession.js";
import { HistoryManager } from "../../src/application/HistoryManager.js";
import { MoveCommand } from "../../src/application/commands/MoveCommand.js";
import { ReadCommand } from "../../src/application/commands/ReadCommand.js";
import { SaveCommand } from "../../src/application/commands/SaveCommand.js";
import type { DocumentRepository } from "../../src/application/ports/DocumentRepository.js";
import { DomainError } from "../../src/domain/DomainError.js";
import { SvgDocument } from "../../src/domain/SvgDocument.js";
import { Rect } from "../../src/domain/shapes/Rect.js";

describe("read/save state transitions", () => {
  let session: EditorSession;
  let history: HistoryManager;
  const load = vi.fn<DocumentRepository["load"]>();
  const save = vi.fn<DocumentRepository["save"]>();
  const repository: DocumentRepository = { load, save };

  beforeEach(() => {
    load.mockReset();
    save.mockReset().mockResolvedValue(undefined);
    session = new EditorSession();
    session.openDocument(new SvgDocument(800, 600, [new Rect("r1", 10, 20, 30, 40)]), "original.svg");
    history = new HistoryManager(session);
    new MoveCommand(history).execute(["r1", "1", "0"]);
    history.undo();
  });

  it("loads first, then updates document/path, resets both stacks and returns warnings in order", async () => {
    const imported = new SvgDocument(400, 300, [new Rect("rect1", 0, 0, 1, 1)]);
    const warning = "warning: assigned id rect1 to unnamed <rect>";
    load.mockResolvedValue({ document: imported, warnings: [warning] });
    expect(await new ReadCommand(session, history, repository).execute(["new.svg"])).toEqual([warning, "read new.svg (1 elements)"]);
    expect(session.requireDocument().toSvgElement()).toEqual(imported.toSvgElement());
    imported.delete("rect1");
    expect(session.requireDocument().size).toBe(1);
    expect(session.filePath).toBe("new.svg");
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(0);
    expect(() => history.undo()).toThrow("undo not allowed after io command");
    expect(() => history.redo()).toThrow("undo not allowed after io command");
  });

  it("preserves document, remembered path and redo if loading fails", async () => {
    const before = session.requireDocument().toSvgElement();
    load.mockRejectedValue(new DomainError("invalid SVG XML"));
    await expect(new ReadCommand(session, history, repository).execute(["bad.svg"])).rejects.toThrow("invalid SVG XML");
    expect(session.requireDocument().toSvgElement()).toEqual(before);
    expect(session.filePath).toBe("original.svg");
    expect(history.redoCount).toBe(1);
    history.redo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("11");
  });

  it("remembers a new save path only after the write resolves successfully", async () => {
    let complete: (() => void) | undefined;
    save.mockImplementation(() => new Promise<void>(resolve => { complete = resolve; }));
    const pending = new SaveCommand(session, history, repository).execute(["new.svg"]);
    expect(session.filePath).toBe("original.svg");
    expect(history.redoCount).toBe(1);
    complete!();
    expect(await pending).toEqual(["saved to new.svg (1 elements)"]);
    expect(session.filePath).toBe("new.svg");
    expect(history.redoCount).toBe(0);
    expect(history.blockedAfterIo).toBe(true);
  });

  it("saves to the remembered path without arguments", async () => {
    await new SaveCommand(session, history, repository).execute([]);
    expect(save.mock.calls[0]?.[0]).toBe("original.svg");
    expect(save.mock.calls[0]?.[1].toSvgElement()).toEqual(session.requireDocument().toSvgElement());
  });

  it("isolates the model even if a failing storage adapter modifies its input", async () => {
    const before = session.requireDocument().toSvgElement();
    save.mockImplementation(async (_path, document) => {
      document.move("r1", 999, 999);
      throw new DomainError("cannot write file: bad.svg");
    });
    await expect(new SaveCommand(session, history, repository).execute(["bad.svg"])).rejects.toThrow("cannot write file: bad.svg");
    expect(session.requireDocument().toSvgElement()).toEqual(before);
    expect(session.filePath).toBe("original.svg");
    expect(history.redoCount).toBe(1);
    history.redo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("11");
  });

  it("failed IO leaves a pre-existing history barrier in place", async () => {
    history.resetAfterIo();
    load.mockRejectedValue(new DomainError("cannot read file: bad.svg"));
    save.mockRejectedValue(new DomainError("cannot write file: bad.svg"));
    await expect(new ReadCommand(session, history, repository).execute(["bad.svg"])).rejects.toThrow();
    await expect(new SaveCommand(session, history, repository).execute(["bad.svg"])).rejects.toThrow();
    expect(history.blockedAfterIo).toBe(true);
    expect(() => history.undo()).toThrow("undo not allowed after io command");
  });

  it.each([{ args: [] }, { args: [""] }, { args: ["one.svg", "two.svg"] }])("rejects invalid read arguments before accessing storage: $args", async ({ args }) => {
    await expect(new ReadCommand(session, history, repository).execute(args)).rejects.toThrow("usage: read <file.svg>");
    expect(load).not.toHaveBeenCalled();
    expect(history.redoCount).toBe(1);
  });

  it.each([{ args: [""] }, { args: ["one.svg", "two.svg"] }])("rejects invalid save arguments before accessing storage: $args", async ({ args }) => {
    await expect(new SaveCommand(session, history, repository).execute(args)).rejects.toThrow("usage: save [file.svg]");
    expect(save).not.toHaveBeenCalled();
    expect(history.redoCount).toBe(1);
  });

  it("requires a document for save and an explicit path when no previous path exists", async () => {
    const empty = new EditorSession();
    const manager = new HistoryManager(empty);
    await expect(new SaveCommand(empty, manager, repository).execute([])).rejects.toThrow("no document. use 'init' or 'read' first");
    empty.openDocument(new SvgDocument());
    await expect(new SaveCommand(empty, manager, repository).execute([])).rejects.toThrow("no save path");
    expect(save).not.toHaveBeenCalled();
  });
});
