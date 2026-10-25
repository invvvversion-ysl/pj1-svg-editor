import { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";
import { GeometryShape } from "./GeometryShape.js";

export class Ellipse extends GeometryShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id, { cx, cy, rx, ry }, ["cx"], ["cy"], ["rx", "ry"]);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  override get type(): string { return "ellipse"; }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitEllipse(this); }

  static fromArguments(id: string, values: readonly string[]): Ellipse {
    const args = new ShapeArguments(values, "ellipse <id> <cx> <cy> <rx> <ry> [fill]", 4, 5);
    return new Ellipse(id, args.number(0, "cx"), args.number(1, "cy"), args.number(2, "rx"), args.number(3, "ry"), args.optional(4));
  }

  override clone(): Ellipse {
    return this.copyStyleTo(new Ellipse(this.id, this.number("cx"), this.number("cy"), this.number("rx"), this.number("ry")));
  }
}
