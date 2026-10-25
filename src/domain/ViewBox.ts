import { DomainError } from "./DomainError.js";
import { NumericValue } from "./NumericValue.js";

export class ViewBox {
  private readonly left: number;
  private readonly top: number;
  private readonly boxWidth: number;
  private readonly boxHeight: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.left = NumericValue.finite(x, "viewBox x");
    this.top = NumericValue.finite(y, "viewBox y");
    this.boxWidth = NumericValue.positive(width, "viewBox width");
    this.boxHeight = NumericValue.positive(height, "viewBox height");
  }

  get x(): number { return this.left; }
  get y(): number { return this.top; }
  get width(): number { return this.boxWidth; }
  get height(): number { return this.boxHeight; }

  static parse(value: string): ViewBox {
    const trimmed = value.trim();
    const fields = trimmed.split(/[\s,]+/u);
    if (fields.length !== 4 || /^,|,$|,\s*,/u.test(trimmed)) throw new DomainError("invalid viewBox: expected four numbers");
    const numbers = fields.map(field => NumericValue.finite(field, "viewBox"));
    return new ViewBox(numbers[0]!, numbers[1]!, numbers[2]!, numbers[3]!);
  }

  toString(): string { return `${this.x} ${this.y} ${this.width} ${this.height}`; }
}
