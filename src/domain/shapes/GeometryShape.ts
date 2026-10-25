import { DomainError } from "../DomainError.js";
import { NumericValue } from "../NumericValue.js";
import { Shape } from "./Shape.js";

export abstract class GeometryShape extends Shape {
  private geometry: Map<string, number>;
  private readonly horizontal: ReadonlySet<string>;
  private readonly vertical: ReadonlySet<string>;
  private readonly lengths: ReadonlySet<string>;

  protected constructor(
    id: string,
    values: Readonly<Record<string, number>>,
    horizontal: readonly string[],
    vertical: readonly string[],
    lengths: readonly string[] = [],
  ) {
    super(id);
    this.horizontal = new Set(horizontal);
    this.vertical = new Set(vertical);
    this.lengths = new Set(lengths);
    this.geometry = new Map(Object.entries(values).map(([name, value]) => [name, this.validate(name, value)]));
  }

  protected number(name: string): number {
    const value = this.geometry.get(name);
    if (value === undefined) throw new Error(`missing geometry field: ${name}`);
    return value;
  }

  protected override ownAttributes(): Readonly<Record<string, string>> {
    return Object.fromEntries([...this.geometry].map(([name, value]) => [name, String(value)]));
  }

  protected override setOwnAttribute(name: string, value: string): void {
    if (!this.geometry.has(name)) throw new DomainError(`unknown attribute: ${name}`);
    this.geometry.set(name, this.validate(name, value));
  }

  protected override planMove(dx: number, dy: number): () => void {
    const next = new Map([...this.geometry].map(([name, value]) => {
      const delta = (this.horizontal.has(name) ? dx : 0) + (this.vertical.has(name) ? dy : 0);
      return [name, this.validate(name, value + delta)];
    }));
    return () => { this.geometry = next; };
  }

  protected override planScale(factor: number): () => void {
    const next = new Map([...this.geometry].map(([name, value]) => [name, this.validate(name, value * factor)]));
    return () => { this.geometry = next; };
  }

  private validate(name: string, value: number | string): number {
    return this.lengths.has(name) ? NumericValue.nonNegative(value, name) : NumericValue.finite(value, name);
  }
}
