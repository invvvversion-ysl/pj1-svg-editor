import { describe, expect, it, vi } from "vitest";
import { SvgDocument } from "../../src/domain/SvgDocument.js";
import { ViewBox } from "../../src/domain/ViewBox.js";
import { Circle } from "../../src/domain/shapes/Circle.js";
import { Ellipse } from "../../src/domain/shapes/Ellipse.js";
import { Group } from "../../src/domain/shapes/Group.js";
import { Line } from "../../src/domain/shapes/Line.js";
import { Rect } from "../../src/domain/shapes/Rect.js";
import { Text } from "../../src/domain/shapes/Text.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";

describe("SVG codec", () => {
  const codec = new SvgCodec();

  it("round-trips all six types, nested order, styles, parent indexes and viewport", () => {
    const group = new Group("scene", [
      new Rect("r", 1.5, -2, 30, 40, "#4a90d9"),
      new Circle("c", 100, 100, 20),
      new Group("nested", [new Ellipse("e", 10, 20, 3, 4), new Line("l", 0, 0, 100, 100, "black"), new Text("t", 15, 25, "开始 Start")]),
      new Group("empty"),
    ]);
    group.setAttribute("fill", "green");
    group.setAttribute("stroke-width", "2");
    const original = new SvgDocument(800, 600, [group], new ViewBox(-10, -20, 400, 300));
    const before = original.toSvgElement();
    const xml = codec.encode(original);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n/u);
    expect(xml).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(xml).toContain('viewBox="-10 -20 400 300"');
    expect(xml).toContain('id="t" x="15" y="25">开始 Start</text>');
    const loaded = codec.decode(xml);
    expect(loaded.document.toSvgElement()).toEqual(before);
    expect(loaded.document.parentIdOf("t")).toBe("nested");
    expect(loaded.warnings).toEqual([]);
    expect(original.toSvgElement()).toEqual(before);
  });

  it("escapes XML special characters and preserves whitespace, Unicode separators and literal references", () => {
    const text = '  A & <B> "quote" \'apostrophe\' ]]>\t\n\r\u2028\u2029😀 &#13;  ';
    const shape = new Text('id"&', 10, 20, text);
    shape.setAttribute("fill", 'paint "quoted" & <value>\t\n\r');
    const document = new SvgDocument(800, 600, [shape, new Text("empty", 0, 0, "")]);
    const xml = codec.encode(document);
    expect(xml).toContain('id="id&quot;&amp;"');
    expect(xml).toContain("A &amp; &lt;B&gt;");
    expect(xml).toContain("&#13;");
    expect(codec.decode(xml).document.toSvgElement()).toEqual(document.toSvgElement());
  });

  it("reserves every explicit id before assigning names in preorder", () => {
    const result = codec.decode('<svg><g><rect/><circle id="rect1"/></g><rect id="rect2"/><g id="g1"/><rect/></svg>');
    expect(result.warnings).toEqual([
      "warning: assigned id g2 to unnamed <g>",
      "warning: assigned id rect3 to unnamed <rect>",
      "warning: assigned id rect4 to unnamed <rect>",
    ]);
    expect(result.document.getShape("rect3").type).toBe("rect");
    expect(result.document.parentIdOf("rect3")).toBe("g2");
    expect(codec.decode(codec.encode(result.document)).warnings).toEqual([]);
  });

  it("treats empty ids as unnamed and keeps id comparison case-sensitive", () => {
    const result = codec.decode('<svg><rect id=""/><rect id="Rect1"/><circle id="rect1"/></svg>');
    expect(result.warnings).toEqual(["warning: assigned id rect2 to unnamed <rect>"]);
    expect(result.document.getShape("Rect1").id).toBe("Rect1");
    expect(result.document.getShape("rect1").type).toBe("circle");
  });

  it("does not carry automatic id counters from one read to another", () => {
    expect(codec.decode("<svg><rect/></svg>").warnings).toEqual(["warning: assigned id rect1 to unnamed <rect>"]);
    expect(codec.decode("<svg><rect/></svg>").warnings).toEqual(["warning: assigned id rect1 to unnamed <rect>"]);
  });

  it("rejects duplicates rather than renaming explicit ids", () => {
    expect(() => codec.decode('<svg><g id="r"><rect id="r"/></g></svg>')).toThrow("id already exists: r");
  });

  it("preserves default absence of paint and uses SVG zero defaults for missing geometry", () => {
    const result = codec.decode('<svg><rect id="r"/><circle id="c"/><ellipse id="e"/><line id="l"/><text id="t"/></svg>');
    expect(result.document.getShape("r").attributes()).toEqual({ id: "r", x: "0", y: "0", width: "0", height: "0" });
    expect(result.document.getShape("t").textContent).toBe("");
    const xml = codec.encode(result.document);
    expect(xml).not.toContain("fill=");
    expect(xml).not.toContain("stroke=");
  });

  it("normalizes numeric px lengths and accepts namespaced SVG prefixes", () => {
    const result = codec.decode('<s:svg xmlns:s="http://www.w3.org/2000/svg" width="400px" height="300"><s:rect id="r" x=" -1.5px " y="2px" width="3px" height="4px" stroke-width="2px"/></s:svg>');
    expect(result.document.width).toBe(400);
    expect(result.document.getShape("r").attributes()).toEqual({ id: "r", x: "-1.5", y: "2", width: "3", height: "4", "stroke-width": "2" });
    expect(codec.decode(codec.encode(result.document)).document.toSvgElement()).toEqual(result.document.toSvgElement());
  });

  it("uses viewBox size for omitted dimensions and preserves it in clones", () => {
    const document = codec.decode('<svg viewBox="-10, -20, 400, 300"/>').document;
    expect(document.width).toBe(400);
    expect(document.height).toBe(300);
    expect(document.clone().viewBox.toString()).toBe("-10 -20 400 300");
    document.resize(200, 100);
    expect(document.viewBox.toString()).toBe("0 0 200 100");
    expect(codec.decode("<svg/>").document.width).toBe(800);
  });

  it("concatenates text and CDATA, ignores comments, and preserves text spacing", () => {
    const result = codec.decode('<?xml version="1.0"?><svg><!-- note --><text id="t">  A &amp; <![CDATA[<B>]]><!-- note --> C  </text></svg>');
    expect(result.document.getShape("t").textContent).toBe("  A & <B> C  ");
    expect(codec.decode(codec.encode(result.document)).document.getShape("t").textContent).toBe("  A & <B> C  ");
  });

  it.each([
    "", "<svg>", "<svg><g></svg>", '<svg width=800/>', '<svg width="1" width="2"/>',
    "<svg/><svg/>", "<svg><text>&unknown;</text></svg>", "<svg><rect></circle></svg>",
  ])("rejects malformed XML without parser recovery or console output: %s", source => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(() => codec.decode(source)).toThrow("invalid SVG XML");
      expect(output).not.toHaveBeenCalled();
    } finally { output.mockRestore(); }
  });

  it.each([
    ["<html/>", "invalid SVG root"],
    ['<svg xmlns="urn:other"/>', "unsupported SVG namespace"],
    ['<svg width="50%"/>', "invalid number for canvas width"],
    ['<svg height="0"/>', "canvas height must be positive"],
    ['<svg style="fill:red"/>', "unsupported SVG root attribute: style"],
    ['<svg><g id="g" transform="translate(1,2)"/></svg>', "unknown attribute: transform"],
    ['<svg><text id="t" font-size="16">a</text></svg>', "unknown attribute: font-size"],
    ['<svg><text id="t" text="a"/></svg>', "SVG text is child content"],
    ['<svg><rect id="r" __proto__="test"/></svg>', "unknown attribute: __proto__"],
    ['<svg><rect id="r" width="-1"/></svg>', "width must be non-negative"],
    ['<svg><circle id="c" r="NaN"/></svg>', "invalid number for r"],
    ['<svg><path id="p"/></svg>', "unknown shape type: path"],
    ['<svg><text id="t"><tspan id="s">a</tspan></text></svg>', "unsupported SVG children in <text>"],
    ['<svg><g id="g">visible text</g></svg>', "unsupported text content in <g>"],
    ["<svg>visible text</svg>", "unsupported text content in <svg>"],
    ['<svg xmlns:x="urn:other"><rect id="r" x:width="1"/></svg>', "unsupported SVG attribute namespace"],
    ['<?xml-stylesheet href="style.css"?><svg/>', "unsupported SVG XML declaration"],
    ["<!DOCTYPE svg><svg/>", "unsupported SVG XML declaration"],
    ['<?xml version="1.1"?><svg/>', "unsupported XML version"],
    ['<svg><text id="t">&#0;</text></svg>', "invalid XML character"],
  ])("rejects unsupported or invalid SVG without silent data loss: %s", (source, error) => {
    expect(() => codec.decode(source)).toThrow(error);
  });

  it.each(["1 2 3", "0 0 -1 1", "0 0 1 0", "0,,0,1,1", "0 0 NaN 1"])("rejects invalid viewBox %s", value => {
    expect(() => codec.decode(`<svg viewBox="${value}"/>`)).toThrow();
  });

  it.each(["\u0000", "\uD800", "\uFFFF"])("rejects illegal XML characters on save without modifying the model", value => {
    const document = new SvgDocument(800, 600, [new Text("t", 1, 2, value)]);
    const before = document.toSvgElement();
    expect(() => codec.encode(document)).toThrow("invalid XML character");
    expect(document.toSvgElement()).toEqual(before);
  });
});
