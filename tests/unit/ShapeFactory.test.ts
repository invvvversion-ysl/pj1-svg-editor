import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/DomainError.js";
import { ShapeFactory } from "../../src/domain/ShapeFactory.js";

describe("ShapeFactory", () => {
  const factory = new ShapeFactory();

  it.each([
    ["rect", ["10", "20", "100", "50", "#eee"]],
    ["circle", ["100", "100", "20", "red"]],
    ["ellipse", ["0", "0", "10", "20"]],
    ["line", ["0", "0", "10", "20", "black"]],
    ["text", ["20", "40", "My Diagram 中文"]],
    ["g", []],
  ])("creates built-in type %s", (type, args) => {
    const shape = factory.create(type, "a", args);
    expect(shape.type).toBe(type);
    expect(shape.id).toBe("a");
  });

  it.each(["box", "path", "RECT"])("rejects unsupported type %s with the required error", type => {
    expect(() => factory.create(type, "a")).toThrow(new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`));
  });

  it.each([
    ["rect", ["1", "2", "3"]],
    ["circle", ["1", "2", "3", "red", "extra"]],
    ["ellipse", []],
    ["line", ["0", "1", "2"]],
    ["text", ["1", "2"]],
    ["g", ["extra"]],
  ])("validates arity for %s", (type, args) => {
    expect(() => factory.create(type, "a", args)).toThrow(`usage: create ${type}`);
  });

  it.each(["", " ", "1px", "0x10", "NaN", "Infinity", "1e999"])("rejects non-finite or non-decimal input %s", value => {
    expect(() => factory.create("circle", "c", [value, "0", "1"])).toThrow("invalid number for cx");
  });

  it("accepts signed decimal and scientific coordinates and normalizes negative zero", () => {
    expect(factory.create("rect", "r", ["-.5", "+1.5", "2e2", "-0"]).attributes()).toEqual({ id: "r", x: "-0.5", y: "1.5", width: "200", height: "0" });
  });

  it.each(["", "has space", "line\nbreak", "nul\u0000"])("rejects invalid id %s", id => {
    expect(() => factory.create("g", id)).toThrow("invalid id:");
  });

  it("leaves optional paint absent and preserves explicit line stroke", () => {
    expect(factory.create("circle", "c", ["0", "0", "1"]).attributes()).not.toHaveProperty("fill");
    expect(factory.create("line", "l", ["0", "0", "1", "1", "black"]).getAttribute("stroke")).toBe("black");
  });
});
