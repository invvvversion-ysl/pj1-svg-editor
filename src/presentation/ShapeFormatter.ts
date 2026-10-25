import type { ShapeVisitor } from "../domain/ShapeVisitor.js";
import type { Circle } from "../domain/shapes/Circle.js";
import type { Ellipse } from "../domain/shapes/Ellipse.js";
import type { Group } from "../domain/shapes/Group.js";
import type { Line } from "../domain/shapes/Line.js";
import type { Rect } from "../domain/shapes/Rect.js";
import type { Shape } from "../domain/shapes/Shape.js";
import type { Text } from "../domain/shapes/Text.js";

export class ShapeFormatter implements ShapeVisitor<string> {
  private readonly styleNames = ["fill", "stroke", "stroke-width"];

  label(shape: Shape): string { return `${shape.type}#${shape.id}`; }

  summary(shape: Shape): string {
    return [this.label(shape), shape.accept(this), ...this.styleFields(shape)].filter(part => part.length > 0).join(" ");
  }

  details(shape: Shape): readonly string[] {
    const geometry = Object.entries(shape.attributes())
      .filter(([name]) => name !== "id" && !this.styleNames.includes(name))
      .map(([name, value]) => `${name}=${this.value(value)}`);
    const lines: string[] = geometry.length === 0 ? [] : [geometry.join(" ")];
    if (shape.textContent !== undefined) lines.push(`text=${this.quoted(shape.textContent)}`);
    if (shape.isContainer) lines.push(`children=${shape.children.length}`);
    return [...lines, ...this.styleFields(shape)];
  }

  visitRect(shape: Rect): string {
    return `x=${this.attr(shape, "x")} y=${this.attr(shape, "y")} w=${this.attr(shape, "width")} h=${this.attr(shape, "height")}`;
  }

  visitCircle(shape: Circle): string {
    return `cx=${this.attr(shape, "cx")} cy=${this.attr(shape, "cy")} r=${this.attr(shape, "r")}`;
  }

  visitEllipse(shape: Ellipse): string {
    return `cx=${this.attr(shape, "cx")} cy=${this.attr(shape, "cy")} rx=${this.attr(shape, "rx")} ry=${this.attr(shape, "ry")}`;
  }

  visitLine(shape: Line): string {
    return `(${this.attr(shape, "x1")},${this.attr(shape, "y1")}) -> (${this.attr(shape, "x2")},${this.attr(shape, "y2")})`;
  }

  visitText(shape: Text): string {
    return `(${this.attr(shape, "x")},${this.attr(shape, "y")}) ${this.quoted(shape.textContent)}`;
  }

  visitGroup(_shape: Group): string { return ""; }

  private styleFields(shape: Shape): readonly string[] {
    return this.styleNames.flatMap(name => {
      const value = shape.getAttribute(name);
      return value === undefined ? [] : [`${name}=${this.value(value)}`];
    });
  }

  private attr(shape: Shape, name: string): string {
    const value = shape.getAttribute(name);
    if (value === undefined) throw new Error(`missing geometry attribute: ${name}`);
    return value;
  }

  private value(value: string): string {
    return /[\s"\\\u0000-\u001f\u007f]/u.test(value) || value.length === 0 ? this.quoted(value) : value;
  }

  private quoted(value: string): string {
    return JSON.stringify(value).replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
  }
}
