/** A command invoked by the CLI; editing/history contracts are added in stage 3. */
export interface Command {
  execute(args: readonly string[]): readonly string[] | Promise<readonly string[]>;
}
