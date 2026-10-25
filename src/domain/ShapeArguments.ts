import { DomainError } from "./DomainError.js";
import { NumericValue } from "./NumericValue.js";

export class ShapeArguments {
  constructor(
    private readonly values: readonly string[],
    syntax: string,
    min: number,
    max = min,
  ) {
    if (values.length < min || values.length > max) {
      throw new DomainError(`usage: create ${syntax}`);
    }
  }

  text(index: number): string {
    const value = this.values[index];
    if (value === undefined) {
      throw new DomainError(`missing argument at position ${index + 1}`);
    }
    return value;
  }

  number(index: number, name: string): number {
    return NumericValue.finite(this.text(index), name);
  }

  optional(index: number): string | undefined {
    return this.values[index];
  }
}
