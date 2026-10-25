import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/domain/SvgDocument.js";
import { Circle } from "../../src/domain/shapes/Circle.js";
import { Ellipse } from "../../src/domain/shapes/Ellipse.js";
import { Group } from "../../src/domain/shapes/Group.js";
import { Line } from "../../src/domain/shapes/Line.js";
import { Rect } from "../../src/domain/shapes/Rect.js";
import type { Shape } from "../../src/domain/shapes/Shape.js";
import { Text } from "../../src/domain/shapes/Text.js";
import { ShapeFormatter } from "../../src/presentation/ShapeFormatter.js";
import { TextDocumentPresenter } from "../../src/presentation/TextDocumentPresenter.js";

describe("shape views by double dispatch", () => {
  const formatter = new ShapeFormatter();
  const cases: readonly [Shape, string][] = [
    [new Rect("r", -1.5, 2, 30, 40, "#eee"), "rect#r x=-1.5 y=2 w=30 h=40 fill=#eee"],
    [new Circle("c", 100, 100, 20, "red"), "circle#c cx=100 cy=100 r=20 fill=red"],
    [new Ellipse("e", 1, 2, 3, 4), "ellipse#e cx=1 cy=2 rx=3 ry=4"],
    [new Line("l", -1, 2, 3.5, 4, "black"), "line#l (-1,2) -> (3.5,4) stroke=black"],
    [new Text("t", 20, 40, "开始 Start"), 'text#t (20,40) "开始 Start"'],
    [new Group("g"), "g#g"],
  ];

  it.each(cases)("inlines the identifying geometry for %s", (shape, expected) => {
    const before = shape.toSvgElement();
    expect(formatter.summary(shape)).toBe(expected);
    expect(formatter.summary(shape.clone())).toBe(expected);
    expect(shape.toSvgElement()).toEqual(before);
  });

  it("lists full SVG geometry names and explicit style fields in a stable order", () => {
    const rect = new Rect("r", 10, 20, 100, 50);
    rect.setAttribute("stroke-width", "2");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("fill", "#eee");
    expect(formatter.details(rect)).toEqual(["x=10 y=20 width=100 height=50", "fill=#eee", "stroke=black", "stroke-width=2"]);
  });

  it("keeps absent paint defaults absent in both views", () => {
    const circle = new Circle("c", 1, 2, 3);
    expect(formatter.summary(circle)).toBe("circle#c cx=1 cy=2 r=3");
    expect(formatter.details(circle)).toEqual(["cx=1 cy=2 r=3"]);
  });

  it("shows group styles and child count without propagating them into children", () => {
    const group = new Group("g", [new Circle("c", 1, 2, 3)]);
    group.setAttribute("fill", "red");
    expect(formatter.summary(group)).toBe("g#g fill=red");
    expect(formatter.details(group)).toEqual(["children=1", "fill=red"]);
    expect(formatter.summary(group.children[0] as Shape)).toBe("circle#c cx=1 cy=2 r=3");
  });

  it("quotes style values containing spaces or empty strings", () => {
    const group = new Group("g");
    group.setAttribute("fill", "rgb(0, 0, 0)");
    group.setAttribute("stroke", "");
    expect(formatter.summary(group)).toBe('g#g fill="rgb(0, 0, 0)" stroke=""');
  });

  it("quotes empty text and escapes line separators, quotes and backslashes", () => {
    const empty = new Text("empty", 0, 0, "");
    expect(formatter.summary(empty)).toBe('text#empty (0,0) ""');
    const text = new Text("t", 1, 2, 'A\nB\t"C"\\D\u2028E\u2029F');
    const expected = String.raw`"A\nB\t\"C\"\\D\u2028E\u2029F"`;
    expect(formatter.summary(text)).toBe(`text#t (1,2) ${expected}`);
    expect(formatter.details(text)).toEqual(["x=1 y=2", `text=${expected}`]);
    expect(formatter.summary(text)).not.toMatch(/[\r\n\u2028\u2029]/u);
  });
});

describe("document views", () => {
  const presenter = new TextDocumentPresenter();
  const document = new SvgDocument(800, 600, [
    new Rect("bg", 0, 0, 800, 600, "#ffffff"),
    new Text("title", 20, 40, "My Diagram"),
    new Group("markers", [
      new Circle("c1", 100, 100, 20, "red"),
      new Group("details", [new Ellipse("e1", 1, 2, 3, 4), new Line("l1", 0, 0, 10, 20, "black")]),
      new Rect("box", 200, 80, 60, 60, "#3366ff"),
    ]),
    new Group("empty"),
  ]);

  it("renders nested connectors without leaking vertical lines from completed branches", () => {
    expect(presenter.tree(document)).toEqual([
      "svg (800x600)",
      "├── rect#bg x=0 y=0 w=800 h=600 fill=#ffffff",
      '├── text#title (20,40) "My Diagram"',
      "├── g#markers",
      "│   ├── circle#c1 cx=100 cy=100 r=20 fill=red",
      "│   ├── g#details",
      "│   │   ├── ellipse#e1 cx=1 cy=2 rx=3 ry=4",
      "│   │   └── line#l1 (0,0) -> (10,20) stroke=black",
      "│   └── rect#box x=200 y=80 w=60 h=60 fill=#3366ff",
      "└── g#empty",
    ]);
  });

  it("starts a requested subtree at its own root with clean indentation", () => {
    expect(presenter.tree(document, "details")).toEqual([
      "g#details",
      "├── ellipse#e1 cx=1 cy=2 rx=3 ry=4",
      "└── line#l1 (0,0) -> (10,20) stroke=black",
    ]);
  });

  it("renders a leaf subtree as one line", () => {
    expect(presenter.tree(document, "title")).toEqual(['text#title (20,40) "My Diagram"']);
  });

  it("renders empty documents and empty group subtrees", () => {
    expect(presenter.tree(new SvgDocument(400, 300))).toEqual(["svg (400x300)"]);
    expect(presenter.tree(document, "empty")).toEqual(["g#empty"]);
  });

  it("shows a nested circle in the assignment's property format", () => {
    expect(presenter.show(document, "c1")).toEqual(["circle#c1  parent=g#markers", "  cx=100 cy=100 r=20", "  fill=red"]);
  });

  it("shows svg as the direct parent and keeps text separate from geometry", () => {
    expect(presenter.show(document, "title")).toEqual(['text#title  parent=svg', "  x=20 y=40", '  text="My Diagram"']);
  });

  it("shows empty groups with a zero child count", () => {
    expect(presenter.show(document, "empty")).toEqual(["g#empty  parent=svg", "  children=0"]);
  });

  it("keeps explicit styles distinct from inherited styles in a subtree", () => {
    const styled = document.clone();
    styled.setAttribute("markers", "fill", "green");
    expect(presenter.tree(styled, "markers")[0]).toBe("g#markers fill=green");
    expect(presenter.show(styled, "e1")).toEqual(["ellipse#e1  parent=g#details", "  cx=1 cy=2 rx=3 ry=4"]);
  });

  it("reports missing ids and leaves the source document unchanged after all queries", () => {
    const before = document.toSvgElement();
    expect(() => presenter.tree(document, "missing")).toThrow("no such shape: missing");
    expect(() => presenter.show(document, "missing")).toThrow("no such shape: missing");
    presenter.tree(document);
    presenter.show(document, "box");
    expect(document.toSvgElement()).toEqual(before);
  });
});
