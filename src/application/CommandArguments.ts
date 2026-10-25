import { NumericValue } from "../domain/NumericValue.js";
import { CommandError } from "./CommandError.js";

export class CommandArguments {
  constructor(
    private readonly args: readonly string[],
    min: number,
    max: number,
    syntax: string,
  ) {
    if (args.length < min || args.length > max) throw new CommandError(`usage: ${syntax}`);
  }

  word(index: number): string {
    const value = this.args[index];
    if (value === undefined) throw new Error(`missing validated argument ${index + 1}`);
    return value;
  }

  number(index: number, name: string): number {
    return NumericValue.finite(this.word(index), name);
  }
}
