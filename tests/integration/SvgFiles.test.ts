import { mkdir, readFile, readdir } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditorApplication } from "../../src/EditorApplication.js";
import { CommandError } from "../../src/application/CommandError.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";
import { SvgFileRepository } from "../../src/infrastructure/SvgFileRepository.js";
import { TestWorkspace } from "../support/TestWorkspace.js";

describe("SVG files and complete PJ sessions", () => {
  let workspace: TestWorkspace;
  let app: EditorApplication;
  beforeEach(async () => { workspace = await TestWorkspace.create(); app = new EditorApplication(); });
  afterEach(async () => { await workspace.cleanup(); });

  it("reads the assignment's other.svg before init, assigns rect1 and reports 7 elements", async () => {
    const path = await workspace.write("other.svg", await readFile("examples/input/other.svg", "utf8"));
    expect(await app.execute(`read ${JSON.stringify(path)}`)).toEqual([
      "warning: assigned id rect1 to unnamed <rect>", `read ${path} (7 elements)`,
    ]);
    expect(app.documentSnapshot().getShape("rect1").getAttribute("fill")).toBe("#ffffff");
    expect(app.documentSnapshot().parentIdOf("c2")).toBe("g1");
    expect(await app.execute("canvas")).toEqual(["canvas 400x300"]);
    for (const command of ["undo", "redo"]) await expect(app.execute(command)).rejects.toThrow("undo not allowed after io command");
    await app.execute("move c1 10 0");
    await app.execute("undo");
    expect((await app.execute("show c1"))[1]).toBe("  cx=50 cy=50 r=10");
  });

  it("saves and rereads all six types, Chinese/quoted paths, XML text, styles and nested order", async () => {
    for (const line of [
      "init 800 600", "create g scene", "set scene fill green",
      "create rect r 1.5 -2 30 40 #4a90d9 in scene", "create circle c 100 100 20 in scene",
      "create g nested in scene", "create ellipse e 10 20 3 4 in nested", "create line l 0 0 10 20 black in nested",
      'create text t 15 25 "开始 & <结束> \\"quoted\\"" in nested',
    ]) await app.execute(line);
    const before = app.documentSnapshot().toSvgElement();
    const path = workspace.file("含 空格 #diagram.svg");
    expect(await app.execute(`save ${JSON.stringify(path)}`)).toEqual([`saved to ${path} (7 elements)`]);
    expect(await readdir(workspace.directory)).toEqual(["含 空格 #diagram.svg"]);
    const xml = await readFile(path, "utf8");
    expect(xml).toContain("开始 &amp; &lt;结束&gt;");
    await expect(app.execute("undo")).rejects.toThrow("undo not allowed after io command");
    expect(await app.execute(`read ${JSON.stringify(path)}`)).toEqual([`read ${path} (7 elements)`]);
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
    await expect(app.execute("redo")).rejects.toThrow("undo not allowed after io command");
  });

  it("uses the loaded path for save and updates the remembered path after a successful Save As", async () => {
    const original = await workspace.write("original.svg", '<svg><circle id="c" cx="10" r="5"/></svg>');
    await app.execute(`read ${JSON.stringify(original)}`);
    await app.execute("move c 1 0");
    await app.execute("save");
    expect((await new SvgFileRepository().load(original)).document.getShape("c").getAttribute("cx")).toBe("11");
    const copy = workspace.file("copy.svg");
    await app.execute(`save ${JSON.stringify(copy)}`);
    await app.execute("move c 2 0");
    await app.execute("save");
    expect((await new SvgFileRepository().load(original)).document.getShape("c").getAttribute("cx")).toBe("11");
    expect((await new SvgFileRepository().load(copy)).document.getShape("c").getAttribute("cx")).toBe("13");
    expect((await readdir(workspace.directory)).sort()).toEqual(["copy.svg", "original.svg"]);
  });

  it("reports absent/unreadable files with the required error and keeps redo and path", async () => {
    const original = await workspace.write("original.svg", '<svg><rect id="r" x="10"/></svg>');
    await app.execute(`read ${JSON.stringify(original)}`);
    await app.execute("move r 1 0");
    await app.execute("undo");
    const before = app.documentSnapshot().toSvgElement();
    const missing = workspace.file("absent.svg");
    await expect(app.execute(`read ${JSON.stringify(missing)}`)).rejects.toThrow(`cannot read file: ${missing}`);
    await expect(app.execute(`read ${JSON.stringify(workspace.directory)}`)).rejects.toThrow("cannot read file:");
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
    await app.execute("redo");
    await app.execute("save");
    expect((await new SvgFileRepository().load(original)).document.getShape("r").getAttribute("x")).toBe("11");
  });

  it.each([
    ["malformed.svg", "invalid SVG XML"],
    ["duplicate.svg", "id already exists: same"],
    ["unsupported.svg", "unknown attribute: transform"],
  ])("rejects %s without replacing state, changing default save path or clearing redo", async (fixture, message) => {
    const original = workspace.file("original.svg");
    await app.execute("init");
    await app.execute("create circle c 10 10 1");
    await app.execute(`save ${JSON.stringify(original)}`);
    await app.execute("move c 1 0");
    await app.execute("undo");
    const before = app.documentSnapshot().toSvgElement();
    const bad = await workspace.write("bad.svg", await readFile(`tests/fixtures/${fixture}`, "utf8"));
    const failure = app.execute(`read ${JSON.stringify(bad)}`);
    await expect(failure).rejects.toThrow(CommandError);
    await expect(failure).rejects.toThrow(message);
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
    await app.execute("redo");
    await app.execute("save");
    expect((await new SvgFileRepository().load(original)).document.getShape("c").getAttribute("cx")).toBe("11");
    expect(await readFile(bad, "utf8")).toBe(await readFile(`tests/fixtures/${fixture}`, "utf8"));
  });

  it("rejects invalid UTF-8 rather than replacing bytes and losing content", async () => {
    const bad = await workspace.write("invalid-encoding.svg", new Uint8Array([0xff, 0xfe, 0x3c, 0x00]));
    await expect(app.execute(`read ${JSON.stringify(bad)}`)).rejects.toThrow("invalid SVG encoding: expected UTF-8");
    await expect(app.execute("tree")).rejects.toThrow("no document.");
  });

  it("reports unwritable destinations, removes its temp file and preserves redo and path", async () => {
    const original = workspace.file("original.svg");
    await app.execute("init");
    await app.execute("create circle c 10 10 1");
    await app.execute(`save ${JSON.stringify(original)}`);
    await app.execute("move c 1 0");
    await app.execute("undo");
    const before = app.documentSnapshot().toSvgElement();
    const blocked = workspace.file("directory.svg");
    await mkdir(blocked);
    await expect(app.execute(`save ${JSON.stringify(blocked)}`)).rejects.toThrow(`cannot write file: ${blocked}`);
    const missingParent = workspace.file("not-created/file.svg");
    await expect(app.execute(`save ${JSON.stringify(missingParent)}`)).rejects.toThrow(`cannot write file: ${missingParent}`);
    expect(app.documentSnapshot().toSvgElement()).toEqual(before);
    expect((await readdir(workspace.directory)).sort()).toEqual(["directory.svg", "original.svg"]);
    await app.execute("redo");
    await app.execute("save");
    expect((await new SvgFileRepository().load(original)).document.getShape("c").getAttribute("cx")).toBe("11");
  });

  it("does not truncate an existing SVG when serialization rejects illegal XML text", async () => {
    const path = workspace.file("kept.svg");
    await app.execute("init");
    await app.execute('create text t 1 2 "good"');
    await app.execute(`save ${JSON.stringify(path)}`);
    const original = await readFile(path, "utf8");
    await app.execute(`set t text "${"\u0000"}"`);
    await expect(app.execute("save")).rejects.toThrow("invalid XML character");
    expect(await readFile(path, "utf8")).toBe(original);
    expect(await readdir(workspace.directory)).toEqual(["kept.svg"]);
    await app.execute("undo");
    expect(app.documentSnapshot().getShape("t").textContent).toBe("good");
  });

  it("preserves a custom viewBox through read, edit, undo, save and read", async () => {
    const path = await workspace.write("viewport.svg", '<svg width="800" height="600" viewBox="-10 -20 400 300"><circle id="c" cx="0" cy="0" r="1"/></svg>');
    await app.execute(`read ${JSON.stringify(path)}`);
    await app.execute("move c 1 2");
    await app.execute("undo");
    await app.execute("save");
    expect((await new SvgFileRepository().load(path)).document.viewBox.toString()).toBe("-10 -20 400 300");
  });

  it("runs the PJ's typical session through grouping, history, save and external read", async () => {
    for (const line of [
      "init 800 600", "create rect bg 0 0 800 600 #ffffff", 'create text title 20 40 "My Diagram"',
      "create circle c1 100 100 20 red", "create rect box 200 80 60 60 #3366ff", "group markers c1 box",
      "move c1 30 0", "undo", "redo", 'set title text "My Diagram v2"', "undo",
    ]) await app.execute(line);
    await expect(app.execute("group bad c1 markers")).rejects.toThrow("cannot group a container into its own descendant: markers");
    await app.execute("delete box");
    await app.execute("undo");
    expect(app.documentSnapshot().parentIdOf("box")).toBe("markers");
    const path = workspace.file("demo.svg");
    expect(await app.execute(`save ${JSON.stringify(path)}`)).toEqual([`saved to ${path} (5 elements)`]);
    await expect(app.execute("undo")).rejects.toThrow("undo not allowed after io command");
    expect((await new SvgFileRepository().load(path)).document.getShape("c1").getAttribute("cx")).toBe("130");
    const other = await workspace.write("other.svg", await readFile("examples/input/other.svg", "utf8"));
    expect((await app.execute(`read ${JSON.stringify(other)}`))[0]).toBe("warning: assigned id rect1 to unnamed <rect>");
    expect(app.documentSnapshot().size).toBe(7);
  });

  it("builds and saves the PJ's two-node flowchart with eight elements", async () => {
    for (const line of [
      "init 800 600", "create g flowchart", "create g node1 in flowchart",
      "create rect start 120 100 160 60 #4a90d9 in node1", 'create text start-label 155 135 "开始" in node1',
      "create g node2 in flowchart", "create rect process 520 100 160 60 #f5a623 in node2",
      'create text process-label 545 135 "处理数据" in node2', "create line arrow1 280 130 520 130 black in flowchart",
      "move node2 0 100",
    ]) await app.execute(line);
    expect(app.documentSnapshot().getShape("process-label").getAttribute("y")).toBe("235");
    await app.execute("undo");
    await app.execute('set process-label text "处理数据 v2"');
    const before = app.documentSnapshot().toSvgElement();
    const path = workspace.file("flowchart.svg");
    expect(await app.execute(`save ${JSON.stringify(path)}`)).toEqual([`saved to ${path} (8 elements)`]);
    const xml = await readFile(path, "utf8");
    expect(new SvgCodec().decode(xml).document.toSvgElement()).toEqual(before);
    expect(xml).toContain("处理数据 v2</text>");
  });
});
