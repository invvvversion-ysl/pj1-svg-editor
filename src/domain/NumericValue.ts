import { DomainError } from "./DomainError.js";

export class NumericValue {
  static finite(value: number | string, name: string): number {
    if (typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(value)) {
      throw new DomainError(`invalid number for ${name}: ${value}`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new DomainError(`invalid number for ${name}: ${value}`);
    }
    return Object.is(number, -0) ? 0 : number;
  }

  static nonNegative(value: number | string, name: string): number {
    const number = this.finite(value, name);
    if (number < 0) {
      throw new DomainError(`${name} must be non-negative`);
    }
    return number;
  }

  static positive(value: number | string, name: string): number {
    const number = this.finite(value, name);
    if (number <= 0) {
      throw new DomainError(`${name} must be positive`);
    }
    return number;
  }
}
