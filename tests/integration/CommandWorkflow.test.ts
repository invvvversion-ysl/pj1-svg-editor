import { beforeEach, describe, expect, it } from "vitest";
import { EditorApplication } from "../../src/EditorApplication.js";
import { CommandError } from "../../src/application/CommandError.js";

describe("command workflows through the real composition root", () => {
  let app: EditorApplication;
  beforeEach(async () => {
    app = new EditorApplication();
    for (const line of [
      "init 800 600",
      "create g scene",
      "create g left in scene",
      "create rect r1 10 20 30 40 #4a90d9 in left",
      'create text title 15 35 "开始 Start" in left',
      "create g right in scene",
      "create circle c1 100 100 20 red in right",
      "create ellipse e1 200 100 20 10 in right",
      "create line edge 40 40 80 100 black in scene",
    ]) await app.execute(line);
  });

  it.each([
    "create rect extra 1 2 3 4 in left",
    "delete left",
    "move left 7 -2",
    "scale left .5",
    "set title text \"新标题 New title\"",
    "set left fill #f5a623",
    "group bundle e1 title r1",
    "ungroup left",
    "addto right left",
    "front left",
    "back edge",
  ])("treats %s as one reversible unit, restoring complete document state", async line => {
    const before = app.documentSnapshot().toSvgElement();
    const feedback = await app.execute(line);
    expect(feedback).toHaveLength(1);
    const after = app.documentSnapshot().toSvgElement();
    expect(after).not.toEqual(before);
    expect((await app.execute("undo"))[0]).toMatch(/^undone:/u);
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
    expect(await app.execute("redo")).toEqual(feedback);
    expect(app.documentSnapshot().toSvgElement()).toEqual(after);
    await app.execute("undo");
    await app.execute("redo");
    expect(app.documentSnapshot().toSvgElement()).toEqual(after);
  });

  it("creates fresh command objects for consecutive moves and restores the correct intermediates", async () => {
    await app.execute("move r1 5 0");
    await app.execute("move r1 7 0");
    expect(app.documentSnapshot().getShape("r1").getAttribute("x")).toBe("22");
    await app.execute("undo");
    expect(app.documentSnapshot().getShape("r1").getAttribute("x")).toBe("15");
    await app.execute("undo");
    expect(app.documentSnapshot().getShape("r1").getAttribute("x")).toBe("10");
  });

  it("moves and scales nested leaves with preserved text, sizes and sibling geometry", async () => {
    await app.execute("move left 5 -5");
    await app.execute("scale left 2");
    const doc = app.documentSnapshot();
    expect(doc.getShape("r1").attributes()).toEqual({ id: "r1", x: "30", y: "30", width: "60", height: "80", fill: "#4a90d9" });
    expect(doc.getShape("title").attributes()).toEqual({ id: "title", x: "40", y: "60" });
    expect(doc.getShape("title").textContent).toBe("开始 Start");
    expect(doc.getShape("c1").getAttribute("cx")).toBe("100");
  });

  it("restores complete grouping, order and parent indexes with one undo", async () => {
    await app.execute("group bundle e1 title r1");
    expect(app.documentSnapshot().getContainer("bundle").children.map(node => node.id)).toEqual(["r1", "title", "e1"]);
    await app.execute("undo");
    const doc = app.documentSnapshot();
    expect(doc.parentIdOf("r1")).toBe("left");
    expect(doc.parentIdOf("title")).toBe("left");
    expect(doc.parentIdOf("e1")).toBe("right");
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["left", "right", "edge"]);
    expect(() => doc.getShape("bundle")).toThrow("no such shape: bundle");
  });

  it("invalidates redo only when a new editing command succeeds", async () => {
    await app.execute("move r1 5 0");
    await app.execute("undo");
    await app.execute("set title text \"branch\"");
    const before = app.documentSnapshot().toSvgElement();
    await expect(app.execute("redo")).rejects.toThrow("nothing to redo");
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
  });

  it("keeps redo across help, canvas query, blanks and comments", async () => {
    await app.execute("move r1 5 0");
    await app.execute("undo");
    await app.execute("help");
    expect(await app.execute("canvas")).toEqual(["canvas 800x600"]);
    expect(await app.execute("")).toEqual([]);
    expect(await app.execute('  # comment with " unmatched')).toEqual([]);
    await app.execute("redo");
    expect(app.documentSnapshot().getShape("r1").getAttribute("x")).toBe("15");
  });

  it("resizes the canvas without changing shapes, resets history and starts fresh after an edit", async () => {
    const before = app.documentSnapshot().toSvgElement().children;
    expect(await app.execute("canvas 400 300")).toEqual(["canvas resized to 400x300"]);
    expect(app.documentSnapshot().toSvgElement().children).toEqual(before);
    for (const line of ["undo", "redo"]) await expect(app.execute(line)).rejects.toThrow("undo not allowed after io command");
    await expect(app.execute("move missing 1 0")).rejects.toThrow();
    await expect(app.execute("undo")).rejects.toThrow("undo not allowed after io command");
    await app.execute("move r1 5 0");
    await app.execute("undo");
    expect(app.documentSnapshot().width).toBe(400);
    expect(app.documentSnapshot().getShape("r1").getAttribute("x")).toBe("10");
    await expect(app.execute("undo")).rejects.toThrow("nothing to undo");
  });

  it("init replaces the document and removes earlier undo/redo entries", async () => {
    await app.execute("move r1 5 0");
    await app.execute("undo");
    expect(await app.execute("init 320")).toEqual(["canvas 320x600 created"]);
    expect(app.documentSnapshot().size).toBe(0);
    await expect(app.execute("redo")).rejects.toThrow("undo not allowed after io command");
    await app.execute("create g new");
    await app.execute("undo");
    expect(app.documentSnapshot().size).toBe(0);
    await expect(app.execute("undo")).rejects.toThrow("nothing to undo");
  });

  it("keeps spaces, empty text, literal in, escaped quotes and Windows path backslashes", async () => {
    await app.execute('set title text "  中文 with spaces  "');
    expect(app.documentSnapshot().getShape("title").textContent).toBe("  中文 with spaces  ");
    await app.execute('set title text ""');
    expect(app.documentSnapshot().getShape("title").textContent).toBe("");
    await app.execute('create text literal 1 2 "in" in left');
    expect(app.documentSnapshot().getShape("literal").textContent).toBe("in");
    expect(app.documentSnapshot().parentIdOf("literal")).toBe("left");
    await app.execute(String.raw`set title text "say \"hi\" at D:\my diagrams\file.svg"`);
    expect(app.documentSnapshot().getShape("title").textContent).toBe(String.raw`say "hi" at D:\my diagrams\file.svg`);
    await app.execute('create text root-in 0 0 "in"');
    expect(app.documentSnapshot().getShape("root-in").textContent).toBe("in");
  });

  it("exports inspection snapshots without allowing the demo to change live state", async () => {
    app.documentSnapshot().delete("left");
    expect(app.documentSnapshot().getShape("r1").id).toBe("r1");
  });

  const failures: readonly [string, string][] = [
    ["create rect r1 0 0 1 1", "id already exists: r1"],
    ["create g added in missing", "no such container: missing"],
    ["create g added in r1", "not a container: r1"],
    ["create box n1 0 0 1 1", "unknown shape type: box (is the plugin loaded?)"],
    ["delete missing", "no such shape: missing"],
    ["move missing 1 2", "no such shape: missing"],
    ["move r1 NaN 2", "invalid number for dx: NaN"],
    ["scale scene 0", "scale factor must be positive"],
    ["set r1 width -1", "width must be non-negative"],
    ["set r1 label hi", "unknown attribute: label"],
    ["group bad r1 left", "cannot group a container into its own descendant: left"],
    ["addto left scene", "cannot move a container into its own descendant: scene"],
    ["ungroup scene", "cannot ungroup top-level container: scene"],
    ["front missing", "no such shape: missing"],
    ["back missing", "no such shape: missing"],
    ["init 0 400", "canvas width must be positive"],
    ["canvas 400 0", "canvas height must be positive"],
    ["not-a-command", "unknown command: not-a-command"],
    ['set title text "unfinished', "unterminated double quote"],
    ["create", "usage: create"],
    ["create text bad 0 0 too many words", "usage: create text"],
    ["delete", "usage: delete"],
    ["move r1 1", "usage: move"],
    ["scale r1 1 extra", "usage: scale"],
    ["set title text", "usage: set"],
    ["group bundle r1", "usage: group"],
    ["ungroup left extra", "usage: ungroup"],
    ["addto left", "usage: addto"],
    ["front r1 extra", "usage: front"],
    ["back", "usage: back"],
    ["canvas 400", "usage: canvas"],
    ["init 1 2 3", "usage: init"],
    ["undo extra", "usage: undo"],
    ["redo extra", "usage: redo"],
    ["help extra", "usage: help"],
  ];

  it.each(failures)("rejects %s without changing document or redo", async (line, expected) => {
    await app.execute("move r1 5 0");
    await app.execute("undo");
    const before = app.documentSnapshot().toSvgElement();
    const failure = app.execute(line);
    await expect(failure).rejects.toThrow(CommandError);
    await expect(failure).rejects.toThrow(expected);
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
    await app.execute("redo");
    expect(app.documentSnapshot().getShape("r1").getAttribute("x")).toBe("15");
  });
});

describe("initial CLI state and create types", () => {
  it.each([
    "canvas", "create g g1", "delete r1", "move r1 1 2", "scale r1 2", "set r1 fill red",
    "group g1 r1 r2", "ungroup g1", "addto g1 r1", "front r1", "back r1", "undo", "redo",
  ])("requires init/read before %s", async line => {
    const app = new EditorApplication();
    await expect(app.execute(line)).rejects.toThrow("no document. use 'init' or 'read' first");
  });

  it("allows help before init and ignores blank lines/comments", async () => {
    const app = new EditorApplication();
    expect((await app.execute("help")).join("\n")).toContain("stage 3");
    expect(await app.execute("  ")).toEqual([]);
    expect(await app.execute("# comment")).toEqual([]);
  });

  it.each([
    ["rect r1 1 2 3 4 #eee", "rect", "r1"],
    ["circle c1 1 2 3", "circle", "c1"],
    ["ellipse e1 1 2 3 4", "ellipse", "e1"],
    ["line l1 1 2 3 4 black", "line", "l1"],
    ['text t1 1 2 "hello world"', "text", "t1"],
    ["g child", "g", "child"],
  ])("creates %s within a container and records one undo unit", async (syntax, type, id) => {
    const app = new EditorApplication();
    await app.execute("init");
    await app.execute("create g parent");
    expect(await app.execute(`create ${syntax} in parent`)).toEqual([`${type}#${id} created in g#parent`]);
    expect(app.documentSnapshot().parentIdOf(id)).toBe("parent");
    await app.execute("undo");
    expect(app.documentSnapshot().size).toBe(1);
    await app.execute("redo");
    expect(app.documentSnapshot().getShape(id).type).toBe(type);
  });
});
