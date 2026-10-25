import { ShapeArguments } from "../ShapeArguments.js";
import { GeometryShape } from "./GeometryShape.js";

export class Circle extends GeometryShape {
  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id, { cx, cy, r }, ["cx"], ["cy"], ["r"]);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  override get type(): string { return "circle"; }

  static fromArguments(id: string, values: readonly string[]): Circle {
    const args = new ShapeArguments(values, "circle <id> <cx> <cy> <r> [fill]", 3, 4);
    return new Circle(id, args.number(0, "cx"), args.number(1, "cy"), args.number(2, "r"), args.optional(3));
  }

  override clone(): Circle {
    return this.copyStyleTo(new Circle(this.id, this.number("cx"), this.number("cy"), this.number("r")));
  }
}
