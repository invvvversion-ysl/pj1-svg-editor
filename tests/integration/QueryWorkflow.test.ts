import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import { EditorApplication } from "../../src/EditorApplication.js";
import { CommandError } from "../../src/application/CommandError.js";

describe("tree/show and query history", () => {
  let app: EditorApplication;
  beforeEach(async () => {
    app = new EditorApplication();
    for (const line of [
      "init 800 600",
      "create rect bg 0 0 800 600 #ffffff",
      'create text title 20 40 "My Diagram"',
      "create g markers",
      "create circle c1 100 100 20 red in markers",
      "create rect box 200 80 60 60 #3366ff in markers",
    ]) await app.execute(line);
  });

  it("renders the assignment's tree and circle property details", async () => {
    expect(await app.execute("tree")).toEqual([
      "svg (800x600)",
      "├── rect#bg x=0 y=0 w=800 h=600 fill=#ffffff",
      '├── text#title (20,40) "My Diagram"',
      "└── g#markers",
      "    ├── circle#c1 cx=100 cy=100 r=20 fill=red",
      "    └── rect#box x=200 y=80 w=60 h=60 fill=#3366ff",
    ]);
    expect(await app.execute("show c1")).toEqual(["circle#c1  parent=g#markers", "  cx=100 cy=100 r=20", "  fill=red"]);
  });

  const queries = ["tree", "tree markers", "tree c1", "show c1", "show markers", "show bg", "help", "canvas"];
  it.each(queries)("%s adds no undo entry and leaves current state intact", async query => {
    const before = app.documentSnapshot().toSvgElement();
    await app.execute("move c1 30 0");
    const after = app.documentSnapshot().toSvgElement();
    await app.execute(query);
    expect(app.documentSnapshot().toSvgElement()).toEqual(after);
    await app.execute("undo");
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
  });

  it.each(queries)("%s preserves redo after undo", async query => {
    await app.execute("move c1 30 0");
    const after = app.documentSnapshot().toSvgElement();
    await app.execute("undo");
    await app.execute(query);
    await app.execute("redo");
    expect(app.documentSnapshot().toSvgElement()).toEqual(after);
  });

  it.each([
    ["tree missing", "no such shape: missing"],
    ["tree C1", "no such shape: C1"],
    ["tree markers extra", "usage: tree [id]"],
    ["show", "usage: show <id>"],
    ["show c1 extra", "usage: show <id>"],
    ["show missing", "no such shape: missing"],
  ])("failed query %s preserves the document and redo", async (query, message) => {
    await app.execute("move c1 30 0");
    await app.execute("undo");
    const before = app.documentSnapshot().toSvgElement();
    const failure = app.execute(query);
    await expect(failure).rejects.toThrow(CommandError);
    await expect(failure).rejects.toThrow(message);
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
    await app.execute("redo");
    expect(app.documentSnapshot().getShape("c1").getAttribute("cx")).toBe("130");
  });

  it("keeps the history barrier active across successful and failed queries", async () => {
    await app.execute("canvas 400 300");
    for (const query of ["tree", "tree markers", "show c1", "help", "canvas"]) await app.execute(query);
    await expect(app.execute("show missing")).rejects.toThrow();
    await expect(app.execute("undo")).rejects.toThrow("undo not allowed after io command");
    await expect(app.execute("redo")).rejects.toThrow("undo not allowed after io command");
    await app.execute("move c1 1 0");
    await app.execute("undo");
    expect(await app.execute("tree c1")).toEqual(["circle#c1 cx=100 cy=100 r=20 fill=red"]);
    await expect(app.execute("undo")).rejects.toThrow("nothing to undo");
  });

  it("queries the current document after edits, reparenting and undo, without stale references", async () => {
    await app.execute("create g nested in markers");
    await app.execute("addto nested box");
    expect((await app.execute("show box"))[0]).toBe("rect#box  parent=g#nested");
    await app.execute("undo");
    expect((await app.execute("show box"))[0]).toBe("rect#box  parent=g#markers");
    await app.execute("set markers fill green");
    await app.execute("move markers 5 -2");
    expect((await app.execute("tree markers"))[0]).toBe("g#markers fill=green");
    expect(await app.execute("tree c1")).toEqual(["circle#c1 cx=105 cy=98 r=20 fill=red"]);
    expect((await app.execute("show box"))[1]).toBe("  x=205 y=78 width=60 height=60");
  });

  it("shows empty text with explicit quotes in tree and show", async () => {
    await app.execute('set title text ""');
    expect(await app.execute("tree title")).toEqual(['text#title (20,40) ""']);
    expect(await app.execute("show title")).toEqual(["text#title  parent=svg", "  x=20 y=40", '  text=""']);
  });

  it("renders an empty initialized canvas, with queries preserving its I/O barrier", async () => {
    await app.execute("init 320 240");
    expect(await app.execute("tree")).toEqual(["svg (320x240)"]);
    await expect(app.execute("undo")).rejects.toThrow("undo not allowed after io command");
  });

  it("exposes all available syntax including read/save", async () => {
    const empty = new EditorApplication();
    const help = (await empty.execute("help")).join("\n");
    for (const syntax of [
      "init [w] [h]", "canvas [w h]", "create <type> <id>", "delete <id>", "move <id> <dx> <dy>",
      "scale <id> <factor>", "set <id> <attr> <value>", "group <newGid> <id1> <id2>",
      "ungroup <gid>", "addto <gid> <id>", "front <id>", "back <id>", "tree [id]", "show <id>", "undo | redo",
    ]) expect(help).toContain(syntax);
    expect(help).toContain("read <file.svg> | save [file.svg]");
    expect(help).not.toContain("not yet available");
    await expect(empty.execute("tree")).rejects.toThrow("no document. use 'init' or 'read' first");
    await expect(empty.execute("show c1")).rejects.toThrow("no document. use 'init' or 'read' first");
  });
});

it("replays the shipped stage-4 view demo and preserves the pending redo across queries", async () => {
  const app = new EditorApplication();
  const script = await readFile(new URL("../../examples/stage4.txt", import.meta.url), "utf8");
  const transcript: [string, readonly string[]][] = [];
  for (const line of script.split(/\r?\n/u)) transcript.push([line, await app.execute(line)]);
  expect(transcript.find(([command]) => command === "tree details")?.[1]).toEqual([
    "g#details",
    "├── ellipse#e1 cx=200 cy=80 rx=30 ry=15",
    "└── line#l1 (100,100) -> (200,80) stroke=black",
  ]);
  const circleViews = transcript.filter(([command]) => command === "show c1").map(([, lines]) => lines[1]);
  expect(circleViews).toEqual(["  cx=100 cy=100 r=20", "  cx=100 cy=100 r=20", "  cx=130 cy=100 r=20"]);
  expect(app.documentSnapshot().getShape("title").textContent).toBe("");
  expect(transcript.at(-2)?.[1]).toEqual(['text#title (20,40) ""']);
});
