import { describe, expect, it } from "vitest";
import { Circle } from "../../src/domain/shapes/Circle.js";
import { Ellipse } from "../../src/domain/shapes/Ellipse.js";
import { Group } from "../../src/domain/shapes/Group.js";
import { Line } from "../../src/domain/shapes/Line.js";
import { Rect } from "../../src/domain/shapes/Rect.js";
import type { Shape } from "../../src/domain/shapes/Shape.js";
import { Text } from "../../src/domain/shapes/Text.js";

describe("polymorphic geometry", () => {
  const cases: readonly [string, () => Shape, Record<string, string>, Record<string, string>][] = [
    ["rect", () => new Rect("r", 10, 20, 30, 40), { x: "13", y: "18", width: "30", height: "40" }, { x: "5", y: "10", width: "15", height: "20" }],
    ["circle", () => new Circle("c", 10, 20, 30), { cx: "13", cy: "18", r: "30" }, { cx: "5", cy: "10", r: "15" }],
    ["ellipse", () => new Ellipse("e", 10, 20, 30, 40), { cx: "13", cy: "18", rx: "30", ry: "40" }, { cx: "5", cy: "10", rx: "15", ry: "20" }],
    ["line", () => new Line("l", 10, 20, 30, 40), { x1: "13", y1: "18", x2: "33", y2: "38" }, { x1: "5", y1: "10", x2: "15", y2: "20" }],
    ["text", () => new Text("t", 10, 20, "开始 & finish"), { x: "13", y: "18" }, { x: "5", y: "10" }],
  ];

  it.each(cases)("moves %s positions without changing lengths", (_name, create, moved) => {
    const shape = create();
    shape.move(3, -2);
    expect(shape.attributes()).toEqual({ id: shape.id, ...moved });
  });

  it.each(cases)("scales %s positions and lengths about the origin", (_name, create, _moved, scaled) => {
    const shape = create();
    shape.setAttribute("stroke-width", "4");
    shape.scale(0.5);
    expect(shape.attributes()).toEqual({ id: shape.id, ...scaled, "stroke-width": "4" });
  });

  it.each(cases)("copies %s geometry, style and text without aliasing", (_name, create) => {
    const original = create();
    original.setAttribute("fill", "red");
    const copy = original.clone();
    expect(copy.toSvgElement()).toEqual(original.toSvgElement());
    copy.move(5, 6);
    copy.setAttribute("fill", "blue");
    expect(original.attributes()).not.toEqual(copy.attributes());
    expect(original.getAttribute("fill")).toBe("red");
  });

  it("moves and scales every nested descendant once", () => {
    const group = new Group("outer", [new Rect("r", 10, 20, 30, 40), new Group("inner", [new Text("t", 5, 6, "开始")])]);
    group.move(3, 4);
    group.scale(2);
    expect(group.walk().map(node => node.id)).toEqual(["outer", "r", "inner", "t"]);
    expect(group.walk()[1]?.attributes()).toEqual({ id: "r", x: "26", y: "48", width: "60", height: "80" });
    expect(group.walk()[3]?.attributes()).toEqual({ id: "t", x: "16", y: "20" });
    expect(group.walk()[3]?.textContent).toBe("开始");
    expect(group.attributes()).toEqual({ id: "outer" });
  });

  it("supports transforms and common attributes on an empty group", () => {
    const group = new Group("empty");
    group.move(-2, 3);
    group.scale(0.25);
    group.setAttribute("fill", "red");
    expect(group.toSvgElement()).toEqual({ name: "g", attributes: { id: "empty", fill: "red" }, children: [] });
  });

  it("preflights all descendants so a late move overflow leaves earlier leaves unchanged", () => {
    const group = new Group("g", [new Rect("ok", 1, 2, 3, 4), new Circle("huge", 1e308, 0, 1)]);
    const before = group.toSvgElement();
    expect(() => group.move(1e308, 7)).toThrow("invalid number for cx");
    expect(group.toSvgElement()).toEqual(before);
  });

  it("preflights all descendants before a scale overflow", () => {
    const group = new Group("g", [new Rect("ok", 1, 2, 3, 4), new Line("huge", 0, 0, 1e308, 0)]);
    const before = group.toSvgElement();
    expect(() => group.scale(10)).toThrow("invalid number for x2");
    expect(group.toSvgElement()).toEqual(before);
  });

  it.each([0, -1, -Infinity, Infinity, NaN])("rejects invalid scale %s even for empty groups", factor => {
    const group = new Group("empty");
    const before = group.toSvgElement();
    expect(() => group.scale(factor)).toThrow();
    expect(group.toSvgElement()).toEqual(before);
  });

  it("rejects invalid move deltas even for an empty group", () => {
    expect(() => new Group("empty").move(NaN, 0)).toThrow("invalid number for dx");
  });
});

describe("attributes and ownership", () => {
  it("does not materialize omitted SVG fill or stroke defaults", () => {
    expect(new Rect("r", 0, 0, 1, 1).getAttribute("fill")).toBeUndefined();
    expect(new Line("l", 0, 0, 1, 1).getAttribute("stroke")).toBeUndefined();
  });

  it("supports geometric and common style updates", () => {
    const rect = new Rect("r", 0, 0, 1, 1);
    rect.setAttribute("x", "-1.25");
    rect.setAttribute("width", "2e2");
    rect.setAttribute("fill", "#3366ff");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "1.5");
    expect(rect.attributes()).toEqual({ id: "r", x: "-1.25", y: "0", width: "200", height: "1", fill: "#3366ff", stroke: "black", "stroke-width": "1.5" });
  });

  it.each([
    [() => new Circle("c", 1, 2, 3), { cx: "-2", cy: "0.5", r: "0" }],
    [() => new Ellipse("e", 1, 2, 3, 4), { cx: "0.5", cy: "-2", rx: "0", ry: "10" }],
    [() => new Line("l", 1, 2, 3, 4), { x1: "-1", y1: "-2", x2: "1.5", y2: "2.5" }],
    [() => new Text("t", 1, 2, "a"), { x: "-3", y: "0.5" }],
  ] as const)("updates all geometric fields of each remaining leaf type", (create, updates) => {
    const shape = create();
    for (const [name, value] of Object.entries(updates)) shape.setAttribute(name, value);
    expect(shape.attributes()).toEqual({ id: shape.id, ...updates });
  });

  it.each([
    () => new Rect("r", 0, 0, -1, 1),
    () => new Circle("c", 0, 0, -1),
    () => new Ellipse("e", 0, 0, 1, -1),
    () => new Line("l", 0, 0, Infinity, 0),
    () => new Text("t", 0, NaN, "bad"),
  ])("rejects invalid geometry at construction", create => {
    expect(create).toThrow();
  });

  it("does not expose Object prototype members as SVG attributes", () => {
    const shape = new Circle("c", 1, 2, 3);
    expect(shape.getAttribute("toString")).toBeUndefined();
    expect(shape.getAttribute("__proto__")).toBeUndefined();
  });

  it.each([
    [() => new Rect("r", 0, 0, 1, 1), "cx"],
    [() => new Circle("c", 0, 0, 1), "width"],
    [() => new Ellipse("e", 0, 0, 1, 1), "r"],
    [() => new Line("l", 0, 0, 1, 1), "x"],
    [() => new Text("t", 0, 0, "a"), "font-size"],
    [() => new Group("g"), "x"],
  ] as const)("rejects attributes outside each type's whitelist", (create, attr) => {
    const shape = create();
    const before = shape.toSvgElement();
    expect(() => shape.setAttribute(attr, "12")).toThrow(`unknown attribute: ${attr}`);
    expect(() => shape.setAttribute("id", "changed")).toThrow("unknown attribute: id");
    expect(shape.toSvgElement()).toEqual(before);
  });

  it("stores text as child content rather than an XML attribute", () => {
    const text = new Text("t", 1, 2, "初始");
    text.setAttribute("text", 'A & B < C "quoted"');
    expect(text.toSvgElement().text).toBe('A & B < C "quoted"');
    expect(text.attributes()).toEqual({ id: "t", x: "1", y: "2" });
    const copy = text.clone();
    copy.setAttribute("text", "");
    expect(copy.textContent).toBe("");
    expect(text.textContent).not.toBe("");
  });

  it("sets group styles without overwriting explicit child styles", () => {
    const group = new Group("g", [new Rect("r", 0, 0, 1, 1, "blue"), new Circle("c", 0, 0, 1)]);
    group.setAttribute("fill", "red");
    expect(group.getAttribute("fill")).toBe("red");
    expect(group.children[0]?.getAttribute("fill")).toBe("blue");
    expect(group.children[1]?.getAttribute("fill")).toBeUndefined();
  });

  it("owns independent subtrees and exposes copied child arrays", () => {
    const child = new Rect("r", 0, 0, 1, 1);
    const children: Shape[] = [child];
    const group = new Group("g", children);
    child.move(10, 0);
    children.length = 0;
    const exposed = group.children as Shape[];
    exposed.length = 0;
    expect(group.children).toHaveLength(1);
    expect(group.children[0]?.getAttribute("x")).toBe("0");
    const copy = group.clone();
    copy.move(20, 0);
    expect(group.children[0]?.getAttribute("x")).toBe("0");
  });

  it("cannot bypass topology constraints by replacing a group's children", () => {
    const group = new Group("g", [new Circle("c", 0, 0, 1)]);
    const replacement = group.withChildren([]);
    expect(replacement.children).toHaveLength(0);
    expect(group.children).toHaveLength(1);
    expect(() => group.withChildren([new Rect("g", 0, 0, 1, 1)])).toThrow("id already exists: g");
  });

  it("rejects duplicates across nested subtrees", () => {
    expect(() => new Group("g", [new Circle("c", 0, 0, 1), new Group("inner", [new Circle("c", 0, 0, 2)])])).toThrow("id already exists: c");
  });

  it.each(["-1", "NaN", "Infinity", "", "12px", "0x10"])("rejects invalid length %s without mutation", value => {
    const shape = new Rect("r", 1, 2, 3, 4);
    const before = shape.toSvgElement();
    expect(() => shape.setAttribute("width", value)).toThrow();
    expect(() => shape.setAttribute("stroke-width", value)).toThrow();
    expect(shape.toSvgElement()).toEqual(before);
  });

  it("allows zero lengths and finite negative positions", () => {
    expect(new Rect("r", -1.5, -2.5, 0, 0).getAttribute("width")).toBe("0");
    expect(new Circle("c", 0, 0, 0).getAttribute("r")).toBe("0");
  });
});
