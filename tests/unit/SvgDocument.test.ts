import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/DomainError.js";
import { SvgDocument } from "../../src/domain/SvgDocument.js";
import { Circle } from "../../src/domain/shapes/Circle.js";
import { Ellipse } from "../../src/domain/shapes/Ellipse.js";
import { Group } from "../../src/domain/shapes/Group.js";
import { Line } from "../../src/domain/shapes/Line.js";
import { Rect } from "../../src/domain/shapes/Rect.js";
import type { Shape } from "../../src/domain/shapes/Shape.js";
import { Text } from "../../src/domain/shapes/Text.js";

describe("SvgDocument", () => {
  let doc: SvgDocument;
  beforeEach(() => {
    doc = new SvgDocument(800, 600, [
      new Rect("bg", 0, 0, 800, 600, "white"),
      new Group("scene", [
        new Group("node1", [new Rect("r", 10, 20, 30, 40, "blue"), new Text("t", 15, 35, "开始")]),
        new Group("node2", [new Circle("c", 100, 100, 20), new Ellipse("e", 200, 100, 20, 10)]),
        new Line("edge", 40, 40, 80, 100, "black"),
      ]),
      new Rect("tail", 0, 0, 1, 1),
    ]);
  });

  it("creates a default empty canvas and represents the SVG root separately", () => {
    const empty = new SvgDocument();
    expect(empty.width).toBe(800);
    expect(empty.height).toBe(600);
    expect(empty.size).toBe(0);
    expect(empty.toSvgElement()).toEqual({
      name: "svg", attributes: { xmlns: "http://www.w3.org/2000/svg", width: "800", height: "600", viewBox: "0 0 800 600" }, children: [],
    });
    expect(() => empty.getShape("svg")).toThrow("no such shape: svg");
  });

  it("indexes all descendants and their immediate parents", () => {
    expect(doc.size).toBe(10);
    expect(doc.getShape("t").textContent).toBe("开始");
    expect(doc.parentIdOf("scene")).toBeUndefined();
    expect(doc.parentIdOf("node1")).toBe("scene");
    expect(doc.parentIdOf("r")).toBe("node1");
  });

  it("inserts all types at the root or a specified group with case-sensitive ids", () => {
    doc.insert(new Circle("C", 0, 0, 1));
    doc.insert(new Group("nested"), "node2");
    doc.insert(new Text("label", 2, 3, "中文"), "nested");
    expect(doc.getShape("C").id).toBe("C");
    expect(doc.getShape("c").id).toBe("c");
    expect(doc.parentIdOf("C")).toBeUndefined();
    expect(doc.parentIdOf("label")).toBe("nested");
    expect(doc.size).toBe(13);
    expect(doc.roots.at(-1)?.id).toBe("C");
  });

  it("owns inserted and constructor-supplied shapes independently of caller references", () => {
    const outside = new Rect("outside", 1, 2, 3, 4);
    const roots: Shape[] = [outside];
    const isolated = new SvgDocument(100, 100, roots);
    outside.move(100, 0);
    roots.length = 0;
    (isolated.roots as Shape[]).length = 0;
    expect(isolated.getShape("outside").getAttribute("x")).toBe("1");
    const inserted = new Circle("inserted", 5, 6, 7);
    isolated.insert(inserted);
    inserted.move(100, 0);
    expect(isolated.getShape("inserted").getAttribute("cx")).toBe("5");
  });

  it("deletes an entire subtree from both topology and indexes and permits id reuse", () => {
    doc.delete("node1");
    expect(doc.size).toBe(7);
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["node2", "edge"]);
    for (const id of ["node1", "r", "t"]) expect(() => doc.getShape(id)).toThrow(`no such shape: ${id}`);
    doc.insert(new Circle("r", 1, 2, 3));
    expect(doc.getShape("r").type).toBe("circle");
    expect(doc.parentIdOf("r")).toBeUndefined();
  });

  it("moves and scales a nested group through the same document API as leaves", () => {
    doc.move("node1", 5, -5);
    doc.scale("node1", 2);
    expect(doc.getShape("r").attributes()).toEqual({ id: "r", x: "30", y: "30", width: "60", height: "80", fill: "blue" });
    expect(doc.getShape("t").attributes()).toEqual({ id: "t", x: "40", y: "60" });
    expect(doc.getShape("c").getAttribute("cx")).toBe("100");
    doc.setAttribute("t", "text", "更新");
    expect(doc.getShape("t").textContent).toBe("更新");
  });

  it("reparents a whole subtree as the last child and updates descendant parent links", () => {
    doc.addTo("node2", "node1");
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["node2", "edge"]);
    expect(doc.getContainer("node2").children.map(node => node.id)).toEqual(["c", "e", "node1"]);
    expect(doc.parentIdOf("node1")).toBe("node2");
    expect(doc.parentIdOf("r")).toBe("node1");
    expect(doc.size).toBe(10);
  });

  it("moves an existing child to the end even when its parent is unchanged", () => {
    doc.addTo("node1", "r");
    expect(doc.getContainer("node1").children.map(node => node.id)).toEqual(["t", "r"]);
  });

  it("groups siblings in original document order even when arguments are reversed", () => {
    const group = doc.group("bundle", ["edge", "node2"]);
    expect(group.children.map(node => node.id)).toEqual(["node2", "edge"]);
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["node1", "bundle"]);
    expect(doc.parentIdOf("node2")).toBe("bundle");
    expect(doc.parentIdOf("c")).toBe("node2");
    expect(doc.size).toBe(11);
  });

  it("groups across parents at their nearest common container, preserving empty old groups", () => {
    doc.group("bundle", ["e", "t", "r"]);
    expect(doc.getContainer("bundle").children.map(node => node.id)).toEqual(["r", "t", "e"]);
    expect(doc.parentIdOf("bundle")).toBe("scene");
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["bundle", "node1", "node2", "edge"]);
    expect(doc.getContainer("node1").children).toHaveLength(0);
    expect(doc.getContainer("node2").children.map(node => node.id)).toEqual(["c"]);
    expect(doc.getShape("r").getAttribute("x")).toBe("10");
  });

  it("groups across different root branches at the first affected root position", () => {
    doc.group("bundle", ["tail", "t"]);
    expect(doc.roots.map(node => node.id)).toEqual(["bg", "bundle", "scene"]);
    expect(doc.getContainer("bundle").children.map(node => node.id)).toEqual(["t", "tail"]);
    expect(doc.parentIdOf("bundle")).toBeUndefined();
  });

  it("groups direct and deeper nodes without inserting into either selected subtree", () => {
    doc.group("bundle", ["node1", "c"]);
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["bundle", "node2", "edge"]);
    expect(doc.getContainer("bundle").children.map(node => node.id)).toEqual(["node1", "c"]);
    expect(doc.parentIdOf("r")).toBe("node1");
    expect(doc.parentIdOf("c")).toBe("bundle");
  });

  it("ungroups into the original position and removes only the group id", () => {
    doc.ungroup("node1");
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["r", "t", "node2", "edge"]);
    expect(doc.parentIdOf("r")).toBe("scene");
    expect(doc.parentIdOf("t")).toBe("scene");
    expect(doc.size).toBe(9);
    expect(() => doc.getShape("node1")).toThrow("no such shape: node1");
  });

  it("ungroups empty nested containers", () => {
    doc.insert(new Group("empty"), "node1");
    doc.ungroup("empty");
    expect(doc.getContainer("node1").children.map(node => node.id)).toEqual(["r", "t"]);
    expect(doc.size).toBe(10);
  });

  it("adjusts z-order only among siblings", () => {
    doc.front("node1");
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["node2", "edge", "node1"]);
    doc.back("node1");
    expect(doc.getContainer("scene").children.map(node => node.id)).toEqual(["node1", "node2", "edge"]);
    doc.front("bg");
    expect(doc.roots.map(node => node.id)).toEqual(["scene", "tail", "bg"]);
    doc.back("bg");
    expect(doc.roots.map(node => node.id)).toEqual(["bg", "scene", "tail"]);
    expect(doc.parentIdOf("node1")).toBe("scene");
  });

  it("creates independent snapshots of dimensions, geometry, text, styles and topology", () => {
    doc.setAttribute("scene", "fill", "green");
    const snapshot = doc.clone();
    const before = snapshot.toSvgElement();
    doc.resize(400, 300);
    doc.move("scene", 100, 200);
    doc.setAttribute("t", "text", "changed");
    doc.setAttribute("scene", "fill", "red");
    doc.addTo("node2", "r");
    doc.delete("t");
    expect(snapshot.toSvgElement()).toEqual(before);
    expect(snapshot.width).toBe(800);
    expect(snapshot.getShape("scene").getAttribute("fill")).toBe("green");
    expect(snapshot.parentIdOf("r")).toBe("node1");
    snapshot.setAttribute("r", "fill", "yellow");
    expect(doc.getShape("r").getAttribute("fill")).toBe("blue");
  });

  it("keeps indexes consistent through a sequence of structural operations", () => {
    doc.group("bundle", ["t", "c"]);
    doc.addTo("bundle", "edge");
    doc.back("bundle");
    doc.ungroup("bundle");
    doc.delete("node2");
    doc.insert(new Rect("e", 0, 0, 2, 2), "node1");
    const seen = new Set<string>();
    const visit = (shape: Shape, parent: string | undefined): void => {
      expect(seen.has(shape.id)).toBe(false);
      seen.add(shape.id);
      expect(doc.getShape(shape.id)).toBe(shape);
      expect(doc.parentIdOf(shape.id)).toBe(parent);
      for (const child of shape.children) visit(child, shape.id);
    };
    for (const root of doc.roots) visit(root, undefined);
    expect(seen.size).toBe(doc.size);
  });

  const failures: readonly [string, (doc: SvgDocument) => void, string][] = [
    ["duplicate root id", d => d.insert(new Circle("r", 0, 0, 1)), "id already exists: r"],
    ["duplicate nested id", d => d.insert(new Group("new", [new Circle("r", 0, 0, 1)])), "id already exists: r"],
    ["missing insert parent", d => d.insert(new Group("new"), "missing"), "no such container: missing"],
    ["leaf insert parent", d => d.insert(new Group("new"), "r"), "not a container: r"],
    ["missing delete", d => d.delete("missing"), "no such shape: missing"],
    ["missing move", d => d.move("missing", 1, 2), "no such shape: missing"],
    ["invalid scale", d => d.scale("scene", 0), "scale factor must be positive"],
    ["invalid attribute", d => d.setAttribute("r", "r", "1"), "unknown attribute: r"],
    ["invalid width", d => d.resize(-1, 20), "canvas width must be positive"],
    ["invalid height after valid width", d => d.resize(100, 0), "canvas height must be positive"],
    ["existing group id", d => d.group("scene", ["r", "c"]), "id already exists: scene"],
    ["invalid group id", d => d.group("", ["r", "c"]), "invalid id:"],
    ["insufficient group members", d => d.group("new", ["r"]), "group requires at least two shapes"],
    ["duplicate group member", d => d.group("new", ["r", "r"]), "duplicate shape id: r"],
    ["missing group member", d => d.group("new", ["r", "missing"]), "no such shape: missing"],
    ["ancestor before descendant", d => d.group("new", ["node1", "r"]), "cannot group a container into its own descendant: node1"],
    ["ancestor after descendant", d => d.group("new", ["r", "node1"]), "cannot group a container into its own descendant: node1"],
    ["self reparent", d => d.addTo("node1", "node1"), "cannot move a container into its own descendant: node1"],
    ["descendant reparent", d => d.addTo("node1", "scene"), "cannot move a container into its own descendant: scene"],
    ["leaf reparent target", d => d.addTo("r", "e"), "not a container: r"],
    ["missing reparent target", d => d.addTo("missing", "e"), "no such shape: missing"],
    ["missing reparent source", d => d.addTo("node1", "missing"), "no such shape: missing"],
    ["top-level ungroup", d => d.ungroup("scene"), "cannot ungroup top-level container: scene"],
    ["leaf ungroup", d => d.ungroup("r"), "not a container: r"],
    ["missing ungroup", d => d.ungroup("missing"), "no such shape: missing"],
    ["missing front", d => d.front("missing"), "no such shape: missing"],
    ["missing back", d => d.back("missing"), "no such shape: missing"],
  ];

  it.each(failures)("leaves document and indexes unchanged after %s", (_name, action, error) => {
    const before = doc.toSvgElement();
    const ids = doc.roots.flatMap(root => root.walk()).map(node => node.id);
    const parents = ids.map(id => doc.parentIdOf(id));
    expect(() => action(doc)).toThrow(error);
    expect(doc.toSvgElement()).toEqual(before);
    expect(doc.size).toBe(ids.length);
    expect(ids.map(id => doc.parentIdOf(id))).toEqual(parents);
    expect(ids.every(id => doc.getShape(id).id === id)).toBe(true);
  });

  it("rejects duplicate ids supplied across constructor roots", () => {
    expect(() => new SvgDocument(800, 600, [new Group("scene", [new Rect("r", 0, 0, 1, 1)]), new Circle("r", 0, 0, 1)])).toThrow(new DomainError("id already exists: r"));
  });

  it.each([0, -1, NaN, Infinity])("rejects invalid initial canvas dimension %s", value => {
    expect(() => new SvgDocument(value, 600)).toThrow();
    expect(() => new SvgDocument(800, value)).toThrow();
  });
});
