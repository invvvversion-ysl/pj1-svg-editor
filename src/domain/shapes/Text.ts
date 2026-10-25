import { ShapeArguments } from "../ShapeArguments.js";
import { GeometryShape } from "./GeometryShape.js";

export class Text extends GeometryShape {
  constructor(id: string, x: number, y: number, private content: string) {
    super(id, { x, y }, ["x"], ["y"]);
  }

  override get type(): string { return "text"; }
  override get textContent(): string { return this.content; }

  static fromArguments(id: string, values: readonly string[]): Text {
    const args = new ShapeArguments(values, 'text <id> <x> <y> "content"', 3);
    return new Text(id, args.number(0, "x"), args.number(1, "y"), args.text(2));
  }

  protected override setOwnAttribute(name: string, value: string): void {
    if (name === "text") {
      this.content = value;
      return;
    }
    super.setOwnAttribute(name, value);
  }

  override clone(): Text {
    return this.copyStyleTo(new Text(this.id, this.number("x"), this.number("y"), this.content));
  }
}
