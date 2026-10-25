import { ShapeArguments } from "../ShapeArguments.js";
import { GeometryShape } from "./GeometryShape.js";

export class Line extends GeometryShape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id, { x1, y1, x2, y2 }, ["x1", "x2"], ["y1", "y2"]);
    if (stroke !== undefined) this.setAttribute("stroke", stroke);
  }

  override get type(): string { return "line"; }

  static fromArguments(id: string, values: readonly string[]): Line {
    const args = new ShapeArguments(values, "line <id> <x1> <y1> <x2> <y2> [stroke]", 4, 5);
    return new Line(id, args.number(0, "x1"), args.number(1, "y1"), args.number(2, "x2"), args.number(3, "y2"), args.optional(4));
  }

  override clone(): Line {
    return this.copyStyleTo(new Line(this.id, this.number("x1"), this.number("y1"), this.number("x2"), this.number("y2")));
  }
}
