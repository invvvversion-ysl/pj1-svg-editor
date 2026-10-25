import { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";
import { GeometryShape } from "./GeometryShape.js";

export class Rect extends GeometryShape {
  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id, { x, y, width, height }, ["x"], ["y"], ["width", "height"]);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  override get type(): string { return "rect"; }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitRect(this); }

  static fromArguments(id: string, values: readonly string[]): Rect {
    const args = new ShapeArguments(values, "rect <id> <x> <y> <w> <h> [fill]", 4, 5);
    return new Rect(id, args.number(0, "x"), args.number(1, "y"), args.number(2, "width"), args.number(3, "height"), args.optional(4));
  }

  override clone(): Rect {
    return this.copyStyleTo(new Rect(this.id, this.number("x"), this.number("y"), this.number("width"), this.number("height")));
  }
}
