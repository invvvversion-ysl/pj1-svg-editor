import { describe, expect, it, vi } from "vitest";
import { EditorSession } from "../../src/application/EditorSession.js";
import { HistoryManager } from "../../src/application/HistoryManager.js";
import { MoveCommand } from "../../src/application/commands/MoveCommand.js";
import { ShowCommand } from "../../src/application/commands/ShowCommand.js";
import { TreeCommand } from "../../src/application/commands/TreeCommand.js";
import type { DocumentPresenter } from "../../src/application/ports/DocumentPresenter.js";
import { DomainError } from "../../src/domain/DomainError.js";
import { SvgDocument } from "../../src/domain/SvgDocument.js";
import { Rect } from "../../src/domain/shapes/Rect.js";

describe("query application boundary", () => {
  it("passes isolated snapshots even if a presenter modifies its input and throws", () => {
    const session = new EditorSession();
    session.openDocument(new SvgDocument(800, 600, [new Rect("r1", 10, 20, 30, 40)]), "diagram.svg");
    const history = new HistoryManager(session);
    new MoveCommand(history).execute(["r1", "1", "0"]);
    history.undo();
    const before = session.requireDocument().toSvgElement();
    const presenter: DocumentPresenter = {
      tree(document) {
        document.resize(10, 10);
        document.delete("r1");
        throw new DomainError("formatter failed after mutation");
      },
      show(document, id) {
        document.move(id, 999, 0);
        return ["formatted"];
      },
    };
    expect(() => new TreeCommand(session, presenter).execute([])).toThrow("formatter failed after mutation");
    expect(new ShowCommand(session, presenter).execute(["r1"])).toEqual(["formatted"]);
    expect(session.requireDocument().toSvgElement()).toEqual(before);
    expect(session.filePath).toBe("diagram.svg");
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(1);
    history.redo();
    expect(session.requireDocument().getShape("r1").getAttribute("x")).toBe("11");
  });

  it("validates arguments and ids before invoking an adapter", () => {
    const session = new EditorSession();
    session.openDocument(new SvgDocument());
    const presenter = { tree: vi.fn(() => []), show: vi.fn(() => []) };
    const tree = new TreeCommand(session, presenter);
    const show = new ShowCommand(session, presenter);
    expect(() => tree.execute(["one", "two"])).toThrow("usage: tree [id]");
    expect(() => tree.execute(["missing"])).toThrow("no such shape: missing");
    expect(() => show.execute([])).toThrow("usage: show <id>");
    expect(() => show.execute(["missing"])).toThrow("no such shape: missing");
    expect(presenter.tree).not.toHaveBeenCalled();
    expect(presenter.show).not.toHaveBeenCalled();
  });

  it("requires a document before both query commands", () => {
    const session = new EditorSession();
    const presenter = { tree: vi.fn(() => []), show: vi.fn(() => []) };
    expect(() => new TreeCommand(session, presenter).execute([])).toThrow("no document. use 'init' or 'read' first");
    expect(() => new ShowCommand(session, presenter).execute(["r1"])).toThrow("no document. use 'init' or 'read' first");
    expect(presenter.tree).not.toHaveBeenCalled();
    expect(presenter.show).not.toHaveBeenCalled();
  });
});
