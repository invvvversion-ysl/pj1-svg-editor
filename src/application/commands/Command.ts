/** A command invocation. EditCommand adds the reversible execution contract. */
export interface Command {
  execute(args: readonly string[]): readonly string[] | Promise<readonly string[]>;
}
